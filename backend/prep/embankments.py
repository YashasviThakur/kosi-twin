"""Rank mapped dyke stretches by how many people live on low ground close behind them.

For each ~1 km stretch of OSM man_made=dyke inside Bihar: people (HRSL population) within RADIUS_KM whose
ground is no higher than PEAK_RISE_M above the Kosi's water level (HAND, from build_model.py). That is
EXPOSURE — who is at stake if this stretch fails — not a breach simulation. Railway embankments are
excluded (they are not flood defences), and OSM covers only part of the real embankment system.

Writes frontend/public/embankments.geojson (LineString per stretch: people, rank, km).
Run after build_model.py.
"""
import json

import numpy as np
import rasterio
from shapely.geometry import LineString, shape
from shapely.ops import substring

from config import NORTH, OUT, RAW, RES, WEST

RADIUS_KM = 3.0
PEAK_RISE_M = 5.0          # ~ the Sept 2024 peak in the rating curve
STRETCH_KM = 1.0
FRONTEND_PUBLIC = RAW.parent.parent.parent / "frontend" / "public"


def stretches(bihar):
    out = []
    for e in json.loads((RAW / "osm_embankments.json").read_text()):
        geom = e.get("geometry", [])
        if e.get("tags", {}).get("man_made") != "dyke" or len(geom) < 2:
            continue
        line = LineString([(p["lon"], p["lat"]) for p in geom])
        line = line.intersection(bihar)
        if line.is_empty or line.geom_type != "LineString":      # skip multi-part clips at the border
            continue
        km = line.length * 111.0
        n = max(1, round(km / STRETCH_KM))
        for i in range(n):
            part = substring(line, i / n * line.length, (i + 1) / n * line.length)
            if part.length > 0:
                out.append(part)
    return out


def main():
    bihar = shape(json.loads((OUT / "bihar.geojson").read_text())["geometry"])
    with rasterio.open(RAW / "pop.tif") as src:
        pop = src.read(1)
    with rasterio.open(OUT / "hand.tif") as src:
        hand = src.read(1)
    low = np.where(np.isfinite(hand) & (hand <= PEAK_RISE_M), pop, 0.0)

    r_cells = int(RADIUS_KM / (RES * 111.0)) + 1
    yy, xx = np.mgrid[-r_cells:r_cells + 1, -r_cells:r_cells + 1]
    disc = (yy ** 2 + xx ** 2) <= r_cells ** 2

    feats = []
    for part in stretches(bihar):
        mid = part.interpolate(0.5, normalized=True)
        r, c = int((NORTH - mid.y) / RES), int((mid.x - WEST) / RES)
        if not (r_cells <= r < low.shape[0] - r_cells and r_cells <= c < low.shape[1] - r_cells):
            continue
        window = low[r - r_cells:r + r_cells + 1, c - r_cells:c + r_cells + 1]
        people = int(round(float(window[disc].sum()), -2))        # nearest hundred: this is an estimate
        feats.append({"type": "Feature", "properties": {"people": people, "km": round(part.length * 111.0, 2)},
                      "geometry": {"type": "LineString", "coordinates": [[round(x, 5), round(y, 5)] for x, y in part.coords]}})

    feats.sort(key=lambda f: -f["properties"]["people"])
    for rank, f in enumerate(feats, 1):
        f["properties"]["rank"] = rank
    (FRONTEND_PUBLIC / "embankments.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": feats}), encoding="utf-8")

    total_km = sum(f["properties"]["km"] for f in feats)
    print(f"{len(feats)} stretches, {total_km:.0f} km of mapped dykes")
    for f in feats[:5]:
        print(f"  #{f['properties']['rank']}: ~{f['properties']['people']:,} people within {RADIUS_KM:.0f} km on low ground")


if __name__ == "__main__":
    main()
