"""Режет озвученные «пачки» (audio/raw/<id>.mp3) на отдельные фразы по паузам.

Пачки описаны в audio/chunks.json (scripts/audio-chunks.mjs). Каждая фраза -> audio/<hash>.mp3,
имя — как у generate-audio.mjs (sha1 от «голос|текст»), запись добавляется в audio/manifest.json.
Пачка принимается, только если: пауз хватает, паузы между фразами заметно длиннее пауз внутри фраз,
темп речи нормальный (7–19 символов/с) и длины кусочков согласуются с длинами фраз.
Иначе пачка попадает в audio/redo.json — её фразы надо озвучить по одной.
Запуск: python scripts/audio-split.py [c001 c002 ...]
"""
import hashlib
import os
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AUDIO = ROOT / "audio"
RAW = AUDIO / "raw"
LEAD, TAIL = 0.06, 0.18  # запас до и после фразы, сек


def silences(path):
    out = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "silencedetect=noise=-40dB:d=0.25",
                          "-f", "null", "-"], capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", out)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", out)]
    dur = float(re.search(r"Duration: (\d+):(\d+):([\d.]+)", out).group(3)) + \
        60 * float(re.search(r"Duration: (\d+):(\d+)", out).group(2))
    return list(zip(starts, ends)), dur


def main():
    chunks = json.loads((AUDIO / os.environ.get("CHUNKS", "chunks.json")).read_text(encoding="utf-8"))
    only = set(sys.argv[1:])
    manifest_path = AUDIO / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    made = 0
    redo = []
    for c in chunks:
        if only and c["id"] not in only:
            continue
        raw = RAW / f"{c['id']}.mp3"
        if not raw.exists():
            continue
        n = len(c["phrases"])
        sil, dur = silences(raw)
        # Тишина в начале и в конце записи — не разделители.
        inner = [(s, e) for s, e in sil if s > 0.05 and e < dur - 0.05]
        if len(inner) < n - 1:
            print(f"! {c['id']}: пауз {len(inner)}, а нужно {n - 1}")
            redo.append(c["id"])
            continue
        # Паузы между фразами — n-1 самых длинных; остальные — паузы внутри фраз.
        ranked = sorted(inner, key=lambda x: x[1] - x[0], reverse=True)
        cuts = sorted(ranked[:n - 1])
        rest = ranked[n - 1:]
        speech = dur - sum(e - s for s, e in sil)
        rate = sum(len(t) for t in c["phrases"]) / max(speech, 0.1)
        margin_ok = not cuts or not rest or (min(e - s for s, e in cuts) >= 1.15 * max(e - s for s, e in rest))
        if not (7 <= rate <= 19) or not margin_ok:
            print(f"! {c['id']}: темп {rate:.1f} симв/с, паузы различимы: {margin_ok}")
            redo.append(c["id"])
            continue
        lead_in = sil[0][1] if sil and sil[0][0] <= 0.05 else 0.0
        tail_out = sil[-1][0] if sil and sil[-1][1] >= dur - 0.05 else dur
        bounds = [lead_in] + [x for s, e in cuts for x in (s, e)] + [tail_out]
        lens = []
        for i, text in enumerate(c["phrases"]):
            start, end = bounds[2 * i], bounds[2 * i + 1]
            name = hashlib.sha1(f"{c['voice']}|{text}".encode("utf-8")).hexdigest()[:16] + ".mp3"
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{max(0, start - LEAD):.3f}", "-to", f"{min(dur, end + TAIL):.3f}",
                            "-i", str(raw), "-ac", "1", "-ar", "44100", "-b:a", "64k", str(AUDIO / name)], check=True)
            manifest[text] = name
            lens.append((len(text), end - start))
            made += 1
        print(f"  {c['id']} ({c['who']}): {n} фраз, темп {rate:.1f} симв/с, " +
              ", ".join(f"{L}:{d:.1f}s" for L, d in lens))
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    (AUDIO / "redo.json").write_text(json.dumps(redo), encoding="utf-8")
    if redo:
        print("Переозвучить по одной фразе:", ", ".join(redo))
    print(f"Нарезано фраз: {made}. В manifest.json: {len(manifest)}")


if __name__ == "__main__":
    main()
