"""Behavioural tests against the real precomputed model (run `python prep/build_model.py` first)."""
import io
import math

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from kosi import mirror, store
from kosi.api import app
from kosi.hydro import Hydrograph, rise_for
from kosi.village import card

client = TestClient(app)


def flooding_villages(q):
    return client.get(f"/api/scenario?discharge={q}").json()["top_villages"]


def test_rating_curve_rises_with_discharge():
    assert rise_for(1.0) == 0.0
    rises = [rise_for(q) for q in (2, 3, 4, 5, 6.61, 8)]
    assert rises == sorted(rises) and rises[0] > 0
    assert 4.0 < rise_for(6.61) < 6.0          # Sept 2024 peak calibrated to ~5 m


def test_more_water_never_floods_less():
    prev = None
    for q in (1.5, 2.5, 4, 6.61, 9):
        stats = client.get(f"/api/scenario?discharge={q}").json()["stats"]
        if prev:
            for key in ("area_km2", "people", "villages", "road_km_cut"):
                assert stats[key] >= prev[key], key
        prev = stats


def test_village_cards_are_internally_consistent():
    for v in flooding_villages(6.61)[:8]:
        c = card(v["id"], Hydrograph.constant(6.61))
        assert c["risk"] in ("WATCH", "EVACUATE")
        assert c["eta_h"] >= 0 and not math.isinf(c["eta_h"])
        if c["needs_boat"]:
            assert c["route"] is None and c["leave_by_h"] is None
        else:
            assert c["leave_by_h"] < c["eta_h"]            # must leave before the water arrives
            assert c["route"]["path"][0] == [c["lon"], c["lat"]]


def test_route_crosses_every_road_before_it_floods():
    from kosi.routing import safe_route
    hg = Hydrograph.constant(6.61)
    for v in flooding_villages(6.61)[:8]:
        route = safe_route(v["lon"], v["lat"], hg)
        if route:
            assert route["slack_h"] > 0


def test_villages_off_the_kosi_are_safe():
    off = next(v for v in store.villages().values() if v["chainage_km"] is None)
    assert client.get(f"/api/villages/{off['id']}?discharge=8").json()["risk"] == "SAFE"


def test_replay_runs_and_peaks_near_2024_level():
    frames = client.get("/api/replay/2024").json()["frames"]
    assert max(f["discharge_lakh"] for f in frames) == pytest.approx(6.61)


def test_advisory_in_all_four_languages_with_identical_numbers():
    import re
    for v in flooding_villages(6.61)[:6]:
        a = client.get(f"/api/villages/{v['id']}/advisory?discharge=6.61").json()
        nums = {l: sorted(re.findall(r"\d+(?:\.\d+)?", a[l])) for l in ("en", "hi", "bho", "mai")}
        assert nums["hi"] == nums["bho"] == nums["mai"] == nums["en"], nums
        for l in ("hi", "bho", "mai"):
            assert any("ऀ" <= ch <= "ॿ" for ch in a[l])
        assert len({a["hi"], a["bho"], a["mai"]}) == 3          # genuinely different wording


def test_unknown_ids_404():
    assert client.get("/api/villages/1").status_code == 404
    assert client.get("/api/replay/1999").status_code == 404


def test_waterline_geometry():
    # 2.1 m door spanning rows 260..470 -> 100 px per metre; 1.2 m of water sits at row 350.
    assert mirror.waterline_y(470, 260, 2.1, 1.2) == 350
    with pytest.raises(ValueError):
        mirror.waterline_y(260, 470, 2.1, 1.2)


