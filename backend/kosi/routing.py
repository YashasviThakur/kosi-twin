"""Time-aware evacuation routing.

Every road segment has a time when it goes under water (from its flood stage and its distance
down the river). Walking from the village at t=0, a segment can be used only if we reach its far
end before it floods. The search stops at the first shelter that stays dry at the peak.

Because departure can be delayed by the smallest margin left on any segment, the same search
also gives "leave by": the latest departure at which the whole route is still dry.
"""
import heapq
import math

import numpy as np

from . import store
from .config import ROUTE_MAX_KM, SHELTER_DRY_MARGIN_M, WALK_KMH
from .hydro import lag_hours, rise_for


def _nearest_node(lon, lat):
    dist, idx = store.roads()["tree"].query([lon * 0.9, lat])
    return int(idx), float(dist) * 111.0


def _dry_shelter_nodes(peak_rise):
    r = store.roads()
    dry = [s for s in store.shelters()
           if s["flood_stage_m"] is None or s["flood_stage_m"] >= peak_rise + SHELTER_DRY_MARGIN_M]
    snap, nodes = r["tree"].query([[s["lon"] * 0.9, s["lat"]] for s in dry])
    best = {}
    for s, km, node in zip(dry, snap * 111.0, nodes):
        if int(node) not in best or km < best[int(node)][1]:
            best[int(node)] = (s, km)
    return best


def safe_route(lon, lat, hydrograph):
    """Returns route dict, or None when no dry shelter is reachable on foot (=> boat rescue)."""
    r = store.roads()
    cut, chain, dist = r["cut_stage_m"], r["chainage_km"], r["dist_river_km"]
    indptr, nbr, eid, length = r["indptr"], r["nbr"], r["eid"], r["length_km"]
    peak_rise = rise_for(hydrograph.peak())
    targets = _dry_shelter_nodes(peak_rise)

    flood_cache = {}

    def floods_at(k):
        if k not in flood_cache:
            c = cut[k]
            flood_cache[k] = (math.inf if np.isnan(c) or c > peak_rise
                              else hydrograph.wet_time(float(c), lag_hours(float(chain[k]), float(dist[k]))))
        return flood_cache[k]

    src, snap_km = _nearest_node(lon, lat)
    start_t = snap_km / WALK_KMH
    best_t = {src: start_t}
    prev = {src: (None, None)}
    heap = [(start_t, src)]
    max_t = ROUTE_MAX_KM / WALK_KMH
    while heap:
        t, u = heapq.heappop(heap)
        if t > best_t.get(u, math.inf):
            continue
        if u in targets:
            break
        for j in range(indptr[u], indptr[u + 1]):
            k, v = eid[j], nbr[j]
            arrive = t + float(length[k]) / WALK_KMH
            if arrive > max_t or arrive >= floods_at(k):
                continue
            if arrive < best_t.get(v, math.inf):
                best_t[v] = arrive
                prev[v] = (u, k)
                heapq.heappush(heap, (arrive, v))
    else:
        return None

    shelter, shelter_snap = targets[u]
    nodes, slack = [u], math.inf
    node = u
    while prev[node][0] is not None:
        p, k = prev[node]
        slack = min(slack, floods_at(k) - best_t[node])     # how much later we could have crossed k
        nodes.append(p)
        node = p
    walk_h = t + shelter_snap / WALK_KMH
    coords = [[round(float(x), 5), round(float(y), 5)] for x, y in r["lonlat"][nodes[::-1]]]
    return {"shelter": shelter, "distance_km": round(walk_h * WALK_KMH, 2), "walk_h": walk_h,
            "slack_h": slack, "path": [[lon, lat]] + coords + [[shelter["lon"], shelter["lat"]]]}
