"""Фон «кремовая бумага» для видео-объяснений: градиент + зерно, один раз в картинку.

    python scripts/video-paper.py <dst.jpg>

Раньше зерно рисовал SVG-фильтр feTurbulence на каждом кадре — это было самое медленное место рендера.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

W, H = 1080, 1920
BG, BG2 = (0xFF, 0xF7, 0xE8), (0xFD, 0xEF, 0xD6)

dst = Path(sys.argv[1])
y, x = np.mgrid[0:H, 0:W].astype(np.float32)
cx, cy = W * 0.5, H * 0.4
rx, ry = cx * 2 ** 0.5, (H - cy) * 2 ** 0.5
t = np.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2)
k = np.clip((t - 0.55) / 0.45, 0, 1)[..., None]
img = np.array(BG, np.float32) * (1 - k) + np.array(BG2, np.float32) * k
rng = np.random.default_rng(7)
grain = rng.normal(0, 1, (H, W)).astype(np.float32)
# Чуть размываем шум, чтобы зерно было «бумажным», а не цифровым.
grain = (grain + np.roll(grain, 1, 0) + np.roll(grain, 1, 1) + np.roll(grain, (1, 1), (0, 1))) / 2
img += grain[..., None] * 3.2
dst.parent.mkdir(parents=True, exist_ok=True)
Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), "RGB").save(dst, "JPEG", quality=90)
print(f"paper -> {dst}")