def test_mirror_endpoint_returns_watermarked_jpeg():
    buf = io.BytesIO()
    Image.new("RGB", (400, 300), (180, 160, 120)).save(buf, "JPEG")
    # Door from row 40 to row 250 of 300 (2.1 m) -> 1.0 m of water at row 150.
    r = client.post("/api/mirror", files={"photo": ("s.jpg", buf.getvalue(), "image/jpeg")},
                    data={"depth_m": 1.0, "ground_frac": 250 / 300, "top_frac": 40 / 300, "ref_height_m": 2.1})
    assert r.status_code == 200 and r.headers["content-type"] == "image/jpeg"
    assert r.headers["x-waterline-y"] == "150" and r.headers["x-render"] == "fallback"
    assert Image.open(io.BytesIO(r.content)).size == (400, 300)


def test_mirror_without_reference_asks_for_taps():
    buf = io.BytesIO()
    Image.new("RGB", (400, 300)).save(buf, "JPEG")
    r = client.post("/api/mirror", files={"photo": ("s.jpg", buf.getvalue(), "image/jpeg")}, data={"depth_m": 1.0})
    assert r.status_code == 422


def test_advisory_guardrail_rejects_changed_numbers(monkeypatch):
    from kosi import advisory, cloud

    class FakeBedrock:
        def __init__(self, reply):
            self.reply = reply

        def converse(self, **_):
            return {"output": {"message": {"content": [{"text": self.reply}]}}}

    draft = {"en": "Leave before 3 PM, 2.5 km away.", "hi": "दोपहर 3 बजे से पहले निकलें, 2.5 किमी।"}
    monkeypatch.setattr(cloud, "ENABLED", True)
    monkeypatch.setattr(cloud, "TEXT_MODELS", ["fake"])
    monkeypatch.setattr(cloud, "client", lambda _: FakeBedrock('{"en": "Leave by 4 PM, 2.5 km.", "hi": "4 बजे, 2.5 किमी"}'))
    assert advisory._rewrite(draft) is None                       # time changed -> rejected
    assert not cloud.available("bedrock-text")                    # ...and the breaker opened
    cloud._down_until.clear()
    monkeypatch.setattr(cloud, "client", lambda _: FakeBedrock('{"en": "Please leave before 3 PM; it is 2.5 km.", "hi": "3 बजे से पहले निकल जाएँ, 2.5 किमी।"}'))
    assert advisory._rewrite(draft)["source"] == "bedrock:fake"


def test_village_on_isolated_road_fragment_still_gets_a_route():
    # Regression: Sahugarh's nearest OSM road is an unconnected fragment; it used to come out as
    # "boat rescue needed" although dry ground is under a kilometre away and water is ~2 days off.
    v = next(x for x in store.villages().values() if x["name"] == "Sahugarh")
    c = card(v["id"], Hydrograph.constant(4.0))
    assert not c["needs_boat"] and c["route"]["distance_km"] < 5


def test_boat_rescue_is_rare_when_water_is_days_away():
    hg = Hydrograph.constant(4.0)
    cards = [card(a["id"], hg) for a in client.get("/api/scenario?discharge=4").json()["affected"]]
    late = [c for c in cards if c["eta_h"] > 24]
    assert late and sum(c["needs_boat"] for c in late) <= len(late) // 10


def test_leak_reports_are_validated_and_stored(tmp_path, monkeypatch):
    from kosi import reports
    monkeypatch.setattr(reports, "LOCAL", tmp_path / "reports.jsonl")
    monkeypatch.setattr(reports, "TABLE", None)
    ok = client.post("/api/reports", data={"kind": "seepage", "lon": 86.8, "lat": 26.0, "note": "water coming through"})
    assert ok.status_code == 200 and ok.json()["status"] == "unverified"
    assert client.get("/api/reports").json()[0]["id"] == ok.json()["id"]
    for bad in ({"kind": "fire", "lon": 86.8, "lat": 26.0}, {"kind": "crack", "lon": 10, "lat": 26.0},
                {"kind": "crack", "lon": 86.8, "lat": 26.0, "note": "x" * 201}):
        assert client.post("/api/reports", data=bad).status_code == 400


def test_replays_are_listed_from_files():
    from kosi import store
    names = [r["name"] for r in store.replays()]
    assert "2024" in names and all(r["peak_lakh"] > 0 for r in store.replays())



