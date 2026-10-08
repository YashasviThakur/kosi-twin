"""Shared settings for the offline data-prep scripts."""
import os
from pathlib import Path

# Kosi region in Bihar: Birpur barrage (north) down to the Ganga confluence near Kursela (south).
WEST, SOUTH, EAST, NORTH = 86.2, 25.3, 87.5, 26.6

# Analysis grid in arc-seconds: 1 (~30 m, the DEM's native resolution) by default, 3 (~90 m) for quick runs.
ARCSEC = float(os.environ.get("KOSI_RES_ARCSEC", "1"))
RES = ARCSEC / 3600
WIDTH = round((EAST - WEST) / RES)
HEIGHT = round((NORTH - SOUTH) / RES)

DATA = Path(__file__).resolve().parent.parent / "data"
RAW = DATA / "raw"
OUT = DATA / "out"
for d in (RAW, OUT):
    d.mkdir(parents=True, exist_ok=True)

DEM_TILES = [
    f"https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_{lat}_00_{lon}_00_DEM/"
    f"Copernicus_DSM_COG_10_{lat}_00_{lon}_00_DEM.tif"
    for lat in ("N25", "N26")
    for lon in ("E086", "E087")
]

HRSL = "https://dataforgood-fb-data.s3.amazonaws.com/hrsl-cogs/{layer}/{layer}-latest.vrt"
POP_LAYERS = {
    "pop": "hrsl_general",
    "elderly": "hrsl_elderly_60_plus",
    "children": "hrsl_children_under_five",
}

# Birpur (Kosi) barrage — distances downstream are measured from here.
BIRPUR = (87.0, 26.53)  # lon, lat
