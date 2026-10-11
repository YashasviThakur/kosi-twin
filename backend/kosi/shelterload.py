"""Where would everyone go? For a river level, the destination each flooded village's card recommends, added up by place.

This is demand only. The shelter data (OpenStreetMap) has no capacities, so this shows how many people the plan sends to each place,
not whether the place can hold them. Villages with no dry road to anywhere are counted separately: they need boats.

Routing costs about 0.1 s per village, so a result is cached per gauge step (0.05 lakh cusecs) and only worked out when asked for.
"""
from functools import lru_cache

from . import hydro, store
from .village import affected, card

TOP = 12                  # destinations returned, biggest first
VILLAGES_SHOWN = 4        # village names listed per destination

NOTE = ("Demand only: each village's people are counted at the place its card recommends. Villages where the water only reaches the "
        "outskirts are not counted. Capacities of schools, hospitals and roads are not in our data, so this cannot say whether a place has room.")


@lru_cache(maxsize=64)
def _load(step: int):
    discharge = step / 20
    h = hydro.Hydrograph.constant(discharge)
    vs = store.villages()
    places: dict[tuple, dict] = {}
    boat = {"people": 0, "villages": 0}
    for row in affected(h):
        if row["depth_m"] <= 0:                 # the water reaches only the outskirts: nobody has to leave
            continue
        c = card(row["id"], h)
        pop = vs[row["id"]]["pop"]
        if c is None or c.get("needs_boat") or not c.get("route"):
            boat["people"] += pop
            boat["villages"] += 1
            continue
        s = c["route"]["shelter"]
        key = (s["name"], round(s["lon"], 5), round(s["lat"], 5))
        p = places.setdefault(key, {"name": s["name"], "name_hi": s["name_hi"], "kind": s["kind"], "lon": s["lon"], "lat": s["lat"],
                                    "people": 0, "villages": 0, "from": []})
        p["people"] += pop
        p["villages"] += 1
        p["from"].append((pop, c["name"]))
    dests = sorted(places.values(), key=lambda p: -p["people"])
    for p in dests:
        p["from"] = [n for _, n in sorted(p["from"], reverse=True)[:VILLAGES_SHOWN]]
    moved = sum(p["people"] for p in dests)
    return {"discharge_lakh": discharge, "people_to_move": moved + boat["people"], "people_by_road": moved,
            "boat": boat, "destinations": dests[:TOP], "destination_count": len(dests), "note": NOTE}


def shelter_load(discharge_lakh: float):
    return _load(round(discharge_lakh * 20))
