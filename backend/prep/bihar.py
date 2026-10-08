"""Bihar state outline from OSM (fetched into data/raw/osm_bihar.json).

Writes:
  data/out/bihar.geojson                    Bihar polygon, used by build_model.py to keep the model Bihar-only
  frontend/public/bihar-mask.geojson        the world minus Bihar, which the map dims
  frontend/public/districts.geojson         district boundaries (each shared border once)
  frontend/public/district-labels.geojson   one point per district with English and Hindi names
  frontend/public/kosi.geojson              the main Kosi channel, drawn as a dark line over the flood
"""
import json

from shapely.geometry import LineString, MultiLineString, box, mapping
from shapely.ops import linemerge, polygonize, unary_union

from config import OUT, RAW

FRONTEND_PUBLIC = RAW.parent.parent.parent / "frontend" / "public"


def bihar_polygon():
    rel = json.loads((RAW / "osm_bihar.json").read_text())[0]
    outer = [LineString([(p["lon"], p["lat"]) for p in m["geometry"]])
             for m in rel["members"] if m["type"] == "way" and m.get("role") in ("outer", "") and len(m.get("geometry", [])) > 1]
    polys = list(polygonize(unary_union(outer)))
    return unary_union(polys).simplify(0.001)          # ~100 m — plenty for a state outline


def write_public(name, geojson):
    (FRONTEND_PUBLIC / name).write_text(json.dumps(geojson, ensure_ascii=False), encoding="utf-8")


def districts():
    rels = json.loads((RAW / "osm_districts.json").read_text())
    ways, labels = {}, []
    for rel in rels:
        rings = []
        for m in rel["members"]:
            if m["type"] == "way" and len(m.get("geometry", [])) > 1:
                line = LineString([(p["lon"], p["lat"]) for p in m["geometry"]])
                ways[m["ref"]] = line                              # shared borders appear once
                rings.append(line)
        poly = unary_union(list(polygonize(unary_union(rings))))
        if poly.is_empty:
            continue
        pt = poly.representative_point()                           # inside the district, unlike a centroid
        name = rel["tags"].get("name:en", rel["tags"].get("name", "")).replace(" District", "")
        labels.append({"type": "Feature", "properties": {"name": name, "name_hi": rel["tags"].get("name:hi")},
                       "geometry": {"type": "Point", "coordinates": [round(pt.x, 4), round(pt.y, 4)]}})
    lines = linemerge(MultiLineString(list(ways.values()))).simplify(0.001)
    write_public("districts.geojson", {"type": "Feature", "properties": {}, "geometry": mapping(lines)})
    write_public("district-labels.geojson", {"type": "FeatureCollection", "features": labels})
    return len(labels)


def kosi_channel():
    from build_model import MAIN_KOSI
    ways = [e for e in json.loads((RAW / "osm_kosi.json").read_text()) if e["tags"].get("name", "").lower() in MAIN_KOSI]
    lines = MultiLineString([[(p["lon"], p["lat"]) for p in e["geometry"]] for e in ways]).simplify(0.0005)
    write_public("kosi.geojson", {"type": "Feature", "properties": {}, "geometry": mapping(lines)})


if __name__ == "__main__":
    print(f"districts: {districts()}")
    kosi_channel()
    bihar = bihar_polygon()
    (OUT / "bihar.geojson").write_text(json.dumps({"type": "Feature", "properties": {"name": "Bihar"},
                                                   "geometry": mapping(bihar)}))
    mask = box(60, 5, 110, 40).difference(bihar.simplify(0.005))
    (FRONTEND_PUBLIC / "bihar-mask.geojson").write_text(json.dumps({"type": "Feature", "properties": {},
                                                                    "geometry": mapping(mask)}))
    print(f"Bihar: area {bihar.area:.2f} deg², bounds {[round(b, 2) for b in bihar.bounds]}, "
          f"mask {len(json.dumps(mapping(mask))) // 1024} KB")
