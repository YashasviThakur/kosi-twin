"""An honest check of the model's river-height rule against the department's own readings.

The Bihar WRD barrage report gives, with every discharge reading, the water level downstream of the barrage in feet. So the archive
(barrage_history.json, every 10 AM / 3 PM reading since 2018) holds thousands of (discharge, downstream level) pairs. This groups them
by discharge and compares how much the downstream level rose above its level at about 1 lakh cusecs ("normal monsoon" in the model)
with the rise the model's rule (hydro.rise_for) gives for the same discharge.

It is a check, not a calibration: the downstream gauge sits in the channel just below the barrage, while the model's rise is the
height of the river above its normal level further down the plain, so the two are not the same measurement. The result is shown as it
is, with that caveat, so a reader can judge it.
"""
import json
from functools import lru_cache
from pathlib import Path

import numpy as np

from .hydro import rise_for

HISTORY_FILE = Path(__file__).parent / "barrage_history.json"
FT_TO_M = 0.3048
BIN_LAKH = 0.5
MIN_READINGS = 3                    # a bin needs at least this many readings to be shown
NORMAL_LAKH = (0.8, 1.2)            # readings in this band set the "normal monsoon" downstream level

NOTE = ("The downstream gauge sits in the channel just below the barrage; the model's rise is the height of the river above its "
        "normal level further down the plain. They are not the same measurement, so this is a sanity check, not proof either way. "
        "Few readings exist above 3 lakh cusecs, so the right-hand end is thin.")


@lru_cache
def check():
    rows = json.loads(HISTORY_FILE.read_text(encoding="utf-8"))["readings"]
    pairs = [(c / 1e5, dn) for _, c, up, dn in rows if c and dn and up]
    q = np.array([p[0] for p in pairs])
    ft = np.array([p[1] for p in pairs])
    normal = (q >= NORMAL_LAKH[0]) & (q <= NORMAL_LAKH[1])
    baseline = float(np.median(ft[normal]))
    bins = []
    start = 1.0
    while start < q.max():
        m = (q >= start) & (q < start + BIN_LAKH)
        if m.sum() >= MIN_READINGS:
            rise = (ft[m] - baseline) * FT_TO_M
            centre = round(float(np.median(q[m])), 2)
            bins.append({"lakh": centre, "n": int(m.sum()), "observed_rise_m": round(float(np.median(rise)), 2),
                         "p25_m": round(float(np.percentile(rise, 25)), 2), "p75_m": round(float(np.percentile(rise, 75)), 2),
                         "model_rise_m": round(rise_for(centre), 2)})
        start += BIN_LAKH
    return {"source": "Bihar WRD Koshi Barrage Gate Status Reports, 2018 onward", "readings": len(pairs),
            "baseline_downstream_ft": round(baseline, 1), "bins": bins, "note": NOTE}