def _fake_record(monkeypatch):
    """Two floods in a synthetic official record: 2 lakh+ on 8-10 Aug and a bigger one peaking 29 Sept."""
    from datetime import datetime, timedelta
    from kosi import barrage
    rows, day = [], datetime(2024, 7, 1)
    big = {datetime(2024, 8, 8).date(): 2.3, datetime(2024, 8, 9).date(): 3.1, datetime(2024, 8, 10).date(): 2.2,
           datetime(2024, 9, 28).date(): 5.0, datetime(2024, 9, 29).date(): 6.61, datetime(2024, 9, 30).date(): 3.0}
    while day < datetime(2024, 10, 10):
        lakh = big.get(day.date(), 0.9)
        rows += [(day.replace(hour=10), int(lakh * 1e5), 250.0, 245.0), (day.replace(hour=15), int(lakh * 1e5) + 500, 250.0, 245.1)]
        day += timedelta(days=1)
    monkeypatch.setattr(barrage, "_readings", lambda: rows)
    monkeypatch.setattr(barrage, "_newest", lambda: {"time": rows[-1][0], "cusec": rows[-1][1], "up_ft": 250.0, "down_ft": 245.1,
                                                      "url": None, "fresh": False})
    monkeypatch.setattr(barrage, "outlook", lambda lakh: [])
    return barrage


def test_official_floods_are_found_from_the_record(monkeypatch):
    barrage = _fake_record(monkeypatch)
    events = barrage.floods()
    assert [e["id"] for e in events] == ["2024-09-29", "2024-08-09"]                  # newest first
    big = events[0]
    assert big["peak_cusec"] == 661500 and big["peak_lakh"] == 6.62 and big["days"] == 3 and big["start"] == "2024-09-28"
    assert events[1]["days"] == 3 and events[1]["peak_cusec"] == 310500
    assert barrage.floods_payload()["threshold_lakh"] == barrage.FLOOD_LAKH


def test_live_counter_reports_the_newest_official_reading(monkeypatch):
    barrage = _fake_record(monkeypatch)
    from datetime import datetime
    d = barrage.live_counter(now=datetime(2024, 10, 9, 19, 0))
    assert d["official"] and d["cusec"] == 90500 and d["lakh"] == 0.905 and d["fresh"] is False
    assert d["age_min"] == 240 and d["trend"] == "steady" and d["recent"][-1]["cusec"] == 90500
    assert d["up_ft"] == 250.0 and d["down_ft"] == 245.1


def test_replay_is_built_from_the_recorded_readings(monkeypatch):
    barrage = _fake_record(monkeypatch)
    from kosi import hydro
    r = barrage.replay_data("wrd:2024-09-29")
    assert r["series"][0]["time"] == "2024-09-26T10:00" and "RECORDED" in r["note"]
    assert max(p["discharge_lakh"] for p in r["series"]) == 6.615
    assert barrage.replay_data("2024") is None
    frames = hydro.replay_frames("wrd:2024-09-29")
    assert frames["frames"][0]["time"] == "2024-09-26T10:00" and len(frames["frames"]) < 200
    import pytest
    with pytest.raises(FileNotFoundError):
        barrage.replay_data("wrd:2020-01-01")


def test_lambda_warmup_event_does_not_need_an_http_request(monkeypatch):
    from kosi import api, barrage
    calls = []
    monkeypatch.setattr(barrage, "live_counter", lambda: calls.append(1))
    assert api.handler({"source": "aws.events", "detail-type": "Scheduled Event"}, None) == {"warmed": True}
    assert calls == [1]


def test_daily_series_has_one_entry_per_day_and_marks_gaps(monkeypatch):
    barrage = _fake_record(monkeypatch)
    d = barrage.floods_payload()["daily"]
    assert d["start"] == "2024-07-01" and len(d["max"]) == 101       # 1 Jul to 9 Oct inclusive
    assert d["max"][(__import__("datetime").date(2024, 9, 29) - __import__("datetime").date(2024, 7, 1)).days] == 661500


