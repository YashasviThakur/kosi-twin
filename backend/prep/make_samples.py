"""Draw three illustrated street scenes for the Flood Mirror example cards (frontend/public/samples), each with a
door at a known place, so the demo works without a real photo and without door detection. They are drawings, not
photos, and are labelled that way. To add real photos, drop them in the same folder and add an entry to
samples.json: {"file": "lane.jpg", "label": "...", "ground": 0.78, "top": 0.39} where ground and top are the
bottom and top of a door (or other 2.1 m reference), as fractions of the picture height; leave them out and the
app looks for a door or person itself.
Usage: python make_samples.py [contact_sheet.jpg]"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parents[2] / "frontend" / "public" / "samples"
W, H = 1200, 800
GROUND = 650          # where the door meets the street
DOOR_H = 300          # a 2.1 m door
rng = np.random.default_rng(11)


def noise(h, w, cell, amp):
    g = Image.fromarray((rng.random((h // cell + 2, w // cell + 2)) * 255).astype("uint8")).resize((w, h), Image.BICUBIC)
    return (np.asarray(g, dtype="float32") / 255 - 0.5) * amp


def base(sky_top, sky_bottom, wall, street, wall_noise=22):
    img = np.zeros((H, W, 3), "float32")
    sky = np.linspace(sky_top, sky_bottom, 280)[:, None, :].repeat(W, 1)
    img[:280] = sky + noise(280, W, 70, 30)[..., None]
    img[280:GROUND] = np.array(wall) + noise(GROUND - 280, W, 5, wall_noise)[..., None] + noise(GROUND - 280, W, 90, 24)[..., None]
    img[GROUND:] = np.array(street) + noise(H - GROUND, W, 3, 38)[..., None] + noise(H - GROUND, W, 60, 16)[..., None]
    return Image.fromarray(np.clip(img, 0, 255).astype("uint8"))


def finish(im, name):
    im = im.filter(ImageFilter.GaussianBlur(0.9))
    im.save(OUT / name, "JPEG", quality=88)
    return im


def lane():
    im = base((150, 185, 220), (222, 232, 238), (201, 172, 134), (126, 112, 92))
    d = ImageDraw.Draw(im)
    d.polygon([(0, 215), (W, 215), (W, 280), (0, 280)], fill=(112, 84, 60))                    # thatch roof edge
    for x in range(0, W, 14):
        d.line([(x, 215), (x - 6, 282)], fill=(92, 66, 46), width=3)
    dx, dy = 470, GROUND - DOOR_H
    d.rectangle([dx - 12, dy - 12, dx + 172, GROUND], fill=(150, 124, 92))                      # door frame
    d.rectangle([dx, dy, dx + 160, GROUND], fill=(98, 62, 38))                                  # door
    for k in range(1, 5):
        d.line([(dx + k * 32, dy), (dx + k * 32, GROUND)], fill=(70, 44, 26), width=3)          # planks
    d.rectangle([dx + 128, GROUND - 160, dx + 140, GROUND - 146], fill=(196, 164, 76))          # handle
    d.rectangle([820, 360, 980, 470], fill=(58, 70, 84), outline=(120, 96, 70), width=9)       # window
    for x in (860, 900, 940):
        d.line([(x, 360), (x, 470)], fill=(190, 190, 190), width=3)
    d.rectangle([90, 330, 150, GROUND], fill=(88, 64, 44))                                      # tree trunk
    d.ellipse([20, 140, 230, 360], fill=(70, 112, 62))
    d.ellipse([60, 100, 200, 250], fill=(88, 132, 76))
    return finish(im, "lane.jpg")


def brick():
    im = base((140, 180, 224), (214, 228, 238), (160, 82, 62), (118, 118, 116), wall_noise=14)
    d = ImageDraw.Draw(im)
    for r, y in enumerate(range(300, GROUND, 24)):                                               # brick courses
        for x in range(-(r % 2) * 30, W, 60):
            c = int(rng.integers(-14, 14))
            d.rectangle([x + 2, y + 2, x + 57, y + 21], fill=(168 + c, 86 + c // 2, 64 + c // 2))
    d.rectangle([0, 236, W, 300], fill=(150, 156, 160))                                          # tin roof
    for x in range(0, W, 22):
        d.line([(x, 236), (x, 300)], fill=(118, 124, 128), width=4)
    d.rectangle([0, GROUND - 26, W, GROUND], fill=(196, 192, 184))                               # plinth
    dx, dy = 700, GROUND - DOOR_H
    d.rectangle([dx - 14, dy - 14, dx + 174, GROUND], fill=(236, 232, 224))
    d.rectangle([dx, dy, dx + 160, GROUND], fill=(36, 92, 170))                                  # blue door
    d.rectangle([dx + 18, dy + 22, dx + 142, dy + 120], outline=(24, 64, 130), width=5)
    d.rectangle([dx + 18, dy + 150, dx + 142, GROUND - 24], outline=(24, 64, 130), width=5)
    d.ellipse([dx + 130, GROUND - 160, dx + 144, GROUND - 146], fill=(226, 196, 90))
    d.rectangle([250, 380, 430, 500], fill=(46, 62, 82), outline=(240, 238, 232), width=10)      # window
    d.line([(340, 380), (340, 500)], fill=(240, 238, 232), width=5)
    d.rectangle([dx - 40, GROUND, dx + 200, GROUND + 22], fill=(176, 172, 164))                  # step
    return finish(im, "brick.jpg")


def shop():
    im = base((156, 190, 226), (226, 234, 240), (232, 206, 120), (92, 92, 94), wall_noise=16)
    d = ImageDraw.Draw(im)
    d.rectangle([180, 210, 780, 292], fill=(196, 52, 44))                                        # signboard
    d.rectangle([196, 224, 764, 278], outline=(255, 238, 200), width=4)
    d.rectangle([180, 300, 560, GROUND], fill=(60, 64, 70))                                      # shop opening
    for y in range(300, GROUND - 120, 18):
        d.rectangle([180, y, 560, y + 12], fill=(150, 154, 158))                                 # half-raised shutter
    dx, dy = 800, GROUND - DOOR_H
    d.rectangle([dx - 12, dy - 12, dx + 172, GROUND], fill=(120, 96, 60))
    d.rectangle([dx, dy, dx + 160, GROUND], fill=(48, 110, 74))                                  # green door
    d.line([(dx + 80, dy), (dx + 80, GROUND)], fill=(34, 80, 52), width=4)
    d.ellipse([dx + 62, GROUND - 160, dx + 76, GROUND - 146], fill=(226, 196, 90))
    d.line([(0, GROUND + 70), (W, GROUND + 70)], fill=(230, 230, 220), width=6)                  # road marking
    d.ellipse([240, GROUND - 64, 330, GROUND + 26], fill=(26, 26, 28))                           # parked motorbike
    d.ellipse([430, GROUND - 64, 520, GROUND + 26], fill=(26, 26, 28))
    d.polygon([(285, GROUND - 40), (400, GROUND - 120), (470, GROUND - 110), (475, GROUND - 40)], fill=(180, 40, 36))
    return finish(im, "shop.jpg")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    ground, top = GROUND / H, (GROUND - DOOR_H) / H
    scenes = [(lane, "lane.jpg", "Village lane"), (brick, "brick.jpg", "Brick house"), (shop, "shop.jpg", "Shop front")]
    sheet = Image.new("RGB", (W * 3 // 2, H // 2))
    for i, (fn, file, label) in enumerate(scenes):
        sheet.paste(fn().resize((W // 2, H // 2)), (i * W // 2, 0))
    if len(__import__("sys").argv) > 1:
        sheet.save(__import__("sys").argv[1], quality=85)       # optional contact sheet for a quick look
    (OUT / "samples.json").write_text(json.dumps(
        [{"file": f, "label": f"{label} (illustration)", "ground": round(ground, 4), "top": round(top, 4)} for _, f, label in scenes],
        indent=2), encoding="utf-8")
    print("wrote", [f for _, f, _ in scenes], "door fractions", round(top, 3), round(ground, 3))
