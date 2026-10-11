"""Draws the app icons (public/icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png) from the Kosi Twin mark,
the same shapes as src/components/Logo.tsx: a solid river strand and a dashed mirrored "twin" strand on a dark tile.
Run from the frontend folder:  python scripts/make_icons.py"""
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / "public"
TILE = (26, 34, 44)          # --p0 of the slate theme
STRAND = (125, 211, 252)     # --acc
TWIN = (203, 213, 225)       # --twin
SS = 4                       # supersampling


def bezier(p0, p1, p2, p3, n=60):
    out = []
    for i in range(n + 1):
        t = i / n
        a, b, c, d = (1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t ** 2, t ** 3
        out.append((a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]))
    return out


# the strand in the logo's 48-unit space: M13 9 c9.5 1.5 11.5 8 5.5 13 s-5 11 6.5 17
STRAND_PTS = bezier((13, 9), (22.5, 10.5), (24.5, 17), (18.5, 22)) + bezier((18.5, 22), (12.5, 27), (13.5, 33), (25, 39))[1:]


def draw(size: int, margin: float, rounded: bool) -> Image.Image:
    s = size * SS
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, s - 1, s - 1), radius=int(s * (13 / 48)) if rounded else 0, fill=TILE + (255,))
    k = s * (1 - 2 * margin) / 48                      # logo unit -> pixels
    ox = oy = s * margin

    def pt(p, mirror=False):
        x = 48 - p[0] if mirror else p[0]
        return (ox + x * k, oy + p[1] * k)

    w = 3.4 * k
    for p in STRAND_PTS:                               # solid strand: round dots along the curve
        x, y = pt(p)
        d.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=STRAND + (255,))
    for i, p in enumerate(STRAND_PTS):                 # dashed twin: every few points, so it reads as dots
        if i % 11 == 0:
            x, y = pt(p, mirror=True)
            d.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=TWIN + (255,))
    x, y = ox + 24 * k, oy + 39.6 * k                  # the dot at the mouth
    r = 2.3 * k
    d.ellipse((x - r, y - r, x + r, y + r), fill=STRAND + (255,))
    return im.resize((size, size), Image.Resampling.LANCZOS)


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    draw(192, 0.08, True).save(OUT / "icon-192.png")
    draw(512, 0.08, True).save(OUT / "icon-512.png")
    draw(512, 0.22, False).save(OUT / "icon-maskable-512.png")      # full-bleed with a safe zone, for adaptive icons
    draw(180, 0.08, False).save(OUT / "apple-touch-icon.png")
    print("wrote", ", ".join(sorted(p.name for p in OUT.glob("*icon*.png"))))
