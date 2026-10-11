"""Shrink the flood overlay tiles (backend/data/out/layers/flood_*.png) for the web.

build_model.py draws each tile at the DEM resolution (2340 x 2340). One flood level is four tiles, about 88 MB of GPU textures, and the
browser swaps all four every time the gauge crosses a level, which made the map stall and, on weak devices, crash the tab. This
resamples every tile to WIDTH pixels (default 1560, about 40 MB per level) and re-applies the same 64-colour palette.

The full-size originals are copied once to data/out/layers_full/ (not deployed). Run again to change the size; it always starts from the
originals. Usage: python shrink_layers.py [width]
"""
import gc
import shutil
import sys
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parents[1] / "data" / "out"
LAYERS, FULL = OUT / "layers", OUT / "layers_full"


def main(width: int) -> None:
    if not FULL.exists():
        shutil.copytree(LAYERS, FULL)
    before = after = 0
    for src in sorted(FULL.glob("flood_*.png")):
        dst = LAYERS / src.name
        im = Image.open(src).convert("RGBA")
        if im.width > width:
            im = im.resize((width, round(im.height * width / im.width)), Image.Resampling.LANCZOS)
        im.quantize(colors=64, method=Image.Quantize.FASTOCTREE).save(dst, optimize=True)
        before += src.stat().st_size
        after += dst.stat().st_size
        del im
        gc.collect()          # one tile at a time: the machine this was written on was short of memory
    print(f"{width}px: {before / 1e6:.1f} MB -> {after / 1e6:.1f} MB")


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 1560)