def test_model_check_compares_the_rating_curve_with_the_recorded_downstream_level():
    from kosi.hydro import rise_for
    r = client.get("/api/model-check").json()
    assert r["readings"] > 1000 and 240 < r["baseline_downstream_ft"] < 250
    bins = r["bins"]
    assert [b["lakh"] for b in bins] == sorted(b["lakh"] for b in bins) and all(b["n"] >= 3 for b in bins)
    # the model column is the app's own rule, and the observed rise does not fall as the discharge climbs through the busy bins
    assert all(b["model_rise_m"] == round(rise_for(b["lakh"]), 2) for b in bins)
    busy = [b["observed_rise_m"] for b in bins if b["n"] >= 50]
    assert busy == sorted(busy)
    assert "not the same measurement" in r["note"]


def test_shelter_load_counts_every_flooded_village_once():
    from kosi import hydro, shelterload, store
    from kosi.village import affected
    r = client.get("/api/shelter-load?discharge=4.0").json()
    rows = affected(hydro.Hydrograph.constant(4.0))
    vs = store.villages()
    assert r["people_to_move"] == sum(vs[x["id"]]["pop"] for x in rows)
    assert r["people_to_move"] == r["people_by_road"] + r["boat"]["people"]
    people = [d["people"] for d in r["destinations"]]
    assert people == sorted(people, reverse=True) and r["destination_count"] >= len(r["destinations"])
    assert "Demand only" in r["note"]
    assert client.get("/api/shelter-load?discharge=0.1").status_code == 422          # below the model's range
    assert shelterload.shelter_load(4.02) is shelterload.shelter_load(4.0)           # one cached result per gauge step


# ---------- village alerts (kosi/alerts.py) ----------
import pytest


@pytest.fixture
def alert_env(monkeypatch, tmp_path):
    from kosi import alerts
    monkeypatch.setattr(alerts, "LOCAL", tmp_path / "alerts.json")
    monkeypatch.setattr(alerts, "OUTBOX", tmp_path / "outbox.jsonl")
    monkeypatch.setattr(alerts, "TABLE", None)
    monkeypatch.setattr(alerts, "TOPIC", None)
    monkeypatch.setattr(alerts, "SITE_URL", "https://example.test")
    return alerts


def _villages_for_alerts():
    from kosi import hydro, store
    from kosi.village import affected
    wet = affected(hydro.Hydrograph.constant(4.0))[0]["id"]
    dry = next(v["id"] for v in store.villages().values() if v["chainage_km"] is None)
    return wet, dry


def _outbox(alerts):
    import json
    return [json.loads(x) for x in alerts.OUTBOX.read_text(encoding="utf-8").splitlines()] if alerts.OUTBOX.exists() else []


def test_alert_signup_is_validated_and_capped(alert_env):
    alerts = alert_env
    wet, _ = _villages_for_alerts()
    assert client.post("/api/alerts/subscribe", data={"email": "nope", "village_id": wet}).status_code == 400
    assert client.post("/api/alerts/subscribe", data={"email": "a@b.co", "village_id": 1}).status_code == 404
    ok = client.post("/api/alerts/subscribe", data={"email": "a@b.co", "village_id": wet, "lang": "hi"})
    assert ok.status_code == 200 and ok.json()["dry_run"] is True and ok.json()["villages"] == 1
    from kosi import store
    others = [v for v in store.villages() if v != wet][: alerts.MAX_VILLAGES]
    codes = [client.post("/api/alerts/subscribe", data={"email": "a@b.co", "village_id": v}).status_code for v in others]
    assert codes == [200] * (alerts.MAX_VILLAGES - 1) + [400]                # the sixth village is refused
    assert client.post("/api/alerts/subscribe", data={"email": "a@b.co", "village_id": wet}).status_code == 200   # re-following is fine


