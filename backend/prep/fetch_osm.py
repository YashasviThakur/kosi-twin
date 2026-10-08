"""Fetch vector layers for the Kosi region from OpenStreetMap (Overpass API).

Output: data/raw/osm_<layer>.json  (raw Overpass elements with geometry)
"""
import json
import time

import requests

from config import EAST, NORTH, RAW, SOUTH, WEST

OVERPASS = "https://overpass-api.de/api/interpreter"
BBOX = f"{SOUTH},{WEST},{NORTH},{EAST}"

QUERIES = {
    "places": f'node["place"~"^(village|hamlet|town|city)$"]({BBOX});',
    "kosi": f'way["waterway"="river"]["name"~"Kosi|Koshi|कोसी",i]({BBOX});',
    "embankments": f'(way["man_made"="dyke"]({BBOX});way["embankment"="yes"]["highway"!~"."]({BBOX}););',
    "roads": f'way["highway"~"^(trunk|primary|secondary|tertiary|unclassified)$"]({BBOX});',
    # Bihar uses schools and health centres as flood shelters / relief camps.
    "shelters": f'(node["amenity"~"^(school|hospital|clinic|college)$"]({BBOX});'
                f'way["amenity"~"^(school|hospital|clinic|college)$"]({BBOX}););',
}


def fetch(name, body):
    query = f"[out:json][timeout:180];{body}out geom;"
    if (RAW / f"osm_{name}.json").exists():
        print(f"{name}: cached")
        return
    for attempt in range(4):
        try:
            r = requests.post(OVERPASS, data={"data": query}, timeout=240,
                              headers={"User-Agent": "kosi-twin-hackathon/0.1"})
        except requests.RequestException as e:
            print(f"{name}: {type(e).__name__}, retrying")
            time.sleep(15 * (attempt + 1))
            continue
        if r.status_code == 200:
            elements = r.json()["elements"]
            (RAW / f"osm_{name}.json").write_text(json.dumps(elements))
            print(f"{name}: {len(elements)} elements")
            return
        print(f"{name}: HTTP {r.status_code}, retrying")
        time.sleep(15 * (attempt + 1))
    raise RuntimeError(f"Overpass failed for {name}")


if __name__ == "__main__":
    for name, body in QUERIES.items():
        fetch(name, body)
