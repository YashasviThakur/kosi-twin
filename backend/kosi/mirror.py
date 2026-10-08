"""Flood Mirror: paint predicted floodwater onto a street photo at the right height.

Pipeline: fix phone rotation -> blur faces (Rekognition) -> find scale from a door/person/motorbike
(Rekognition) or the user's two taps -> paint water below the waterline (Bedrock inpainting, or a
local fallback) -> paste the original back above the waterline so the AI can't move it -> watermark.
Photos are processed in memory and never stored.
"""
import base64
import io
import json
import os
from datetime import datetime

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

from . import cloud

REFERENCE_HEIGHTS_M = {"Door": 2.1, "Person": 1.6, "Motorcycle": 1.1}
WATER_RGB = np.array([96, 78, 52], dtype="float32")     # murky brown monsoon water
MAX_SIDE = 1600
FONT_PATHS = [os.path.join(os.path.dirname(__file__), "fonts", "NotoSansDevanagari-Bold.ttf"),
              "C:/Windows/Fonts/Nirmala.ttc"]
PROMPT = ("realistic muddy brown monsoon floodwater filling the street, calm water surface with small ripples, "
          "reflections of the walls, a little floating debris, overcast daylight, photorealistic photo")
NEGATIVE = "cartoon, painting, people swimming, boats, text, watermark, blue clear water"


def load_photo(photo_bytes):
    img = ImageOps.exif_transpose(Image.open(io.BytesIO(photo_bytes))).convert("RGB")
    img.thumbnail((MAX_SIDE, MAX_SIDE))
    return img


def _jpeg(img, quality=90):
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=quality)
    return buf.getvalue()


def waterline_y(ground_y, top_y, ref_height_m, depth_m):
    """Pixel row of the water surface, given a reference object standing on the ground."""
    px_per_m = (ground_y - top_y) / ref_height_m
    if px_per_m <= 0:
        raise ValueError("reference top must be above its base")
    return int(round(ground_y - depth_m * px_per_m))


def detect_reference(img):
    """Largest door / person / motorbike Rekognition finds, as {kind, ground_y, top_y, ref_height_m, box}."""
    if not cloud.ENABLED:
        return None
    try:
        labels = cloud.client("rekognition").detect_labels(Image={"Bytes": _jpeg(img)}, MaxLabels=50, MinConfidence=60)["Labels"]
    except Exception:
        return None
    w, h = img.size
    for kind in REFERENCE_HEIGHTS_M:                       # dict order = preference: door, person, motorbike
        boxes = [i["BoundingBox"] for l in labels if l["Name"] == kind for i in l.get("Instances", [])]
        if boxes:
            b = max(boxes, key=lambda b: b["Height"])
            top, bottom = b["Top"] * h, (b["Top"] + b["Height"]) * h
            return {"kind": kind.lower(), "ground_y": round(bottom), "top_y": round(top),
                    "ref_height_m": REFERENCE_HEIGHTS_M[kind],
                    "box": [round(b["Left"] * w), round(top), round((b["Left"] + b["Width"]) * w), round(bottom)]}
    return None


