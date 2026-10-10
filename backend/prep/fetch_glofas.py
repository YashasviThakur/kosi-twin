"""Snapshot the modelled daily river flow near Birpur, 1997 to the end of last year, into kosi/glofas_history.json,
so the app can browse past dates without asking the API for 29 years of data on every cold start. (The recent days and
the 14-day outlook are fetched live; see kosi/live.py.) GloFAS reanalysis has no values before 1997.
Usage: python fetch_glofas.py"""
import json
import sys
import urllib.request
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from kosi.live import LAT, LON                                    # noqa: E402

START = "1997-01-02"
END = date(date.today().year - 1, 12, 31).isoformat()
url = (f"https://flood-api.open-meteo.com/v1/flood?latitude={LAT}&longitude={LON}&daily=river_discharge"
       f"&start_date={START}&end_date={END}&timezone=Asia%2FKolkata")
d = json.load(urllib.request.urlopen(url, timeout=90))
t, q = d["daily"]["time"], d["daily"]["river_discharge"]
assert t[0] == START and t[-1] == END, (t[0], t[-1])
out = Path(__file__).resolve().parents[1] / "kosi" / "glofas_history.json"
out.write_text(json.dumps({
    "source": "GloFAS v4 (Copernicus) via Open-Meteo flood API", "cell": {"lat": d["latitude"], "lon": d["longitude"]},
    "start": START, "end": END, "unit": "m3/s",
    "values": [None if v is None else round(v) for v in q],
}, separators=(",", ":")), encoding="utf-8")
print(f"wrote {out} ({len(q)} days, {out.stat().st_size // 1024} KB)")
