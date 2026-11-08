"""Рисует иконки PWA (PNG) с кренделем Брецелем — те же кривые, что в js/mascot.js.

Запуск: python scripts/make-icons.py
"""
import math
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "icons"
OUT.mkdir(exist_ok=True)

CREAM = (255, 247, 232, 255)
OUTL = (138, 74, 18, 255)
BODY = (217, 146, 63, 255)
HI = (247, 196, 126, 255)
INK = (59, 38, 20, 255)
CHEEK = (255, 142, 124, 150)
MOUTH = (122, 46, 26, 255)
SALT = (255, 253, 246, 255)

ROPE = [
    ((70, 142), (80, 118), (90, 96), (100, 76)),
    ((100, 76), (115, 48), (150, 22), (167, 44)),
    ((167, 44), (182, 64), (182, 96), (168, 118)),
    ((168, 118), (150, 150), (125, 168), (100, 168)),
    ((100, 168), (75, 168), (50, 150), (32, 118)),
    ((32, 118), (18, 96), (18, 64), (33, 44)),
    ((33, 44), (50, 22), (85, 48), (100, 76)),
    ((100, 76), (110, 96), (120, 118), (130, 142)),
]
BELLY = ROPE[3:5]


def cubic(seg, n=90):
    (x0, y0), (x1, y1), (x2, y2), (x3, y3) = seg
    pts = []
    for i in range(n + 1):
        t = i / n
        a, b, c, d = (1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t ** 2, t ** 3
        pts.append((a * x0 + b * x1 + c * x2 + d * x3, a * y0 + b * y1 + c * y2 + d * y3))
    return pts


def render(size, scale, ox, oy, bg_round):
    ss = 4
    S = size * ss
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if bg_round:
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=CREAM)
    else:
        d.rectangle([0, 0, S, S], fill=CREAM)

    k = scale * ss

    def P(x, y):
        return (ox * ss + x * k, oy * ss + y * k)

    def stroke(segs, width, color, dx=0, dy=0):
        r = width * k / 2
        for seg in segs:
            for (x, y) in cubic(seg):
                cx, cy = P(x + dx, y + dy)
                d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)

    def line(p1, p2, width, color):
        n = 40
        r = width * k / 2
        for i in range(n + 1):
            t = i / n
            cx, cy = P(p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t)
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)

    def circle(x, y, r, color):
        cx, cy = P(x, y)
        rr = r * k
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=color)

    def ellipse(x, y, rx, ry, color):
        cx, cy = P(x, y)
        d.ellipse([cx - rx * k, cy - ry * k, cx + rx * k, cy + ry * k], fill=color)

    # Руки: левая опущена, правая машет.
    for (a, b) in [((36, 128), (16, 150)), ((164, 128), (186, 100))]:
        line(a, b, 9, OUTL)
        line(a, b, 5, BODY)
        circle(b[0], b[1], 8.5, OUTL)
        circle(b[0], b[1], 6, BODY)
    # Ножки.
    ellipse(84, 198, 13, 6.5, OUTL)
    ellipse(116, 198, 13, 6.5, OUTL)
    # Крендель: контур, тело, блик.
    stroke(ROPE, 30, OUTL)
    stroke(BELLY, 50, OUTL)
    stroke(ROPE, 22, BODY)
    stroke(BELLY, 42, BODY)
    stroke(ROPE, 5, HI, -2, -4)
    # Соль.
    for (x, y, rot) in [(150, 30, -25), (176, 78, 75), (44, 32, 20), (22, 84, -75), (92, 58, 60), (112, 104, -55), (52, 132, 35), (148, 132, -35)]:
        a = math.radians(rot)
        pts = []
        for (px, py) in [(-4, -2.5), (4, -2.5), (4, 2.5), (-4, 2.5)]:
            pts.append(P(x + px * math.cos(a) - py * math.sin(a), y + px * math.sin(a) + py * math.cos(a)))
        d.polygon(pts, fill=SALT)
    # Лицо.
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for cx in (72, 128):
        x, y = P(cx, 175)
        od.ellipse([x - 7.5 * k, y - 4.5 * k, x + 7.5 * k, y + 4.5 * k], fill=CHEEK)
    img.alpha_composite(overlay)
    for cx in (86, 114):
        circle(cx, 164, 6.5, INK)
        circle(cx + 2.2, 161.6, 2.2, (255, 255, 255, 255))
    mouth = [P(89, 173)]
    for i in range(1, 30):
        t = i / 30
        x = (1 - t) ** 2 * 89 + 2 * (1 - t) * t * 100 + t ** 2 * 111
        y = (1 - t) ** 2 * 173 + 2 * (1 - t) * t * 190 + t ** 2 * 173
        mouth.append(P(x, y))
    mouth.append(P(111, 173))
    d.polygon(mouth, fill=MOUTH, outline=INK)
    return img.resize((size, size), Image.LANCZOS)


def main():
    for size in (192, 512):
        s = size / 512
        render(size, 2.05 * s, 51 * s, 40 * s, False).save(OUT / f"icon-{size}.png")
    render(512, 1.55, 101, 92, False).save(OUT / "icon-maskable-512.png")
    print("icons:", sorted(p.name for p in OUT.glob("*.png")))


if __name__ == "__main__":
    main()
