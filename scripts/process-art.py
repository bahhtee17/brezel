"""Turns the raw PNGs from Codex (art/raw/) into light WebP files for the site (img/).

- mascot:  cut out the magenta background -> transparent WebP, trimmed, 512 px
- avatars: 192x192
- words:   480x480
- scenes:  900x600
Then writes img/index.json — the list of ready images that the app reads at startup.
Run: python scripts/process-art.py   (only new or changed files are converted)
"""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "art" / "raw"
OUT = ROOT / "img"

SIZES = {"avatars": (192, 192), "words": (480, 480), "scenes": (900, 600)}
QUALITY = 80


def cut_magenta(im):
    """Removes the flat #FF00FF background, with soft edges and the pink fringe removed."""
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            # How much "magenta" the pixel has: red and blue high, green low.
            m = min(r, b) - g
            if m > 150:
                px[x, y] = (0, 0, 0, 0)
                continue
            a = 255
            if m > 60:
                a = int(255 * (150 - m) / 90)
            if m > 0:  # убрать розовую кайму
                k = m * 0.8
                r, b = int(max(g, r - k)), int(max(g, b - k))
            px[x, y] = (r, g, b, a)
    return im


def trim(im, pad_ratio=0.04):
    box = im.getchannel("A").point(lambda a: 255 if a > 24 else 0).getbbox()
    if not box:
        return im
    im = im.crop(box)
    w, h = im.size
    side = int(max(w, h) * (1 + pad_ratio * 2))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(im, ((side - w) // 2, side - h - int(side * pad_ratio)), im)  # по нижнему краю: ноги на одной линии
    return canvas


def fit(im, size):
    """Center crop to the target aspect ratio, then resize."""
    tw, th = size
    w, h = im.size
    if w / h > tw / th:
        nw = int(h * tw / th)
        im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    elif w / h < tw / th:
        nh = int(w * th / tw)
        im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    return im.resize(size, Image.LANCZOS)


def main():
    index = {}
    made = 0
    for group_dir in sorted(p for p in RAW.iterdir() if p.is_dir()) if RAW.exists() else []:
        group = group_dir.name
        if group == "anim":  # кадры для Remotion, на сайт идут готовые mp4
            continue
        dest_dir = OUT / group
        dest_dir.mkdir(parents=True, exist_ok=True)
        keys = []
        for src in sorted(group_dir.glob("*.png")):
            dest = dest_dir / (src.stem + ".webp")
            keys.append(src.stem)
            if dest.exists() and dest.stat().st_mtime >= src.stat().st_mtime:
                continue
            im = Image.open(src)
            if group == "mascot":
                im = cut_magenta(im)
                im = trim(im).resize((512, 512), Image.LANCZOS)
                im.save(dest, "WEBP", quality=QUALITY, method=6)
            else:
                im = fit(im.convert("RGB"), SIZES.get(group, (480, 480)))
                im.save(dest, "WEBP", quality=QUALITY, method=6)
            made += 1
            print(f"  {group}/{dest.name}  {dest.stat().st_size // 1024} KB")
        index[group] = keys
    # Анимации (mp4 из Remotion) — отдельная папка img/anim
    anim = OUT / "anim"
    index["anim"] = sorted(p.stem for p in anim.glob("*.mp4")) if anim.exists() else []
    OUT.mkdir(exist_ok=True)
    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    total = sum(len(v) for v in index.values())
    print(f"converted {made}, index: {total} files -> img/index.json")


if __name__ == "__main__":
    main()
