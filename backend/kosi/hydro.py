"""Discharge -> water rise, flood timing, and scenario statistics."""
from datetime import datetime, timedelta, timezone

IST = timezone(timedelta(hours=5, minutes=30))   # India has no daylight saving; Lambda's clock is UTC

from . import store
from .config import D0_M, EXPONENT, FLOOD_WAVE_KMH, LAYER_BASE_URL, OVERLAND_KMH, Q0_LAKH


def rise_for(discharge_lakh):
    """Rise of the river above normal monsoon level (m) for a Birpur discharge in lakh cusecs."""
    if discharge_lakh <= Q0_LAKH:
        return 0.0
    return D0_M * ((discharge_lakh / Q0_LAKH) ** EXPONENT - 1)


def lag_hours(chainage_km, dist_river_km):
    """Hours for water released at Birpur to reach a point: down the river, then across the fields."""
    return chainage_km / FLOOD_WAVE_KMH + dist_river_km / OVERLAND_KMH


def stats_at(rise):
    """Precomputed stats for the highest stage <= rise (stages are 0.25 m apart)."""
    rows = [s for s in store.stage_stats() if s["rise_m"] <= rise + 1e-9]
    if not rows:
        return {"rise_m": 0.0, "area_km2": 0, "people": 0, "elderly": 0, "children": 0,
                "villages": 0, "road_km_cut": 0, "shelters_flooded": 0}
    return rows[-1]


def layer_url(rise):
    """Nearest precomputed overlay (0.5 m steps) as a file prefix — tiles are <prefix>_0.png … _3.png
    (see grid.json layer_tiles); None when the river is in its normal channel."""
    step = round(rise * 2) / 2
    if step < 0.5:
        return None
    return f"{LAYER_BASE_URL}/flood_{min(step, 10.0):.1f}"


def scenario(discharge_lakh):
    rise = rise_for(discharge_lakh)
    return {"discharge_lakh": discharge_lakh, "rise_m": round(rise, 2), "layer_url": layer_url(rise),
            "stats": stats_at(rise)}


class Hydrograph:
    """Birpur discharge over time. Constant (slider scenario) or a recorded/replayed series."""

    def __init__(self, start, points):
        self.start = start                     # datetime of t=0
        self.points = sorted(points)           # [(hours, lakh_cusecs)]

    @classmethod
    def constant(cls, discharge_lakh, start=None):
        return cls(start or datetime.now(IST).replace(tzinfo=None, second=0, microsecond=0), [(0.0, discharge_lakh)])

    @classmethod
    def from_replay(cls, name):
        data = replay_source(name)
        start = datetime.fromisoformat(data["series"][0]["time"])
        pts = [((datetime.fromisoformat(p["time"]) - start).total_seconds() / 3600, p["discharge_lakh"])
               for p in data["series"]]
        return cls(start, pts)

    def at(self, hours):
        """Linear interpolation; flat before the first and after the last point."""
        pts = self.points
        if hours <= pts[0][0]:
            return pts[0][1]
        for (t0, q0), (t1, q1) in zip(pts, pts[1:]):
            if t0 <= hours <= t1:
                return q0 + (q1 - q0) * (hours - t0) / (t1 - t0)
        return pts[-1][1]

    def peak(self):
        return max(q for _, q in self.points)

    def wet_time(self, stage_m, lag_h, step_h=0.5, horizon_h=168):
        """First hour (since t=0) when the rise at a spot `lag_h` downstream reaches `stage_m`; inf if never."""
        if stage_m is None or rise_for(self.peak()) < stage_m:
            return float("inf")
        if len(self.points) == 1:
            return lag_h
        t = lag_h
        while t <= horizon_h:
            if rise_for(self.at(t - lag_h)) >= stage_m:
                return t
            t += step_h
        return float("inf")

    def clock(self, hours):
        return self.start + timedelta(hours=hours)


def replay_source(name):
    """A modelled replay ('glofas:YYYY-MM-DD') or a replay file (kosi/replays/<name>.json)."""
    from . import live          # imported here because live imports this module
    return live.replay_data(name) or store.replay(name)


def replay_frames(name, step_h=None):
    """Frames for the replay animation: hourly for a recorded flood, every 3 hours for a modelled one (daily values)."""
    step_h = step_h or (3.0 if name.startswith("glofas:") else 1.0)
    hg = Hydrograph.from_replay(name)
    end = hg.points[-1][0] + 36                 # let the wave travel through the region
    frames, t = [], 0.0
    while t <= end:
        q = hg.at(t)
        frames.append({"hours": t, "time": hg.clock(t).isoformat(timespec="minutes"),
                       "discharge_lakh": round(q, 2), "rise_m": round(rise_for(q), 2),
                       "layer_url": layer_url(rise_for(q)), "stats": stats_at(rise_for(q))})
        t += step_h
    return {"name": name, "note": replay_source(name)["note"], "frames": frames}
