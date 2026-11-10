"""Готовит рисунки Codex для видео-объяснений.

    python scripts/video-cut.py <src.png> <dst.png> [<src2> <dst2> ...]
    python scripts/video-cut.py --fit=640 <src.png> <dst.jpg> [...]

Без флага: вырезает пурпурный фон (#FF00FF -> прозрачный, мягкие края, как в process-art.py),
обрезает по фигуре и уменьшает до 900 px — так готовятся учитель, маскот и заставки.
С флагом --fit=N: фон не трогает, просто уменьшает картинку до N px и сохраняет лёгкий JPEG —
так готовятся картинки слов, сцены и портреты героев.
Пропускает файлы, которые уже новее исходника.
"""
import importlib.util
import sys
from pathlib import Path

from PIL import Image

spec = importlib.util.spec_from_file_location("process_art", Path(__file__).with_name("process-art.py"))
pa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pa)

args = sys.argv[1:]
fit = 0
if args and args[0].startswith("--fit="):
    fit = int(args[0][6:])
    args = args[1:]

for src, dst in zip(args[0::2], args[1::2]):
    s, d = Path(src), Path(dst)
    if d.exists() and d.stat().st_mtime > s.stat().st_mtime:
        continue
    d.parent.mkdir(parents=True, exist_ok=True)
    if fit:
        im = Image.open(s).convert("RGBA")
        flat = Image.new("RGB", im.size, (255, 247, 232))
        flat.paste(im, mask=im.split()[3])
        flat.thumbnail((fit, fit), Image.LANCZOS)
        flat.save(d, "JPEG", quality=88, optimize=True)
    else:
        im = pa.trim(pa.cut_magenta(Image.open(s)))
        im.thumbnail((900, 900), Image.LANCZOS)
        im.save(d, "PNG", optimize=True)
    print(f"{'fit' if fit else 'cut'} {s.name} -> {d}")
