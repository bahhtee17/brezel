"""Иконка приложения и заставка из рисунков маскота.

    python scripts/make-icons.py

Делает icons/icon-*.png (иконка: кренделёк-наклейка на голубом фоне), img/splash.webp (маскот для заставки)
и icons/splash/*.png — стартовые картинки для iPhone (то же, что рисует заставка в index.html, чтобы не было скачка).
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "art" / "raw" / "mascot"
TOP, BOTTOM = (98, 196, 255), (33, 132, 224)      # голубой фон: сверху светлее
SPLASH_M = 200                                    # ширина маскота на заставке, в точках экрана (как в index.html)

# Размеры экранов iPhone: ширина, высота в точках и плотность.
PHONES = [(440, 956, 3), (430, 932, 3), (428, 926, 3), (420, 912, 3), (414, 896, 3), (414, 896, 2), (414, 736, 3),
          (402, 874, 3), (393, 852, 3), (390, 844, 3), (375, 812, 3), (375, 667, 2)]


def cut(path):
    """Убирает пурпурный фон рисунка."""
    fr = np.asarray(Image.open(path).convert("RGB"), np.float32)
    bg = np.median(fr[:8, :8].reshape(-1, 3), axis=0)
    m = np.clip((np.minimum(fr[..., 0], fr[..., 2]) - fr[..., 1]) / (min(bg[0], bg[2]) - bg[1]), 0, 1)
    a = np.clip((1 - m - 0.08) / 0.62, 0, 1)
    mix = np.clip(m, 0, 0.97)[..., None]
    fg = np.where((a > 0)[..., None], np.clip((fr - mix * bg) / (1 - mix), 0, 255), 0)
    return Image.fromarray(np.dstack([fg, a[..., None] * 255]).astype(np.uint8), "RGBA")


def sticker(im, size, edge=0.035, shadow=True):
    """Наклейка: белая обводка вокруг рисунка и мягкая тень. Возвращает картинку size x size."""
    im = im.crop(im.getbbox())
    pad = int(max(im.size) * (edge + 0.06))
    box = Image.new("RGBA", (max(im.size) + pad * 2,) * 2)
    box.alpha_composite(im, ((box.width - im.width) // 2, (box.height - im.height) // 2))
    box = box.resize((size, size), Image.LANCZOS)
    r = max(2, int(size * edge))
    a = box.getchannel("A")
    grow = a.filter(ImageFilter.GaussianBlur(r * 0.55)).point(lambda v: 255 if v > 12 else 0).filter(ImageFilter.GaussianBlur(max(1, r * 0.12)))
    out = Image.new("RGBA", box.size)
    if shadow:
        sh = Image.new("RGBA", box.size, (10, 60, 120, 0))
        sh.putalpha(grow.filter(ImageFilter.GaussianBlur(r * 0.9)).point(lambda v: int(v * 0.42)))
        out.alpha_composite(sh, (0, int(r * 0.75)))
    white = Image.new("RGBA", box.size, (255, 255, 255, 0))
    white.putalpha(grow)
    out.alpha_composite(white)
    out.alpha_composite(box)
    return out


def backdrop(w, h, rays=True):
    """Голубой фон с мягким сиянием и лучами из центра."""
    y = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    img = np.broadcast_to(np.array(TOP, np.float32) * (1 - y) + np.array(BOTTOM, np.float32) * y, (h, w, 3)).copy()
    im = Image.fromarray(img.astype(np.uint8), "RGB").convert("RGBA")
    cx, cy, R = w / 2, h * 0.47, max(w, h)
    glow = Image.new("L", (w, h), 0)
    r0 = min(w, h) * 0.46
    ImageDraw.Draw(glow).ellipse([cx - r0, cy - r0, cx + r0, cy + r0], fill=64)
    glow = glow.filter(ImageFilter.GaussianBlur(min(w, h) * 0.06))
    if rays:
        ray = Image.new("L", (w, h), 0)
        d = ImageDraw.Draw(ray)
        for i in range(12):
            d.pieslice([cx - R, cy - R, cx + R, cy + R], i * 30 - 7 + 15, i * 30 + 7 + 15, fill=30)
        glow = ImageChops.add(glow, ray.filter(ImageFilter.GaussianBlur(min(w, h) * 0.004)))
    light = Image.new("RGBA", (w, h), (255, 255, 255, 0))
    light.putalpha(glow)
    im.alpha_composite(light)
    return im


def body_only(im):
    """Кренделёк без ручек и ножек — для иконки (тонкие линии в маленькой иконке не читаются)."""
    w, h = im.size
    a = np.asarray(im).copy()
    k = w / 1024
    a[int(763 * k):, :, 3] = 0                                   # ножки
    a[int(640 * k):, :int(205 * k), 3] = 0                       # левая ручка
    a[int(640 * k):, int(800 * k):, 3] = 0                       # правая ручка
    return Image.fromarray(a, "RGBA")


def icon(size, scale):
    bg = backdrop(size * 2, size * 2)
    st = sticker(body_only(cut(RAW / "idle.png")), int(size * 2 * scale), edge=0.04)
    bg.alpha_composite(st, ((bg.width - st.width) // 2, int((bg.height - st.height) / 2 + size * 0.02)))
    return bg.resize((size, size), Image.LANCZOS).convert("RGB")


icons = ROOT / "icons"
icon(512, 0.86).save(icons / "icon-512.png", optimize=True)
icon(192, 0.86).save(icons / "icon-192.png", optimize=True)
icon(180, 0.86).save(icons / "apple-touch-icon.png", optimize=True)
icon(512, 0.66).save(icons / "icon-maskable-512.png", optimize=True)      # с запасом под круглую обрезку Android
icon(64, 0.9).save(icons / "favicon.png", optimize=True)

# Маскот для заставки: машет рукой, наклейка с обводкой.
hero = sticker(cut(RAW / "wave.png"), 600, edge=0.03)
hero.save(ROOT / "img" / "splash.webp", quality=88, method=6)

out = icons / "splash"
out.mkdir(exist_ok=True)
for f in out.glob("*.png"):
    f.unlink()
for w, h, dpr in PHONES:
    bg = backdrop(w * dpr, h * dpr, rays=False)
    m = hero.resize((SPLASH_M * dpr,) * 2, Image.LANCZOS)
    bg.alpha_composite(m, ((bg.width - m.width) // 2, int(bg.height * 0.44 - m.height / 2)))
    bg.convert("RGB").quantize(200, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(out / f"{w}x{h}@{dpr}.png", optimize=True)
print("icons:", sorted(p.name for p in icons.glob("*.png")))
print("splash:", sum(p.stat().st_size for p in out.glob("*.png")) // 1024, "KB,", (ROOT / "img" / "splash.webp").stat().st_size // 1024, "KB hero")
