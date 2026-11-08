// Рендерит анимации карточек: art/raw/anim/<key>-a.png, -b.png … -> img/anim/<key>.mp4
// Кадр «a» берётся из art/raw/words/<key>.png, если его нет. Позы b, c рисует Codex.
// Запуск: cd anim && npm run render   (--force — перерисовать всё)
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const framesDir = path.join(root, 'art/raw/anim');
const wordsDir = path.join(root, 'art/raw/words');
const outDir = path.join(root, 'img/anim');
const force = process.argv.includes('--force');
const only = process.argv.filter(a => !a.startsWith('--')).slice(2);

fs.mkdirSync(framesDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });
const mtime = p => (fs.existsSync(p) ? fs.statSync(p).mtimeMs : 0);

const list = JSON.parse(fs.readFileSync(path.join(here, 'animations.json'), 'utf8'))
  .filter(a => !only.length || only.includes(a.key));

const jobs = [];
for (const a of list) {
  const src = path.join(wordsDir, `${a.key}.png`);
  const first = path.join(framesDir, `${a.key}-a.png`);
  if (fs.existsSync(src) && mtime(src) > mtime(first)) fs.copyFileSync(src, first);
  if (!fs.existsSync(first)) { console.log(`skip ${a.key}: нет картинки слова`); continue; }
  const frames = ['a', 'b', 'c', 'd'].map(s => `${a.key}-${s}.png`).filter(f => fs.existsSync(path.join(framesDir, f)));
  if (frames.length < 2 && !a.motion) { console.log(`skip ${a.key}: нет второй позы и нет движения`); continue; }
  const out = path.join(outDir, `${a.key}.mp4`);
  const newest = Math.max(...frames.map(f => mtime(path.join(framesDir, f))), mtime(path.join(here, 'animations.json')));
  if (!force && mtime(out) > newest) continue;
  jobs.push({ ...a, frames, out });
}

if (!jobs.length) { console.log('Нечего рендерить.'); process.exit(0); }

console.log(`Сборка проекта… (${jobs.length} анимаций)`);
const serveUrl = await bundle({ entryPoint: path.join(here, 'src/index.jsx'), publicDir: framesDir });

for (const j of jobs) {
  const inputProps = { frames: j.frames };
  const composition = await selectComposition({ serveUrl, id: j.key, inputProps });
  await renderMedia({
    composition, serveUrl, inputProps,
    codec: 'h264', crf: 30, pixelFormat: 'yuv420p',
    outputLocation: j.out,
    chromiumOptions: { gl: 'swangle' },
  });
  console.log(`  ${j.key}.mp4  ${(fs.statSync(j.out).size / 1024).toFixed(0)} KB  (${j.frames.length} поз${j.motion ? ', ' + j.motion : ''})`);
}
console.log('Готово. Теперь: python scripts/process-art.py — обновит img/index.json');