def test_alert_daily_signup_cap_protects_strangers_inboxes(alert_env, monkeypatch):
    alerts = alert_env
    wet, _ = _villages_for_alerts()
    monkeypatch.setattr(alerts, "DAILY_SIGNUPS", 2)
    codes = [client.post("/api/alerts/subscribe", data={"email": f"p{i}@b.co", "village_id": wet}).status_code for i in range(3)]
    assert codes == [200, 200, 429]


def test_test_alert_needs_a_follow_and_is_limited(alert_env):
    alerts = alert_env
    wet, _ = _villages_for_alerts()
    assert client.post("/api/alerts/test", data={"email": "t@b.co", "village_id": wet}).status_code == 404
    client.post("/api/alerts/subscribe", data={"email": "t@b.co", "village_id": wet})
    for _ in range(alerts.TESTS_PER_DAY):
        assert client.post("/api/alerts/test", data={"email": "t@b.co", "village_id": wet}).status_code == 200
    assert client.post("/api/alerts/test", data={"email": "t@b.co", "village_id": wet}).status_code == 429
    sent = _outbox(alerts)
    assert len(sent) == alerts.TESTS_PER_DAY and sent[0]["village"] == f"test-{alerts._h('t@b.co')}" and "TEST" in sent[0]["body"]


def test_alerts_go_only_to_followers_of_flooded_villages_once_per_rise(alert_env):
    alerts = alert_env
    wet, dry = _villages_for_alerts()
    client.post("/api/alerts/subscribe", data={"email": "w@b.co", "village_id": wet})
    client.post("/api/alerts/subscribe", data={"email": "d@b.co", "village_id": dry})
    assert alerts.check_and_publish(0.7)["sent"] == 0                         # band 0: nothing to say
    r = alerts.check_and_publish(4.0)
    assert r["band"] == 2 and r["sent"] == 1
    sent = _outbox(alerts)
    assert [m["village"] for m in sent] == [str(wet)] and "planning estimate" in sent[0]["body"] and "example.test/#v=" in sent[0]["body"]
    assert alerts.check_and_publish(4.2)["sent"] == 0                         # same band: no repeat
    alerts.check_and_publish(1.0)                                             # river falls: band remembered, nothing sent
    assert alerts.check_and_publish(4.0)["sent"] == 0                         # rises again inside the resend window: still quiet
    assert len(_outbox(alerts)) == 1


def test_alert_signup_through_aws_filters_each_address_to_its_villages(alert_env, monkeypatch):
    alerts = alert_env
    from kosi import cloud

    class FakeSns:
        def __init__(self): self.calls = []
        def subscribe(self, **kw):
            self.calls.append(("subscribe", kw)); return {"SubscriptionArn": "pending confirmation"}
        def set_subscription_attributes(self, **kw): self.calls.append(("set", kw))
        def publish(self, **kw): self.calls.append(("publish", kw))

    sns = FakeSns()
    monkeypatch.setattr(alerts, "TOPIC", "arn:aws:sns:us-east-1:1:kosi-alerts")
    monkeypatch.setattr(cloud, "ENABLED", True)
    monkeypatch.setattr(cloud, "client", lambda name: sns)
    wet, _ = _villages_for_alerts()
    r = alerts.subscribe("x@b.co", wet, "en")
    assert r["status"] == "confirm_email" and r["dry_run"] is False
    kind, kw = sns.calls[0]
    import json
    policy = json.loads(kw["Attributes"]["FilterPolicy"])["village"]
    assert kind == "subscribe" and str(wet) in policy and f"test-{alerts._h('x@b.co')}" in policy and kw["Protocol"] == "email"
    sns.calls.clear()
    monkeypatch.setattr(sns, "subscribe", lambda **kw: {"SubscriptionArn": "arn:aws:sns:us-east-1:1:kosi-alerts:abc"})
    assert alerts.subscribe("x@b.co", wet, "en")["status"] == "updated"        # an already-confirmed address has its filter widened
    assert sns.calls and sns.calls[0][0] == "set"
