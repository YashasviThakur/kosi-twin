"""Build the Kosi Twin flood model from the raw rasters + OSM layers.

Method (HAND-style, see README):
  1. Rasterize the main Kosi channel; measure distance along it from Birpur barrage (chainage).
  2. River water-surface profile = low percentile of DEM along the channel, forced to only fall downstream.
  3. HAND = ground height above the nearest river cell.
  4. For every rise h (0.25 m steps), flooded = HAND <= h AND connected to the river.
     The first h at which a cell floods is stored as `flood_stage` — one raster drives every scenario.
  5. Precompute per-stage stats, village table, shelters, road graph, and map overlays.

Optional: data/raw/embankments.geojson (hand-traced LineStrings) — raised as 5 m walls.
"""
import heapq
import json

import numpy as np
import rasterio
from PIL import Image
from rasterio.features import rasterize
from pysheds.grid import Grid
from scipy import ndimage

from config import BIRPUR, NORTH, OUT, RAW, RES, WEST

if not hasattr(np, "in1d"):  # pysheds still calls np.in1d, removed in NumPy 2.x
    np.in1d = np.isin

STAGES = np.round(np.arange(0.25, 10.01, 0.25), 2)   # rise above normal river level, metres
CELL_KM = RES * 111.0 * np.cos(np.radians(26.0))      # ~0.083 km east-west; north-south is ~0.0925
CELL_AREA_KM2 = RES * 111.0 * CELL_KM
MAIN_KOSI = {"koshi river", "kosi river", "koshi"}


def read(name):
    with rasterio.open(RAW / f"{name}.tif") as src:
        return src.read(1), src.profile


def to_rc(lon, lat):
    return int((NORTH - lat) / RES), int((lon - WEST) / RES)


def line_geoms(elements):
    return [{"type": "LineString", "coordinates": [(p["lon"], p["lat"]) for p in e["geometry"]]}
            for e in elements if len(e.get("geometry", [])) > 1]


def river_mask(shape, transform):
    kosi = json.loads((RAW / "osm_kosi.json").read_text())
    main = [e for e in kosi if e["tags"].get("name", "").lower() in MAIN_KOSI]
    mask = rasterize(line_geoms(main), out_shape=shape, transform=transform, all_touched=True) > 0
    mask = ndimage.binary_dilation(mask, iterations=2)          # close gaps between OSM ways
    labels, n = ndimage.label(mask, structure=np.ones((3, 3)))
    sizes = ndimage.sum(mask, labels, range(1, n + 1))
    return labels == (np.argmax(sizes) + 1)                     # keep the main connected channel


def chainage(river):
    """Distance (km) along the river from Birpur barrage, via Dijkstra over river cells."""
    rr, cc = np.nonzero(river)
    br, bc = to_rc(*BIRPUR)
    start = np.argmin((rr - br) ** 2 + (cc - bc) ** 2)
    dist = np.full(river.shape, np.inf)
    dist[rr[start], cc[start]] = 0.0
    heap = [(0.0, rr[start], cc[start])]
    steps = [(dr, dc, np.hypot(dr * 0.0925, dc * CELL_KM)) for dr in (-1, 0, 1) for dc in (-1, 0, 1) if dr or dc]
    while heap:
        d, r, c = heapq.heappop(heap)
        if d > dist[r, c]:
            continue
        for dr, dc, w in steps:
            nr, nc = r + dr, c + dc
            if 0 <= nr < river.shape[0] and 0 <= nc < river.shape[1] and river[nr, nc] and d + w < dist[nr, nc]:
                dist[nr, nc] = d + w
                heapq.heappush(heap, (d + w, nr, nc))
    return dist


