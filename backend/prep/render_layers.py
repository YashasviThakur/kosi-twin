"""Re-render only the flood overlay images from the last build (data/out/hand.tif + flood_stage.tif),
e.g. after changing DEPTH_RAMP — seconds instead of rebuilding the whole model."""
import rasterio

from build_model import STAGES, overlay_tiles
from config import OUT

hand = rasterio.open(OUT / "hand.tif").read(1)
stage = rasterio.open(OUT / "flood_stage.tif").read(1)
layers = OUT / "layers"
for old in layers.glob("flood_*.png"):
    old.unlink()
for h in STAGES[1::2]:
    overlay_tiles(stage, hand, h, layers)
print(f"rendered {len(list(layers.glob('flood_*.png')))} tiles")
