"""Crowd reports of leaks, cracks and breaches on embankments. Anyone can submit; every report is shown as
UNVERIFIED until engineers confirm it. Stored in DynamoDB when KOSI_REPORTS_TABLE is set (Lambda),
otherwise in a local JSON-lines file (development)."""
import json
import os
import time
import uuid
from pathlib import Path

from . import cloud
from .config import DATA_DIR

KINDS = ("seepage", "crack", "breach")
NOTE_MAX = 200
KEEP = 200                         # most recent reports returned
BIHAR_BOX = (83.0, 24.0, 88.6, 27.7)     # west, south, east, north (with a margin)

TABLE = os.environ.get("KOSI_REPORTS_TABLE")
LOCAL = Path(os.environ.get("KOSI_REPORTS_FILE", DATA_DIR.parent / "reports.jsonl"))


def validate(kind, lon, lat, note):
    """Returns an error message, or None when the report is acceptable."""
    if kind not in KINDS:
        return f"kind must be one of {', '.join(KINDS)}"
    w, s, e, n = BIHAR_BOX
    if not (w <= lon <= e and s <= lat <= n):
        return "location is outside Bihar"
    if len(note) > NOTE_MAX:
        return f"note is longer than {NOTE_MAX} characters"
    return None


def add(kind, lon, lat, note=""):
    record = {"id": uuid.uuid4().hex[:12], "kind": kind, "lon": round(lon, 5), "lat": round(lat, 5),
              "note": note.strip(), "time": int(time.time()), "status": "unverified"}
    if TABLE and cloud.ENABLED:
        cloud.client("dynamodb").put_item(TableName=TABLE, Item={
            "pk": {"S": "report"}, "id": {"S": record["id"]}, "kind": {"S": kind},
            "lon": {"N": str(record["lon"])}, "lat": {"N": str(record["lat"])}, "note": {"S": record["note"]},
            "time": {"N": str(record["time"])}, "status": {"S": "unverified"}})
    else:
        LOCAL.parent.mkdir(parents=True, exist_ok=True)
        with LOCAL.open("a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    return record


def recent():
    if TABLE and cloud.ENABLED:
        items = cloud.client("dynamodb").query(
            TableName=TABLE, KeyConditionExpression="pk = :p", ExpressionAttributeValues={":p": {"S": "report"}},
            Limit=1000)["Items"]
        rows = [{"id": i["id"]["S"], "kind": i["kind"]["S"], "lon": float(i["lon"]["N"]), "lat": float(i["lat"]["N"]),
                 "note": i["note"]["S"], "time": int(i["time"]["N"]), "status": i["status"]["S"]} for i in items]
    elif LOCAL.exists():
        rows = [json.loads(line) for line in LOCAL.read_text(encoding="utf-8").splitlines() if line.strip()]
    else:
        rows = []
    return sorted(rows, key=lambda r: -r["time"])[:KEEP]
