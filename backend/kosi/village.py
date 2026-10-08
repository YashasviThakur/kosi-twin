"""Village card: when water arrives, how deep, when to leave, where to go."""
import numpy as np

from . import store
from .config import SAFETY_MARGIN_H, SHELTER_DRY_MARGIN_M
from .hydro import lag_hours, rise_for
from .advisory import hindi_name
from .lang import depth_band
from .routing import safe_route

TIMELINE_H = 72        # hours shown on the water-depth chart
URGENT_H = 24          # EVACUATE if deep water arrives within this window


def _nearby_facilities(v, peak_rise, radius_km=2.0):
    out = []
    for s in store.shelters():
        km = float(np.hypot((s["lon"] - v["lon"]) * 100.0, (s["lat"] - v["lat"]) * 111.0))
        if km <= radius_km and s["flood_stage_m"] is not None and s["flood_stage_m"] <= peak_rise:
            out.append({"name": s["name"], "kind": s["kind"], "km": round(km, 2), "floods_at_rise_m": s["flood_stage_m"]})
    return sorted(out, key=lambda f: f["km"])[:8]


def status(v, hydrograph):
    """Quick risk for one village (no routing): None if it stays dry, else eta/depth/risk.
    Shared by the map colouring and the village card so both always agree."""
    peak_rise = rise_for(hydrograph.peak())
    if v["chainage_km"] is None or v["first_wet_stage_m"] is None or v["first_wet_stage_m"] > peak_rise:
        return None
    lag = lag_hours(v["chainage_km"], v["dist_river_km"])
    eta_h = hydrograph.wet_time(v["first_wet_stage_m"], lag)
    max_depth = max(0.0, peak_rise - v["hand_m"])
    risk = "EVACUATE" if max_depth > 0.5 and eta_h < URGENT_H else "WATCH"
    return {"id": v["id"], "risk": risk, "eta_h": round(eta_h, 1), "depth_m": round(max_depth, 2), "lag_h": lag}


def affected(hydrograph):
    """Every village that floods, most urgent first (EVACUATE, then by population)."""
    rows = [s for v in store.villages().values() if (s := status(v, hydrograph))]
    for s in rows:
        s.pop("lag_h")
    return sorted(rows, key=lambda s: (s["risk"] != "EVACUATE", -store.villages()[s["id"]]["pop"]))


def card(village_id, hydrograph):
    v = store.villages().get(village_id)
    if v is None:
        return None
    base = {k: v[k] for k in ("id", "name", "name_hi", "type", "lon", "lat", "pop", "elderly", "children", "ground_m")}
    peak_rise = rise_for(hydrograph.peak())

    st = status(v, hydrograph)
    if st is None:
        return {**base, "risk": "SAFE", "peak_rise_m": round(peak_rise, 2),
                "reason": "outside_kosi_floodplain" if v["chainage_km"] is None else "above_peak_water"}
    lag, eta_h, max_depth, risk = st["lag_h"], st["eta_h"], st["depth_m"], st["risk"]

    timeline = []
    for t in range(TIMELINE_H + 1):
        rise = rise_for(hydrograph.at(t - lag)) if t >= lag else 0.0
        timeline.append({"hours": t, "time": hydrograph.clock(t).isoformat(timespec="minutes"),
                         "depth_m": round(max(0.0, rise - v["hand_m"]), 2), "wet": t >= eta_h})
    route = safe_route(v["lon"], v["lat"], hydrograph)
    if route:
        # Latest departure: before water reaches the village, and before any road on the route floods.
        leave_by_h = min(eta_h, route["slack_h"]) - SAFETY_MARGIN_H
    else:
        leave_by_h = None

    return {
        **base, "risk": risk, "chainage_km": v["chainage_km"], "dist_river_km": v["dist_river_km"],
        "peak_rise_m": round(peak_rise, 2),
        "eta_h": round(eta_h, 1), "eta_time": hydrograph.clock(eta_h).isoformat(timespec="minutes"),
        "max_depth_m": round(max_depth, 2), "max_depth_band": depth_band(max_depth),
        "edge_only": max_depth == 0,                      # water reaches the village outskirts, not the centre
        "leave_by_h": None if leave_by_h is None else round(leave_by_h, 1),
        "leave_by_time": None if leave_by_h is None else hydrograph.clock(max(leave_by_h, 0)).isoformat(timespec="minutes"),
        "leave_now": leave_by_h is not None and leave_by_h <= 0,
        "needs_boat": route is None,
        "route": None if route is None else {
            "shelter": {**{k: route["shelter"][k] for k in ("name", "kind", "lon", "lat")},
                        # translated at build time (prep/translate_names.py); live Translate only as a fallback
                        "name_hi": route["shelter"].get("name_hi") or hindi_name(route["shelter"]["name"])},
            "distance_km": route["distance_km"], "walk_min": round(route["walk_h"] * 60), "path": route["path"]},
        "facilities_at_risk": _nearby_facilities(v, peak_rise),
        "shelter_dry_margin_m": SHELTER_DRY_MARGIN_M,
        "timeline": timeline,
    }
