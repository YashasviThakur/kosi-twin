"""Download elevation (Copernicus DEM) and population (Meta HRSL) from AWS Open Data
onto one ~90 m grid covering the Kosi region.

Output: data/raw/dem.tif, pop.tif, elderly.tif, children.tif
"""
import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import from_origin
from rasterio.warp import reproject

from config import (DEM_TILES, EAST, HEIGHT, HRSL, NORTH, POP_LAYERS, RAW, RES,
                    SOUTH, WEST, WIDTH)

TRANSFORM = from_origin(WEST, NORTH, RES, RES)
PROFILE = dict(driver="GTiff", width=WIDTH, height=HEIGHT, count=1, crs="EPSG:4326",
               transform=TRANSFORM, dtype="float32", compress="deflate", nodata=np.nan)


def warp(src_path, resampling):
    out = np.full((HEIGHT, WIDTH), np.nan, dtype="float32")
    with rasterio.open(src_path) as src:
        reproject(rasterio.band(src, 1), out, dst_transform=TRANSFORM, dst_crs="EPSG:4326",
                  resampling=resampling, dst_nodata=np.nan)
    return out


def save(name, arr):
    with rasterio.open(RAW / f"{name}.tif", "w", **PROFILE) as dst:
        dst.write(arr, 1)
    print(f"{name}: {np.nanmin(arr):.1f} .. {np.nanmax(arr):.1f}, nan={np.isnan(arr).mean():.1%}")


def main():
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", AWS_NO_SIGN_REQUEST="YES"):
        dem = np.full((HEIGHT, WIDTH), np.nan, dtype="float32")
        for url in DEM_TILES:
            tile = warp(f"/vsicurl/{url}", Resampling.average)
            dem = np.where(np.isnan(dem), tile, dem)
        save("dem", dem)

        for name, layer in POP_LAYERS.items():
            # Sum keeps headcounts correct when merging 30 m cells into 90 m cells.
            pop = warp(f"/vsicurl/{HRSL.format(layer=layer)}", Resampling.sum)
            save(name, np.nan_to_num(pop, nan=0.0))


if __name__ == "__main__":
    main()
