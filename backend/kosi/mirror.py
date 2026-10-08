"""Flood Mirror: paint predicted floodwater onto a street photo at the right height.

Scale comes from a reference object of known height (door/person box from Rekognition in step 2,
or two taps by the user). This module does the geometry, the inpainting mask for Bedrock, and a
no-AI fallback render, and always burns in the "AI SIMULATION" watermark.
"""
import io
import os
from datetime import datetime

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

REFERENCE_HEIGHTS_M = {"door": 2.1, "person": 1.6, "motorcycle": 1.1}
WATER_RGB = np.array([96, 78, 52], dtype="float32")     # murky brown monsoon water
FONT_PATHS = [os.path.join(os.path.dirname(__file__), "fonts", "NotoSansDevanagari-Bold.ttf"),
              "C:/Windows/Fonts/Nirmala.ttc"]


def waterline_y(ground_y, top_y, ref_height_m, depth_m):
    """Pixel row of the water surface, given a reference object standing on the ground."""
    px_per_m = (ground_y - top_y) / ref_height_m
    if px_per_m <= 0:
        raise ValueError("reference top must be above its base")
    return int(round(ground_y - depth_m * px_per_m))


def mask_png(size, line_y):
    """White below the waterline = area to repaint (Bedrock inpaint mask)."""
    w, h = size
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rectangle([0, max(line_y, 0), w, h], fill=255)
    buf = io.BytesIO()
    m.save(buf, "PNG")
    return buf.getvalue()


def _fallback_water(img, line_y):
    a = np.asarray(img, dtype="float32")
    h, w, _ = a.shape
    y0 = int(np.clip(line_y, 0, h))
    if y0 >= h:
        return img
    below = a[y0:]
    rows = below.shape[0]

    # Reflection of what stands above the waterline, faded.
    above = a[max(y0 - rows, 0):y0][::-1]
    refl = np.zeros_like(below)
    refl[:above.shape[0]] = above

    # Horizontal ripples: noise stretched sideways, brighter near the surface.
    rng = np.random.default_rng(7)
    noise = Image.fromarray((rng.random((rows, w // 8 + 1)) * 255).astype("uint8")).resize((w, rows))
    noise = np.asarray(noise.filter(ImageFilter.GaussianBlur(2)), dtype="float32")[..., None] / 255.0

    water = WATER_RGB * (0.85 + 0.3 * noise)
    out = 0.62 * water + 0.18 * refl + 0.20 * below
    a[y0:] = out
    # Thin light edge where water meets walls.
    a[y0:y0 + 2] = a[y0:y0 + 2] * 0.5 + 200 * 0.5
    return Image.fromarray(np.clip(a, 0, 255).astype("uint8"))


def watermark(img, label):
    img = img.convert("RGB")
    d = ImageDraw.Draw(img)
    w, h = img.size
    size = max(14, w // 40)
    font = next((ImageFont.truetype(p, size) for p in FONT_PATHS if os.path.exists(p)), ImageFont.load_default())
    text = f"AI SIMULATION · AI अनुमान · {label} · {datetime.now():%d %b %Y}"
    box = d.textbbox((0, 0), text, font=font)
    pad = size // 2
    d.rectangle([0, h - (box[3] - box[1]) - 2 * pad, w, h], fill=(0, 0, 0))
    d.text((pad, h - (box[3] - box[1]) - pad - box[1]), text, font=font, fill=(255, 220, 0))
    return img


def render_fallback(photo_bytes, depth_m, ground_y, top_y, ref_height_m, label):
    img = Image.open(io.BytesIO(photo_bytes)).convert("RGB")
    line = waterline_y(ground_y, top_y, ref_height_m, depth_m)
    out = watermark(_fallback_water(img, line), label)
    buf = io.BytesIO()
    out.save(buf, "JPEG", quality=88)
    return buf.getvalue(), line
