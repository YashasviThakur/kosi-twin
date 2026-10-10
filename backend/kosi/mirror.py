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
from scipy.ndimage import gaussian_filter, map_coordinates
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

from . import cloud

REFERENCE_HEIGHTS_M = {"Door": 2.1, "Person": 1.6, "Motorcycle": 1.1}
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


def _smooth_noise(h, w, rng, cell):
    """Smooth random field in 0..1: a coarse random grid (cell = (rows, cols) per grid cell, in pixels)
    scaled up with bicubic interpolation. Anisotropic cells give horizontal ripples."""
    gh, gw = max(2, h // cell[0] + 2), max(2, w // cell[1] + 2)
    grid = Image.fromarray((rng.random((gh, gw)) * 255).astype("uint8"))
    return np.asarray(grid.resize((w, h), Image.BICUBIC), dtype="float32") / 255.0


def _fallback_water(img, line_y, px_per_m):
    """Muddy monsoon floodwater drawn below `line_y`, from the photo itself:
    - a mirrored, ripple-distorted reflection of what stands above the waterline, strongest near the
      wall (grazing view) and fading toward the camera, where the water looks turbid and brown;
    - silt colour that varies across the surface and follows the photo's own brightness;
    - glints, a soft contact shadow and a wavy foam line at the wall;
    - a damp band on the wall just above the water; and film grain matched to a phone photo.
    Everything above the waterline except the damp band is the untouched photo."""
    a = np.asarray(img, dtype="float32")
    h, w, _ = a.shape
    y0 = int(np.clip(round(line_y), 0, h))
    rows = h - y0
    if rows <= 1:
        return img
    rng = np.random.default_rng(7)
    out = a.copy()

    luminance = float(a.mean()) / 255.0                       # dull, overcast photos get darker water
    sky = a[: max(1, int(h * 0.12))].reshape(-1, 3).mean(axis=0)

    yy, xx = np.mgrid[y0:h, 0:w].astype("float32")
    t = (yy - y0) / max(rows - 1, 1)                          # 0 at the waterline, 1 at the bottom of the photo

    # Reflection: mirror image about the waterline, wobbled more the further from the wall.
    rip_x = _smooth_noise(rows, w, rng, (10, 90)) - 0.5
    rip_y = _smooth_noise(rows, w, rng, (6, 140)) - 0.5
    src_y = 2 * y0 - yy + rip_y * (5 + 14 * t)
    src_x = np.clip(xx + rip_x * (8 + 20 * t), 0, w - 1)
    inside = src_y >= 0                                       # the mirror image runs off the top of the photo
    src_y = np.minimum(np.clip(src_y, 0, h - 1), max(y0 - 1, 0))
    refl = np.stack([map_coordinates(a[..., c], [src_y, src_x], order=1, mode="nearest") for c in range(3)], axis=-1)
    refl[~inside] = sky
    soft = gaussian_filter(refl, sigma=(2.0, 3.0, 0))
    k = np.clip(t * 1.1, 0, 0.8)[..., None]
    refl = refl * (1 - k) + soft * k

    # Silt-brown body with slow variation across the surface.
    big = _smooth_noise(rows, w, rng, (70, 240))[..., None]
    mid = _smooth_noise(rows, w, rng, (22, 90))[..., None]
    body = np.array([126, 98, 66], "float32") * (1 - big) + np.array([108, 99, 72], "float32") * big
    body = body * (0.55 + 0.65 * luminance) * (0.9 + 0.2 * mid)

    # Fresnel: mirror-like at a grazing angle (near the wall), see-through brown looking down.
    reflect = (0.08 + 0.42 * (1 - t) ** 2.2)[..., None]
    water = body * (1 - reflect) + refl * reflect

    streak = _smooth_noise(rows, w, rng, (3, 70))
    glint = np.clip((streak - 0.72) * 4, 0, 1)[..., None]
    water += glint * (sky - water) * 0.28 * (1 - 0.5 * t)[..., None]

    soft_edge = max(4.0, 0.10 * px_per_m)
    water *= (1 - 0.22 * np.exp(-(yy - y0) / soft_edge))[..., None]            # the wall's contact shadow

    wobble = (_smooth_noise(1, w, rng, (1, 40))[0] - 0.5) * 3.0                  # wavy line where water meets wall
    edge = np.exp(-(((yy - y0) - wobble[None, :]) / 1.7) ** 2)[..., None]
    water = water * (1 - 0.38 * edge) + np.array([228, 222, 207], "float32") * 0.38 * edge

    water += rng.normal(0, 2.2, water.shape).astype("float32")                  # sensor grain
    out[y0:] = water

    # Damp band on the wall just above the waterline: darker and browner, with an uneven top edge.
    wet_max = max(6, int(0.30 * px_per_m))
    y1 = max(0, y0 - wet_max)
    if y1 < y0:
        wy, _ = np.mgrid[y1:y0, 0:w].astype("float32")
        reach = (wet_max * (0.65 + 0.7 * _smooth_noise(1, w, rng, (1, 60))[0]))[None, :]
        damp = np.clip((wy - (y0 - reach)) / reach, 0, 1)[..., None]
        out[y1:y0] = a[y1:y0] * (1 - 0.22 * damp) + np.array([105, 82, 58], "float32") * 0.10 * damp

    return Image.fromarray(np.clip(out, 0, 255).astype("uint8"))


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
    """A translucent strip along the bottom: AI SIMULATION in yellow, then the label and date in white."""
    img = img.convert("RGBA")
    w, h = img.size
    size = max(13, w // 46)
    font, devanagari = _font(size)
    first = " · ".join(filter(None, ["AI SIMULATION", "AI अनुमान" if devanagari else None]))
    rest = " · ".join(filter(None, [label, f"{datetime.now():%d %b %Y}"]))
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    band = int(size * 2.1)
    d.rectangle([0, h - band, w, h], fill=(11, 26, 32, 165))
    box = d.textbbox((0, 0), first, font=font)
    y = h - band + (band - (box[3] - box[1])) // 2 - box[1]
    x = size // 2 + 4
    d.text((x, y), first, font=font, fill=(255, 214, 10, 255))
    d.text((x + d.textlength(first + " · ", font=font), y), rest, font=font, fill=(255, 255, 255, 255))
    return Image.alpha_composite(img, overlay).convert("RGB")


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
    if painted is not None:
        result = _keep_above(img, painted, line)                 # the AI may not move anything above the water
    else:
        result, engine = _fallback_water(img, line, (ground_y - top_y) / ref_height_m), "fallback"
    out = watermark(result, label)
    return _jpeg(out, 92), {"waterline_y": line, "render": engine, "reference": ref, "faces_blurred": faces,
                            "size": list(img.size)}
