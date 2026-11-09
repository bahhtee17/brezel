"""Режет озвученные пачки на фразы по расшифровке с временем каждого слова (ElevenLabs Scribe).

Для каждой пачки нужны audio/raw/<id>.mp3 и audio/raw/<id>.words.json (список слов с start/end).
Слова расшифровки сопоставляются с фразами пачки (difflib), граница режется посередине
между последним словом одной фразы и первым словом следующей. Если фраза не узнаётся
(расшифровка заметно расходится с текстом), пачка пропускается и попадает в audio/redo.json.
Файлы фраз: audio/<sha1(голос|текст)[:16]>.mp3, список — audio/manifest.json.
Запуск: python scripts/audio-align.py [p001 p002 ...]
"""
import difflib
import hashlib
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AUDIO = ROOT / "audio"
RAW = AUDIO / "raw"


def norm(t):
    t = unicodedata.normalize("NFC", t.lower()).replace("ß", "ss").replace("’", "'")
    t = re.sub(r"[^\w' ]+", " ", t)
    return [w for w in t.split() if w]


def duration(path):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                                capture_output=True, text=True).stdout)


def align(phrases, words):
    """-> [(start, end)] по фразам или None, если сопоставить не удалось."""
    ptoks = [(i, tok) for i, p in enumerate(phrases) for tok in norm(p)]
    wtoks = []  # (индекс слова, токен)
    for j, w in enumerate(words):
        for tok in norm(w["text"]):
            wtoks.append((j, tok))
    sm = difflib.SequenceMatcher(None, [t for _, t in ptoks], [t for _, t in wtoks], autojunk=False)
    mapped = {}
    for tag, a1, a2, b1, b2 in sm.get_opcodes():
        if tag == "equal" or (tag == "replace" and a2 - a1 == b2 - b1):
            for k in range(a2 - a1):
                mapped[a1 + k] = wtoks[b1 + k][0]
    spans = []
    for i, p in enumerate(phrases):
        idx = [mapped[k] for k, (pi, _) in enumerate(ptoks) if pi == i and k in mapped]
        if not idx:
            return None
        first, last = min(idx), max(idx)
        heard = " ".join(norm(" ".join(w["text"] for w in words[first:last + 1])))
        if difflib.SequenceMatcher(None, " ".join(norm(p)), heard).ratio() < 0.75:
            return None
        spans.append((first, last))
    for (f1, l1), (f2, l2) in zip(spans, spans[1:]):
        if not l1 < f2:
            return None
    return spans


def main():
    chunks = json.loads((AUDIO / "chunks.json").read_text(encoding="utf-8"))
    only = set(sys.argv[1:])
    manifest_path = AUDIO / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    redo, made = [], 0
    for c in chunks:
        if only and c["id"] not in only:
            continue
        raw, wf = RAW / f"{c['id']}.mp3", RAW / f"{c['id']}.words.json"
        if not raw.exists() or not wf.exists():
            continue
        data = json.loads(wf.read_text(encoding="utf-8"))
        words = [w for w in (data["words"] if isinstance(data, dict) else data) if w.get("type", "word") == "word"]
        spans = align(c["phrases"], words)
        if not spans:
            print(f"! {c['id']}: расшифровка не совпала с текстом")
            redo.append(c["id"])
            continue
        dur = duration(raw)
        cuts = []
        for i, (first, last) in enumerate(spans):
            s = words[first]["start"]
            e = words[last]["end"]
            prev_end = words[spans[i - 1][1]]["end"] if i else None
            next_start = words[spans[i + 1][0]]["start"] if i + 1 < len(spans) else None
            start = (prev_end + s) / 2 if prev_end is not None else max(0.0, s - 0.1)
            end = (e + next_start) / 2 if next_start is not None else min(dur, e + 0.3)
            cuts.append((start, end))
        info = []
        for text, (start, end) in zip(c["phrases"], cuts):
            name = hashlib.sha1(f"{c['voice']}|{text}".encode("utf-8")).hexdigest()[:16] + ".mp3"
            length = end - start
            fade = f"afade=t=in:d=0.01,afade=t=out:st={max(0, length - 0.03):.3f}:d=0.03"
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{start:.3f}", "-to", f"{end:.3f}", "-i", str(raw),
                            "-af", fade, "-ac", "1", "-ar", "44100", "-b:a", "64k", str(AUDIO / name)], check=True)
            manifest[text] = name
            info.append(f"{length:.1f}")
            made += 1
        chars = sum(len(p) for p in c["phrases"])
        speech = sum(words[l]["end"] - words[f]["start"] for f, l in spans)
        print(f"  {c['id']} ({c['who']}): {len(spans)} фраз, {chars / max(speech, .1):.1f} симв/с, длины: {' '.join(info)}")
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    (AUDIO / "redo.json").write_text(json.dumps(redo), encoding="utf-8")
    if redo:
        print("Не удалось нарезать:", ", ".join(redo))
    print(f"Нарезано фраз: {made}. В manifest.json: {len(manifest)}")


if __name__ == "__main__":
    main()
