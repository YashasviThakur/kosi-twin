"""Turn a real discharge record into a replay the app can play (it then appears in "Past floods").
Input: a CSV with a time column (ISO, e.g. 2008-08-18T06:00 or 2008-08-18) and a discharge column in lakh cusecs at the
Birpur barrage, from an official source (Bihar Water Resources Department bulletins, CWC flood forecasting).
Usage: python import_replay.py record.csv --name 2008 --title "Kusaha breach, Aug 2008" --source "Bihar WRD bulletin"
Writes backend/kosi/replays/<name>.json. Hours are not guessed: the series is used exactly as given."""
import argparse
import csv
import json
from pathlib import Path

ap = argparse.ArgumentParser()
ap.add_argument("csv_path")
ap.add_argument("--name", required=True, help="short id, e.g. 2008")
ap.add_argument("--title", required=True)
ap.add_argument("--source", required=True, help="where the numbers come from; shown to people as the replay note")
ap.add_argument("--time-col", default="time")
ap.add_argument("--q-col", default="discharge_lakh")
args = ap.parse_args()

rows = []
with open(args.csv_path, newline="", encoding="utf-8-sig") as f:
    for r in csv.DictReader(f):
        t = r[args.time_col].strip()
        rows.append({"time": t if "T" in t else f"{t}T00:00", "discharge_lakh": float(r[args.q_col])})
rows.sort(key=lambda r: r["time"])
if len(rows) < 3:
    raise SystemExit("need at least 3 rows")

out = Path(__file__).resolve().parents[1] / "kosi" / "replays" / f"{args.name}.json"
out.write_text(json.dumps({"name": args.name, "title": args.title, "note": f"Recorded values. Source: {args.source}.",
                           "series": rows}, indent=2), encoding="utf-8")
print(f"wrote {out} ({len(rows)} points, peak {max(r['discharge_lakh'] for r in rows)} lakh cusecs)")
