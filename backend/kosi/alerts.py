"""Village flood alerts by email: follow a village, and when the live barrage reading climbs through a band that floods it, you are emailed.

How it works
  * AWS SNS does the delivery. One topic; every email address is one subscription with a filter policy listing the villages it follows
    (and its own test tag), so a message about one village reaches only its followers. SNS itself emails a confirmation link first and puts
    an unsubscribe link in every message, so nobody is signed up without clicking, and anybody can leave.
  * DynamoDB (the reports table, other key prefixes) remembers who follows what, the last band alerted, and daily caps.
  * The 5-minute schedule that already refreshes the barrage reading calls check_and_publish() with the new reading.
  * Without AWS (development, tests) the same code keeps its records in a local JSON file and writes messages to an outbox file instead.

Safeguards: at most MAX_VILLAGES villages per address, DAILY_SIGNUPS signups per day in total (a stranger's address can only be sent a
confirmation email by this endpoint that many times a day), TESTS_PER_DAY test alerts per address, and one alert per village per RESEND_H.
An alert is a planning estimate from the model, not an official warning, and says so.
"""
import hashlib
import json
import os
import re
import time
from datetime import datetime
from pathlib import Path

from . import cloud, hydro
from .config import DATA_DIR
from .village import affected
from . import store

TOPIC = os.environ.get("KOSI_ALERT_TOPIC")
TABLE = os.environ.get("KOSI_REPORTS_TABLE")
SITE_URL = os.environ.get("KOSI_SITE_URL", "").rstrip("/")
LOCAL = Path(os.environ.get("KOSI_ALERTS_FILE", DATA_DIR.parent / "alerts.json"))
OUTBOX = LOCAL.with_name("alerts-outbox.jsonl")

BANDS = [1.5, 3.0, 4.5, 6.0, 8.0]         # lakh cusecs: an alert goes out when the reading climbs through one of these
MAX_VILLAGES = 5
DAILY_SIGNUPS = 300
TESTS_PER_DAY = 3
RESEND_H = 6
EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,}$")

LEVEL = {"EVACUATE": "EVACUATE (leave)", "WATCH": "WATCH (be ready)"}
LEVEL_HI = {"EVACUATE": "निकलें", "WATCH": "तैयार रहें"}


# ---------- records: DynamoDB in AWS, a JSON file locally ----------
def _remote():
    return bool(TABLE and cloud.ENABLED)


def _ddb():
    return cloud.client("dynamodb")


def _local() -> dict:
    return json.loads(LOCAL.read_text(encoding="utf-8")) if LOCAL.exists() else {}


def _save(d: dict):
    LOCAL.parent.mkdir(parents=True, exist_ok=True)
    LOCAL.write_text(json.dumps(d, ensure_ascii=False), encoding="utf-8")


def _put(pk: str, id_: str, item: dict):
    if _remote():
        _ddb().put_item(TableName=TABLE, Item={"pk": {"S": pk}, "id": {"S": id_}, "data": {"S": json.dumps(item, ensure_ascii=False)}})
    else:
        d = _local()
        d.setdefault(pk, {})[id_] = item
        _save(d)


def _get(pk: str, id_: str):
    if _remote():
        r = _ddb().get_item(TableName=TABLE, Key={"pk": {"S": pk}, "id": {"S": id_}}).get("Item")
        return json.loads(r["data"]["S"]) if r and "data" in r else None
    return _local().get(pk, {}).get(id_)


def _query(pk: str) -> dict:
    if _remote():
        items = _ddb().query(TableName=TABLE, KeyConditionExpression="pk = :p", ExpressionAttributeValues={":p": {"S": pk}})["Items"]
        return {i["id"]["S"]: json.loads(i["data"]["S"]) for i in items if "data" in i}
    return dict(_local().get(pk, {}))


def _count_up(pk: str, id_: str, limit: int) -> bool:
    """Adds one to a counter unless it is already at limit; True if the count went up."""
    if _remote():
        try:
            _ddb().update_item(TableName=TABLE, Key={"pk": {"S": pk}, "id": {"S": id_}}, UpdateExpression="ADD n :one",
                               ConditionExpression="attribute_not_exists(n) OR n < :limit",
                               ExpressionAttributeValues={":one": {"N": "1"}, ":limit": {"N": str(limit)}})
            return True
        except _ddb().exceptions.ConditionalCheckFailedException:
            return False
    d = _local()
    row = d.setdefault(pk, {}).setdefault(id_, {"n": 0})
    if row["n"] >= limit:
        return False
    row["n"] += 1
    _save(d)
    return True


# ---------- helpers ----------
def _h(email: str) -> str:
    return hashlib.sha1(email.strip().lower().encode()).hexdigest()[:16]


def _today() -> str:
    return datetime.now(hydro.IST).strftime("%Y-%m-%d")


def _ascii(s: str) -> str:
    return s.encode("ascii", "ignore").decode().replace("\n", " ").strip()


def _link(village_id: int, lakh: float | None = None) -> str:
    if not SITE_URL:
        return ""
    q = f"&q={lakh:.2f}" if lakh else ""
    return f"{SITE_URL}/#v={village_id}{q}"


def _filter_policy(h: str, village_ids: list[str]) -> str:
    return json.dumps({"village": sorted(village_ids) + [f"test-{h}"]})