def river_profile(dem, river, chain):
    """Water-surface elevation per 1 km of chainage: 20th percentile, non-increasing downstream, smoothed."""
    downstream = river & (chain < np.inf)
    km = chain[downstream].astype(int)
    elev = dem[downstream]
    n = km.max() + 1
    prof = np.array([np.percentile(elev[km == k], 20) if np.any(km == k) else np.nan for k in range(n)])
    idx = np.arange(n)
    good = ~np.isnan(prof)
    prof = np.interp(idx, idx[good], prof[good])
    prof = np.minimum.accumulate(prof)                          # water never flows uphill
    prof = ndimage.uniform_filter1d(prof, 5, mode="nearest")
    return prof


def local_water_level(dem, river, size=25):
    """Water surface per river cell = mean DEM of river cells within ~2 km, with sandbars/trees
    (cells > 2 m above that mean) dropped and the mean recomputed. Local, so side channels get their own level."""
    w = river.astype("float32")
    for _ in range(2):
        mean = ndimage.uniform_filter(np.where(w > 0, dem, 0), size) / np.maximum(ndimage.uniform_filter(w, size), 1e-6)
        w = (river & (dem <= mean + 2.0)).astype("float32")
    return np.where(river, mean, np.nan)


def flow_hand(dem, river, transform, crs):
    """HAND along D8 flow paths: each cell is compared with the Kosi cell it actually drains into.
    River cells use the smoothed local water level instead of the raw (sandbar-noisy) DEM.
    Cells that drain to other rivers come back NaN and never flood in this Kosi-only model."""
    from pysheds.sview import Raster, ViewFinder

    vf = ViewFinder(affine=transform, shape=dem.shape, crs=crs, nodata=np.nan)
    grid = Grid(viewfinder=vf)
    surface = np.where(river, local_water_level(dem, river), dem).astype("float64")
    raster = Raster(surface, viewfinder=vf)
    conditioned = grid.resolve_flats(grid.fill_depressions(grid.fill_pits(raster)))
    fdir = grid.flowdir(conditioned)
    mask = Raster(river, viewfinder=ViewFinder(affine=transform, shape=dem.shape, crs=crs, nodata=False))
    hand = np.asarray(grid.compute_hand(fdir, raster, mask, nodata_out=np.nan), dtype="float32")
    drain = np.asarray(grid.compute_hand(fdir, raster, mask, return_index=True, nodata_out=-1), dtype="int64")
    return np.maximum(hand, 0), drain


def flood_stage(hand, river):
    stage = np.full(hand.shape, np.nan, dtype="float32")
    for h in STAGES:
        wet = hand <= h
        labels, _ = ndimage.label(wet)
        keep = np.unique(labels[river & wet])
        connected = np.isin(labels, keep[keep > 0])
        stage[connected & np.isnan(stage)] = h
    stage[river] = 0.0
    return stage


def overlay_png(stage, hand, h, path):
    wet = stage <= h
    depth = np.where(wet, h - hand, 0)
    rgba = np.zeros(stage.shape + (4,), dtype=np.uint8)
    t = np.clip(depth / 4.0, 0, 1)                              # 0 -> light blue, 4 m+ -> deep blue
    rgba[..., 0] = (120 * (1 - t) + 10 * t).astype(np.uint8)
    rgba[..., 1] = (190 * (1 - t) + 60 * t).astype(np.uint8)
    rgba[..., 2] = (255 * (1 - t) + 160 * t).astype(np.uint8)
    rgba[..., 3] = np.where(wet, 150 + 80 * t, 0).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(path, optimize=True)


def window_sum(arr, r, c, radius):
    return float(arr[max(r - radius, 0):r + radius + 1, max(c - radius, 0):c + radius + 1].sum())


