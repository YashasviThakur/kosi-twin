"""Render flood overlays at a few water levels side by side, for eyeballing the model.

Usage: python preview.py OUT.png [rise ...]
"""
import sys

import numpy as np
import rasterio
from PIL import Image, ImageDraw

from config import OUT, RAW

path = sys.argv[1]
rises = [float(x) for x in sys.argv[2:]] or [1.0, 2.5, 5.0]

dem = rasterio.open(RAW / "dem.tif").read(1)
shade = np.clip((dem - 20) / 80, 0, 1)
base = Image.fromarray((np.stack([shade] * 3, -1) * 180 + 50).astype("uint8")).convert("RGBA")

tiles = []
for h in rises:
    tile = Image.alpha_composite(base, Image.open(OUT / "layers" / f"flood_{h:.1f}.png")).convert("RGB").resize((520, 520))
    ImageDraw.Draw(tile).text((10, 10), f"+{h} m", fill=(255, 255, 0))
    tiles.append(tile)
sheet = Image.new("RGB", (520 * len(tiles), 520))
for i, tile in enumerate(tiles):
    sheet.paste(tile, (520 * i, 0))
sheet.save(path)
