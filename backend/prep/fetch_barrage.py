"""Download the Bihar WRD Koshi Barrage Gate Status Reports (10 AM and 3 PM, every day) and keep the official discharge.
Writes backend/kosi/barrage_history.json: readings [[time, cusec, upstream_ft, downstream_ft], ...], oldest first.
The department's server drops connections now and then, so requests retry, run a few at a time, and progress is cached in
backend/data/barrage_cache.json (re-run to resume or to pick up new reports). Reports before 2018 show gate positions but
no discharge, so the record starts in 2018.
Usage: python fetch_barrage.py [first_year]"""
import json
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from kosi import wrd                                                        # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "data" / "barrage_cache.json"
OUT = ROOT / "kosi" / "barrage_history.json"
FIRST = int(sys.argv[1]) if len(sys.argv) > 1 else 2018


_local = threading.local()


def fetch(url, timeout=60):
    """One connection per worker thread, kept alive: the department's server resets connections that are opened too fast."""
    if not hasattr(_local, "s"):
        _local.s = requests.Session()
        _local.s.headers.update(wrd.UA)
    r = _local.s.get(url, timeout=timeout)
    r.raise_for_status()
    return r.content


def retry(fn, tries=6):
    for k in range(tries):
        try:
            return fn()
        except Exception:
            time.sleep(1.5 * (k + 1))
    return None


cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}


def work(url):
    if url in cache:
        return
    data = retry(lambda: fetch(url))
    if data is None:
        return                                             # not cached: tried again next run
    try:
        cache[url] = wrd.parse(data)                       # None is cached too: the report has no readable discharge
    except Exception:
        cache[url] = None


def write_out():
    """Build kosi/barrage_history.json from everything cached so far."""
    rows = {}
    for url, r in list(cache.items()):                       # a snapshot: the workers keep adding while this runs
        when = wrd.stamp(url)
        if r and when and when.year >= FIRST:
            rows[when.isoformat(timespec="minutes")] = [when.isoformat(timespec="minutes"), r["cusec"], r["up_ft"], r["down_ft"]]
    readings = [rows[k] for k in sorted(rows)]
    OUT.write_text(json.dumps({"source": "Bihar Water Resources Department, Koshi Barrage Gate Status Reports",
                               "unit": "cusec", "readings": readings}, separators=(",", ":")), encoding="utf-8")
    return readings


todo = []
for year in reversed(range(FIRST, datetime.now().year + 1)):      # newest first: the live counter and recent floods matter most
    urls = retry(lambda: wrd.listing_urls(fetch(f"{wrd.BASE}/Gatestatus.aspx?y={year}&g=Kosi").decode("utf-8", "replace")))
    if urls is None:
        print(f"{year}: listing failed (run again)", flush=True)
        continue
    print(f"{year}: {len(urls)} reports, {sum(u in cache for u in urls)} already cached", flush=True)
    todo += urls[::-1]                                              # and the newest reports first within a year

done = 0
with ThreadPoolExecutor(max_workers=4) as pool:
    for _ in pool.map(work, todo):
        done += 1
        if done % 150 == 0:
            CACHE.write_text(json.dumps(dict(list(cache.items()))), encoding="utf-8")
            write_out()
            print(f"  {done}/{len(todo)}", flush=True)
CACHE.write_text(json.dumps(cache), encoding="utf-8")
readings = write_out()
peak = max(readings, key=lambda r: r[1])
print(f"wrote {OUT}: {len(readings)} readings, {readings[0][0]} to {readings[-1][0]}, peak {peak[1]} cusec on {peak[0]}", flush=True)
missing = len([u for u in todo if u not in cache])
print(f"{missing} reports could not be downloaded (re-run to retry)", flush=True)
