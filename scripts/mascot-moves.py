"""Ролики маскота из Grok -> анимированные WebP с прозрачным фоном для приложения.

    python scripts/mascot-moves.py [имена...]      # art/raw/grok/<имя>.mp4 -> img/moves/<имя>.webp

Фон роликов пурпурный (#FF00FF): убираем его, края очищаем от пурпурной каймы.
"""
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC, DST = ROOT / "art" / "raw" / "grok", ROOT / "img" / "moves"
SIZE, FPS = 300, 12

# имя: (начало с, конец с, туда-обратно, повторять бесконечно[, размер, кадров в секунду])
MOVES = {
    "idle":    (2.0, 5.6, True, True, 220, 10),
    "wave":    (0.0, 3.2, False, False),
    "cheer":   (0.0, 3.0, False, False),
    "thumbs":  (0.0, 3.0, False, False),
    "dance":   (0.0, 4.5, False, False),
    "hero":    (0.0, 3.5, False, False),
    "trophy":  (2.3, 6.0, False, False),
    "grad":    (0.0, 4.5, False, False),
    "flame":   (0.0, 4.0, False, False),
    "comfort": (1.5, 5.0, False, False),
    "think":   (0.0, 4.0, False, False),
}


def frames(path, t0, t1, SIZE, FPS):
    cmd = ["ffmpeg", "-v", "error", "-ss", str(t0), "-to", str(t1), "-i", str(path),
           "-vf", f"fps={FPS},scale={SIZE}:{SIZE}:flags=lanczos", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, SIZE, SIZE, 3).astype(np.float32)


def key(fr):
    bg = np.median(fr[:6, :6].reshape(-1, 3), axis=0)              # настоящий цвет фона в ролике
    mbg = min(bg[0], bg[2]) - bg[1]
    r, g, b = fr[..., 0], fr[..., 1], fr[..., 2]
    m = np.clip((np.minimum(r, b) - g) / mbg, 0, 1)                # 1 = чистый фон
    a = np.clip((1 - m - 0.08) / 0.62, 0, 1)                       # до 30 % пурпура — непрозрачно
    mix = np.clip(m, 0, 0.97)[..., None]                           # вычитаем фон из полупрозрачных краёв
    fg = np.clip((fr - mix * bg) / (1 - mix), 0, 255)
    fg = np.where((a > 0)[..., None], fg, 0)
    return np.dstack([fg, a[..., None] * 255]).astype(np.uint8)


for name in sys.argv[1:] or MOVES:
    t0, t1, pong, loop, size, fps = (*MOVES[name], SIZE, FPS)[:6]
    fs = [Image.fromarray(key(f), "RGBA") for f in frames(SRC / f"{name}.mp4", t0, t1, size, fps)]
    if pong:
        fs += fs[-2:0:-1]
    DST.mkdir(parents=True, exist_ok=True)
    out = DST / f"{name}.webp"
    fs[0].save(out, save_all=True, append_images=fs[1:], duration=round(1000 / fps), loop=0 if loop else 1,
               quality=62, method=4)
    print(f"{name}: {len(fs)} frames, {out.stat().st_size // 1024} KB", flush=True)
