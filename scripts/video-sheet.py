"""Собирает кадры сцен в один лист для проверки вёрстки ролика.

    python scripts/video-sheet.py <папка с кадрами> <лист.jpg> [колонок]
"""
import sys
from pathlib import Path

from PIL import Image

src, dst = Path(sys.argv[1]), Path(sys.argv[2])
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 6
files = sorted(src.glob("*.jpg"))
if not files:
    sys.exit(f"Нет кадров в {src}")
ims = [Image.open(f) for f in files]
w, h = ims[0].size
rows = -(-len(ims) // cols)
sheet = Image.new("RGB", (cols * w, rows * h), "white")
for i, im in enumerate(ims):
    sheet.paste(im, ((i % cols) * w, (i // cols) * h))
sheet.save(dst, "JPEG", quality=82)
print(f"{len(ims)} frames -> {dst}")