def main():
    dem, profile = read("dem")
    pop, _ = read("pop")
    elderly, _ = read("elderly")
    children, _ = read("children")
    transform = profile["transform"]

    emb_path = RAW / "embankments.geojson"
    if emb_path.exists():
        feats = json.loads(emb_path.read_text())["features"]
        walls = rasterize([f["geometry"] for f in feats], out_shape=dem.shape, transform=transform, all_touched=True) > 0
        dem = np.where(walls, dem + 5.0, dem)
        print(f"embankments: {len(feats)} lines applied")
    else:
        print("embankments: none (data/raw/embankments.geojson not found)")

    river = river_mask(dem.shape, transform)
    chain = chainage(river)
    prof = river_profile(dem, river, chain)
    print(f"river: {river.sum()} cells, {len(prof)} km long, water surface {prof[0]:.1f} m -> {prof[-1]:.1f} m")

    hand, drain = flow_hand(dem, river, transform, profile["crs"])
    ir, ic = np.unravel_index(np.where(drain >= 0, drain, 0), dem.shape)
    rows, cols = np.indices(dem.shape)
    near_chain = np.where(drain >= 0, chain[ir, ic], np.nan)
    dist_km = np.where(drain >= 0, np.hypot((rows - ir) * 0.0925, (cols - ic) * CELL_KM), np.nan).astype("float32")
    print(f"HAND: {np.isfinite(hand).mean():.0%} of the region drains to the Kosi")

    stage = flood_stage(hand, river)

    out_profile = {**profile, "dtype": "float32", "nodata": np.nan}
    for name, arr in (("hand", hand), ("flood_stage", stage), ("dist_river_km", dist_km),
                      ("chainage_km", near_chain.astype("float32"))):
        with rasterio.open(OUT / f"{name}.tif", "w", **out_profile) as dst:
            dst.write(arr, 1)

    # Per-stage stats (people from the population raster, so totals don't depend on OSM village coverage).
    places = json.loads((RAW / "osm_places.json").read_text())
    shelters_raw = json.loads((RAW / "osm_shelters.json").read_text())
    roads = json.loads((RAW / "osm_roads.json").read_text())

    def cell_of(lon, lat):
        r, c = to_rc(lon, lat)
        return (r, c) if 0 <= r < dem.shape[0] and 0 <= c < dem.shape[1] else None

    villages = []
    for e in places:
        rc = cell_of(e["lon"], e["lat"])
        name = e["tags"].get("name:en") or e["tags"].get("name")
        if not rc or not name:
            continue
        r, c = rc
        r0, c0 = max(r - 3, 0), max(c - 3, 0)
        local = stage[r0:r + 4, c0:c + 4]                                   # ~600 m around the village point
        # Reference cell for depth/timing: the village point if it drains to the Kosi,
        # otherwise the first cell around it that the Kosi floods (village edge gets wet first).
        if np.isfinite(hand[r, c]):
            rr, rc_ = r, c
        elif not np.all(np.isnan(local)):
            lr, lc = np.unravel_index(np.nanargmin(local), local.shape)
            rr, rc_ = r0 + lr, c0 + lc
        else:
            rr = rc_ = None
        ref_ok = rr is not None
        villages.append({
            "id": e["id"], "name": name, "name_hi": e["tags"].get("name:hi"),
            "type": e["tags"]["place"], "lon": e["lon"], "lat": e["lat"],
            "ground_m": round(float(dem[r, c]), 1),
            "hand_m": round(float(hand[rr, rc_]), 2) if ref_ok else None,
            "flood_stage_m": None if np.isnan(stage[r, c]) else float(stage[r, c]),
            "first_wet_stage_m": None if np.all(np.isnan(local)) else float(np.nanmin(local)),
            "chainage_km": round(float(near_chain[rr, rc_]), 1) if ref_ok else None,
            "dist_river_km": round(float(dist_km[rr, rc_]), 2) if ref_ok else None,
            "pop": round(window_sum(pop, r, c, 6)),                           # ~1 km radius
            "elderly": round(window_sum(elderly, r, c, 6)),
            "children": round(window_sum(children, r, c, 6)),
        })

    shelters = []
    for e in shelters_raw:
        lon, lat = (e["lon"], e["lat"]) if e["type"] == "node" else (
            np.mean([p["lon"] for p in e["geometry"]]), np.mean([p["lat"] for p in e["geometry"]]))
        rc = cell_of(lon, lat)
        if not rc:
            continue
        shelters.append({"id": e["id"], "name": e["tags"].get("name", e["tags"]["amenity"].title()),
                         "kind": e["tags"]["amenity"], "lon": round(float(lon), 6), "lat": round(float(lat), 6),
                         "flood_stage_m": None if np.isnan(stage[rc]) else float(stage[rc])})

    # Road graph: nodes are OSM vertices, each edge carries the lowest rise that cuts it.
    nodes, edges = {}, []
    road_len_by_stage = np.zeros(len(STAGES))
    for e in roads:
        geom = e.get("geometry", [])
        ids = e.get("nodes", [])
        for (a, pa), (b, pb) in zip(zip(ids, geom), zip(ids[1:], geom[1:])):
            ra, rb = cell_of(pa["lon"], pa["lat"]), cell_of(pb["lon"], pb["lat"])
            if not ra or not rb:
                continue
            ia = nodes.setdefault(a, (len(nodes), pa["lon"], pa["lat"]))[0]
            ib = nodes.setdefault(b, (len(nodes), pb["lon"], pb["lat"]))[0]
            cut = np.nanmin([stage[ra], stage[rb]]) if not (np.isnan(stage[ra]) and np.isnan(stage[rb])) else None
            length = float(np.hypot((pa["lon"] - pb["lon"]) * 100.0, (pa["lat"] - pb["lat"]) * 111.0))
            # Timing comes from the endpoint that floods first (where the cut happens).
            wet_end = ra if cut is not None and stage[ra] == cut else rb
            edges.append((ia, ib, length, np.nan if cut is None else cut,
                          near_chain[wet_end] if cut is not None else np.nan,
                          dist_km[wet_end] if cut is not None else np.nan))
            if cut is not None:
                road_len_by_stage[STAGES >= cut] += length

    stats = []
    for i, h in enumerate(STAGES):
        wet = stage <= h
        stats.append({
            "rise_m": float(h),
            "area_km2": round(float(wet.sum() * CELL_AREA_KM2), 1),
            "people": round(float(pop[wet].sum())),
            "elderly": round(float(elderly[wet].sum())),
            "children": round(float(children[wet].sum())),
            "villages": sum(1 for v in villages if v["first_wet_stage_m"] is not None and v["first_wet_stage_m"] <= h),
            "road_km_cut": round(float(road_len_by_stage[i]), 1),
            "shelters_flooded": sum(1 for s in shelters if s["flood_stage_m"] is not None and s["flood_stage_m"] <= h),
        })

    layers = OUT / "layers"
    layers.mkdir(exist_ok=True)
    for h in STAGES[1::2]:                                              # every 0.5 m
        overlay_png(stage, hand, h, layers / f"flood_{h:.1f}.png")

    write = lambda name, obj: (OUT / name).write_text(json.dumps(obj, ensure_ascii=False), encoding="utf-8")
    write("villages.json", villages)
    write("shelters.json", shelters)
    write("stage_stats.json", stats)
    write("river_profile.json", {"km": list(range(len(prof))), "water_surface_m": [round(float(x), 2) for x in prof]})
    lonlat = np.array([(lon, lat) for _, lon, lat in sorted(nodes.values())], dtype="float64")
    e = np.array(edges, dtype="float64")
    np.savez_compressed(OUT / "roads.npz", lonlat=lonlat, edges=e[:, :2].astype("int32"),
                        length_km=e[:, 2].astype("float32"), cut_stage_m=e[:, 3].astype("float32"),
                        chainage_km=e[:, 4].astype("float32"), dist_river_km=e[:, 5].astype("float32"))
    write("grid.json", {"west": WEST, "north": NORTH, "res": RES, "width": dem.shape[1], "height": dem.shape[0],
                        "bounds": [WEST, NORTH - RES * dem.shape[0], WEST + RES * dem.shape[1], NORTH]})

    print(f"villages: {len(villages)}, shelters: {len(shelters)}, road nodes: {len(nodes)}, edges: {len(edges)}")
    for s in stats[1::4]:
        print(s)


if __name__ == "__main__":
    main()