def blur_faces(img):
    if not cloud.ENABLED:
        return img, 0
    try:
        faces = cloud.client("rekognition").detect_faces(Image={"Bytes": _jpeg(img)})["FaceDetails"]
    except Exception:
        return img, 0
    w, h = img.size
    for f in faces:
        b = f["BoundingBox"]
        box = tuple(int(v) for v in (b["Left"] * w, b["Top"] * h, (b["Left"] + b["Width"]) * w, (b["Top"] + b["Height"]) * h))
        img.paste(img.crop(box).filter(ImageFilter.GaussianBlur(max(8, (box[2] - box[0]) // 6))), box)
    return img, len(faces)


def _inpaint_bedrock(img, line_y):
    """Water painted by Bedrock below line_y, at the original size; None if Bedrock is unavailable."""
    w, h = img.size
    # Nova Canvas wants sides that are multiples of 64 within 320..1408 px for fast, valid requests.
    scale = min(1408 / max(w, h), 1.0)
    sw, sh = (max(320, int(w * scale) // 64 * 64), max(320, int(h * scale) // 64 * 64))
    small = img.resize((sw, sh))
    sy = int(line_y * sh / h)
    model = cloud.IMAGE_MODEL
    nova = model.startswith("amazon.")
    mask = Image.new("RGB", (sw, sh), (255, 255, 255) if nova else (0, 0, 0))
    ImageDraw.Draw(mask).rectangle([0, max(sy, 0), sw, sh], fill=(0, 0, 0) if nova else (255, 255, 255))
    b64 = lambda im: base64.b64encode(_png(im)).decode()
    if nova:     # Nova Canvas: black mask pixels are repainted
        body = {"taskType": "INPAINTING",
                "inPaintingParams": {"image": b64(small), "maskImage": b64(mask), "text": PROMPT, "negativeText": NEGATIVE},
                "imageGenerationConfig": {"numberOfImages": 1, "quality": "standard", "cfgScale": 7.0}}
    else:        # Stability inpaint: white mask pixels are repainted
        body = {"image": b64(small), "mask": b64(mask.convert("L")), "prompt": PROMPT,
                "negative_prompt": NEGATIVE, "output_format": "png"}
    try:
        resp = json.loads(cloud.client("bedrock-runtime").invoke_model(modelId=model, body=json.dumps(body))["body"].read())
        out_b64 = resp["images"][0]
    except Exception:
        cloud.failed("bedrock-image")
        return None
    return Image.open(io.BytesIO(base64.b64decode(out_b64))).convert("RGB").resize((w, h))


def _png(img):
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return buf.getvalue()


def _fallback_water(img, line_y):
    a = np.asarray(img, dtype="float32").copy()
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

    # Horizontal ripples: noise stretched sideways.
    rng = np.random.default_rng(7)
    noise = Image.fromarray((rng.random((rows, w // 8 + 1)) * 255).astype("uint8")).resize((w, rows))
    noise = np.asarray(noise.filter(ImageFilter.GaussianBlur(2)), dtype="float32")[..., None] / 255.0

    water = WATER_RGB * (0.85 + 0.3 * noise)
    a[y0:] = 0.62 * water + 0.18 * refl + 0.20 * below
    a[y0:y0 + 2] = a[y0:y0 + 2] * 0.5 + 200 * 0.5           # thin light edge where water meets walls
    return Image.fromarray(np.clip(a, 0, 255).astype("uint8"))


def _keep_above(original, painted, line_y, feather=6):
    """Original pixels above the waterline, painted pixels below, with a short soft blend."""
    w, h = original.size
    ramp = np.clip((np.arange(h) - (line_y - feather)) / (2 * feather), 0, 1)
    mask = Image.fromarray((np.repeat(ramp[:, None], w, axis=1) * 255).astype("uint8"))
    return Image.composite(painted, original, mask)


def _font(size):
    for p in FONT_PATHS:
        if os.path.exists(p):
            return ImageFont.truetype(p, size), True
    return ImageFont.load_default(size), False


def watermark(img, label):
    img = img.convert("RGB")
    d = ImageDraw.Draw(img)
    w, h = img.size
    size = max(14, w // 40)
    font, devanagari = _font(size)
    text = " · ".join(filter(None, ["AI SIMULATION", "AI अनुमान" if devanagari else None, label,
                                    f"{datetime.now():%d %b %Y}"]))
    box = d.textbbox((0, 0), text, font=font)
    pad = size // 2
    d.rectangle([0, h - (box[3] - box[1]) - 2 * pad, w, h], fill=(0, 0, 0))
    d.text((pad, h - (box[3] - box[1]) - pad - box[1]), text, font=font, fill=(255, 220, 0))
    return img


def render(photo_bytes, depth_m, label, ground_frac=None, top_frac=None, ref_height_m=2.1):
    """Returns (jpeg_bytes, info). Taps are fractions of image height (0 = top, 1 = bottom), so they
    survive resizing. Raises LookupError when no scale reference is given or found."""
    img = load_photo(photo_bytes)
    img, faces = blur_faces(img)
    if ground_frac is None or top_frac is None:
        ref = detect_reference(img)
        if ref is None:
            raise LookupError("no door, person or motorbike found — tap the bottom and top of a door")
        ground_y, top_y, ref_height_m = ref["ground_y"], ref["top_y"], ref["ref_height_m"]
    else:
        ground_y, top_y = ground_frac * img.height, top_frac * img.height
        ref = {"kind": "manual", "ground_y": round(ground_y), "top_y": round(top_y), "ref_height_m": ref_height_m}
    line = waterline_y(ground_y, top_y, ref_height_m, depth_m)

    painted, engine = ((_inpaint_bedrock(img, line), f"bedrock:{cloud.IMAGE_MODEL}")
                       if cloud.available("bedrock-image") else (None, None))
    if painted is None:
        painted, engine = _fallback_water(img, line), "fallback"
    out = watermark(_keep_above(img, painted, line), label)
    return _jpeg(out, 88), {"waterline_y": line, "render": engine, "reference": ref, "faces_blurred": faces,
                            "size": list(img.size)}
