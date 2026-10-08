"""Evacuation routing on foot, to a place that stays dry at the peak.

- Start and end points snap to the main road network. OSM coverage of village lanes in Bihar is patchy,
  so a village's nearest road can be an isolated fragment; walking across fields to the nearest
  connected road is counted in the walking time.
- Every road segment has a time when it goes under water. A segment can be used only if we reach its
  far end before then.
- Among usable routes, roads that flood at the peak count as FLOODING_PENALTY times longer, so routes
  go around the flood when a reasonable detour exists (and don't look like they cross water on the map).
- Destinations: a mapped shelter (school / hospital) that stays dry, or — since Bihar has few mapped
  shelters — any road point that stays dry at the peak (usually a raised road or embankment). A shelter is preferred
  when it is at most SHELTER_DETOUR_H further on foot.

The latest safe departure ("leave by") is the smallest margin left on any segment of the route.
"""
import heapq
import math
from functools import lru_cache

import numpy as np

from . import store
from .config import ROUTE_MAX_KM, SHELTER_DRY_MARGIN_M, WALK_KMH
from .hydro import lag_hours, rise_for

FLOODING_PENALTY = 4.0
SHELTER_DETOUR_H = 1.0
# Dry destinations are road points that stay above the peak — in the Kosi belt usually a raised road or
# embankment, which is where people actually shelter in floods.
HIGH_GROUND = {"name": "Raised dry road", "name_hi": "ऊँची सूखी सड़क", "kind": "high_ground"}


def _nearest_main_node(lon, lat):
    """Nearest node on the main connected road network, and the off-road walk to it (km)."""
    r = store.roads()
    dist, i = r["main_tree"].query([lon * 0.9, lat])
    return int(r["main_nodes"][i]), float(dist) * 111.0


@lru_cache(maxsize=64)
def _dry_nodes(peak_key):
    """Road nodes whose every road stays dry at the peak (with the shelter margin)."""
    r = store.roads()
    cut = np.where(np.isnan(r["cut_stage_m"]), np.inf, r["cut_stage_m"])
    lowest = np.full(len(r["lonlat"]), np.inf)
    np.minimum.at(lowest, r["edge_a"], cut)
    np.minimum.at(lowest, r["edge_b"], cut)
    return lowest >= peak_key + SHELTER_DRY_MARGIN_M


CATEGORY = {"hospital": "hospital", "clinic": "hospital", "school": "school", "college": "school"}


def _dry_shelters(peak_rise):
    """Category -> {main-network node -> (shelter, off-road km)} for shelters that stay dry at the peak."""
    best = {"hospital": {}, "school": {}}
    for s in store.shelters():
        if s["flood_stage_m"] is not None and s["flood_stage_m"] < peak_rise + SHELTER_DRY_MARGIN_M:
            continue
        cat = CATEGORY.get(s["kind"], "school")
        node, km = _nearest_main_node(s["lon"], s["lat"])
        if node not in best[cat] or km < best[cat][node][1]:
            best[cat][node] = (s, km)
    return best


def safe_routes(lon, lat, hydrograph):
    """Nearest dry hospital, school/college and raised road, reachable on foot before the water.

    Returns {"best": route or None, "options": {category: route}}; best is None (=> boat rescue)
    when nothing dry is reachable. The recommendation is a mapped shelter if it is at most
    SHELTER_DETOUR_H further on foot than the nearest raised road, otherwise the raised road.
    """
    r = store.roads()
    cut, chain, dist = r["cut_stage_m"], r["chainage_km"], r["dist_river_km"]
    indptr, nbr, eid, length = r["indptr"], r["nbr"], r["eid"], r["length_km"]
    peak_rise = rise_for(hydrograph.peak())
    shelters = _dry_shelters(peak_rise)
    dry = _dry_nodes(round(peak_rise, 2))

    flood_cache = {}

    def floods_at(k):
        if k not in flood_cache:
            c = cut[k]
            flood_cache[k] = (math.inf if np.isnan(c) or c > peak_rise
                              else hydrograph.wet_time(float(c), lag_hours(float(chain[k]), float(dist[k]))))
        return flood_cache[k]

    src, snap_km = _nearest_main_node(lon, lat)
    max_t = ROUTE_MAX_KM / WALK_KMH
    best = {src: 0.0}                      # search cost (penalised km)
    arrive_at = {src: snap_km / WALK_KMH}  # actual walking time (h)
    prev = {src: (None, None)}
    heap = [(0.0, src)]
    found = {}                             # category -> end node, first reached
    while heap and len(found) < 3:
        cost, u = heapq.heappop(heap)
        if cost > best.get(u, math.inf):
            continue
        for cat in ("hospital", "school"):
            if cat not in found and u in shelters[cat]:
                found[cat] = u
        if "high_ground" not in found and dry[u]:
            found["high_ground"] = u
        t = arrive_at[u]
        for j in range(indptr[u], indptr[u + 1]):
            k, v = eid[j], nbr[j]
            arrive = t + float(length[k]) / WALK_KMH
            if arrive > max_t or arrive >= floods_at(k):
                continue
            step = float(length[k]) * (FLOODING_PENALTY if floods_at(k) < math.inf else 1.0)
            if cost + step < best.get(v, math.inf):
                best[v] = cost + step
                arrive_at[v] = arrive
                prev[v] = (u, k)
                heapq.heappush(heap, (cost + step, v))

    def route_to(end, place, end_snap):
        nodes, slack, node = [end], math.inf, end
        while prev[node][0] is not None:
            p, k = prev[node]
            slack = min(slack, floods_at(k) - arrive_at[node])   # how much later we could have crossed k
            nodes.append(p)
            node = p
        walk_h = arrive_at[end] + end_snap / WALK_KMH
        coords = [[round(float(x), 5), round(float(y), 5)] for x, y in r["lonlat"][nodes[::-1]]]
        return {"shelter": place, "distance_km": round(walk_h * WALK_KMH, 2), "walk_h": walk_h,
                "slack_h": slack, "path": [[lon, lat]] + coords + [[place["lon"], place["lat"]]]}

    options = {}
    for cat in ("hospital", "school"):
        if cat in found:
            s, km = shelters[cat][found[cat]]
            options[cat] = route_to(found[cat], s, km)
    if "high_ground" in found:
        elon, elat = r["lonlat"][found["high_ground"]]
        options["high_ground"] = route_to(
            found["high_ground"], {**HIGH_GROUND, "lon": round(float(elon), 6), "lat": round(float(elat), 6)}, 0.0)

    if not options:
        return {"best": None, "options": {}}
    nearest_shelter = min((options[c] for c in ("hospital", "school") if c in options),
                          key=lambda o: o["walk_h"], default=None)
    ground = options.get("high_ground")
    if nearest_shelter and (ground is None or nearest_shelter["walk_h"] <= ground["walk_h"] + SHELTER_DETOUR_H):
        return {"best": nearest_shelter, "options": options}
    return {"best": ground, "options": options}


def safe_route(lon, lat, hydrograph):
    """The recommended route only (see safe_routes)."""
    return safe_routes(lon, lat, hydrograph)["best"]