def _deliver(subject: str, body: str, village_attr: str):
    """Publishes through SNS, or appends to the local outbox when there is no topic."""
    if TOPIC and cloud.ENABLED:
        cloud.client("sns").publish(TopicArn=TOPIC, Subject=_ascii(subject)[:99], Message=body,
                                    MessageAttributes={"village": {"DataType": "String", "StringValue": village_attr}})
        return True
    OUTBOX.parent.mkdir(parents=True, exist_ok=True)
    with OUTBOX.open("a", encoding="utf-8") as f:
        f.write(json.dumps({"village": village_attr, "subject": subject, "body": body}, ensure_ascii=False) + "\n")
    return False


# ---------- following a village ----------
def subscribe(email: str, village_id: int, lang: str = "en") -> dict:
    email = email.strip()
    if not EMAIL_RE.match(email):
        raise ValueError("that does not look like an email address")
    if village_id not in store.villages():
        raise LookupError("village not found")
    h = _h(email)
    followed = _query(f"sub#{h}")
    if str(village_id) not in followed and len(followed) >= MAX_VILLAGES:
        raise ValueError(f"you can follow at most {MAX_VILLAGES} villages with one address")
    if str(village_id) not in followed and not _count_up(f"alertday#{_today()}", "signups", DAILY_SIGNUPS):
        raise RuntimeError("too many sign-ups today, please try again tomorrow")
    _put(f"sub#{h}", str(village_id), {"email": email, "lang": lang, "time": int(time.time())})
    _put(f"vsub#{village_id}", h, {"time": int(time.time())})
    ids = sorted(set(followed) | {str(village_id)})
    live = bool(TOPIC and cloud.ENABLED)
    status = "dry_run"
    if live:
        sns = cloud.client("sns")
        arn = sns.subscribe(TopicArn=TOPIC, Protocol="email", Endpoint=email, ReturnSubscriptionArn=True,
                            Attributes={"FilterPolicy": _filter_policy(h, ids)})["SubscriptionArn"]
        status = "confirm_email"
        if arn.startswith("arn:aws:sns:") and "pending" not in arn.lower():       # already confirmed: widen its filter now
            sns.set_subscription_attributes(SubscriptionArn=arn, AttributeName="FilterPolicy", AttributeValue=_filter_policy(h, ids))
            status = "updated"
    return {"status": status, "villages": len(ids), "dry_run": not live}


def send_test(email: str, village_id: int) -> dict:
    email = email.strip()
    h = _h(email)
    if _get(f"sub#{h}", str(village_id)) is None:
        raise LookupError("follow this village first")
    if not _count_up(f"alertday#{_today()}", f"test#{h}", TESTS_PER_DAY):
        raise RuntimeError("that is enough test alerts for today")
    v = store.villages()[village_id]
    body = (f"This is a TEST alert from Kosi Twin for {v['name']}. If you can read this, alerts for this village will reach you.\n"
            f"यह कोसी ट्विन का परीक्षण अलर्ट है ({v.get('name_hi') or v['name']})।\n{_link(village_id)}")
    delivered = _deliver(f"Kosi Twin test alert: {v['name']}", body, f"test-{h}")
    return {"sent": delivered, "dry_run": not delivered}


# ---------- sending alerts ----------
def _band(lakh: float) -> int:
    return sum(lakh >= b for b in BANDS)


def check_and_publish(live_lakh: float, reading_time: str = "") -> dict:
    """Called with every new live reading. Alerts the followers of each village the reading would flood, once, when the reading climbs
    through a band; remembers the band so a steady or falling river does not repeat it."""
    band = _band(live_lakh)
    prev = (_get("alertstate", "band") or {}).get("band", 0)
    out = {"band": band, "previous": prev, "villages": 0, "sent": 0}
    if band == prev:
        return out
    _put("alertstate", "band", {"band": band, "lakh": live_lakh, "time": int(time.time())})
    if band < prev:
        return out
    now = time.time()
    for row in affected(hydro.Hydrograph.constant(live_lakh)):
        vid = row["id"]
        if not _query(f"vsub#{vid}"):
            continue
        last = (_get("alertsent", str(vid)) or {}).get("time", 0)
        if now - last < RESEND_H * 3600:
            continue
        v = store.villages()[vid]
        eta = max(1, round(row["eta_h"]))
        body = (f"The Kosi at the Birpur barrage is releasing {live_lakh:.2f} lakh cusecs{(' (official reading, ' + reading_time + ')') if reading_time else ''}.\n"
                f"At this level {v['name']} would flood: water reaches it in about {eta} h and gets up to {row['depth_m']:.1f} m deep. "
                f"Level: {LEVEL[row['risk']]}.\n\n"
                f"कोसी बीरपुर बराज से {live_lakh:.2f} लाख क्यूसेक छोड़ रही है। इस स्तर पर {v.get('name_hi') or v['name']} में लगभग {eta} घंटे में पानी पहुँचेगा, "
                f"गहराई {row['depth_m']:.1f} मीटर तक। स्थिति: {LEVEL_HI[row['risk']]}।\n\n"
                f"{('Open your village card / अपने गाँव का कार्ड देखें: ' + _link(vid, live_lakh)) if SITE_URL else ''}\n\n"
                "This is a planning estimate from a flood model, not an official warning. Follow the district administration's orders. "
                "To stop these emails use the unsubscribe link below.")
        _deliver(f"Kosi Twin alert: {v['name']} may flood in about {eta} h", body, str(vid))
        _put("alertsent", str(vid), {"time": int(now)})
        out["villages"] += 1
        out["sent"] += 1
    return out
