// Видео-объяснения из сценариев: video/scripts/<id>.json -> video/<id>.mp4 (+ обложка video/<id>.jpg).
//   cd anim && node render-video.mjs read-vowels              собрать и отрендерить один ролик
//   cd anim && node render-video.mjs a1-01-01 a1-01-02        несколько роликов подряд
//   cd anim && node render-video.mjs all --missing            все сценарии, у которых ещё нет mp4
//
//   --check        только проверить сценарии (VoiceStudio не нужен)
//   --audio        только озвучка и таймлайн, без рендера
//   --stills       по кадру из каждой сцены + общий лист video/.cache/stills/<id>.jpg (проверка вёрстки);
//                  --at=0.82 — в каком месте сцены брать кадр, --scale=0.3 — размер кадра
//   --frames=a-b   отрендерить только кадры a…b в video/.cache/<id>.part.mp4 (замер скорости)
//   --gl=swangle   графический движок Chromium (swangle — программный, angle — видеокарта)
//   --conc=2       сколько вкладок рендерят одновременно
//
// 1. Реплики учителя (ru) озвучивает VoiceStudio голосом scripts/voice-refs/teacher-ru.wav
//    (он должен быть открыт). Готовые реплики кэшируются в video/.cache — правка одной реплики
//    не переозвучивает остальные.
// 2. Немецкие слова и фразы (de) берутся из записей курса: audio/manifest.json.
// 3. Длительность каждой реплики задаёт таймлайн; громкость голоса по кадрам двигает учителя.
// 4. Картинки готовит scripts/video-cut.py: слова, сцены и портреты героев уменьшает (art/raw/words,
//    scenes, avatars), у рисунков для видео (art/raw/video) и маскота вырезает пурпурный фон.
// 5. Remotion рендерит шаблон src/video/Explainer.jsx: 1080×1920, на выходе 720×1280.
import { bundle } from '@remotion/bundler';
import { openBrowser, renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const argv = process.argv.slice(2);
const has = n => argv.includes(`--${n}`);
const opt = (n, d) => { const a = argv.find(x => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };

const scriptsDir = path.join(root, 'video/scripts');
const outDir = path.join(root, 'video');
let ids = argv.filter(a => !a.startsWith('--'));
if (ids.includes('all')) ids = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort();
if (has('missing')) ids = ids.filter(id => !fs.existsSync(path.join(outDir, `${id}.mp4`)));
if (!ids.length) { console.log('Нечего собирать. Укажите сценарий: node render-video.mjs read-vowels (или all)'); process.exit(has('missing') ? 0 : 1); }

const FPS = 30, START = 12, GAP = 8, DE_PAD = 8, END = 22;
const TYPES = ['title', 'image', 'rule', 'word', 'quiz', 'phrase', 'mnemonic', 'recap', 'outro', 'list', 'dialog', 'table', 'order', 'form', 'tip', 'compare', 'ask'];
const FLAGS = ['de', 'at', 'ch', 'ru', 'it', 'kz', 'uz'];
// Поле сценария -> [папка с исходниками, папка в video-public, размер]
const SRC = { img: ['art/raw/words', 'img', 640], scene: ['art/raw/scenes', 'scene', 1200], who: ['art/raw/avatars', 'ava', 300] };

const voices = JSON.parse(fs.readFileSync(path.join(root, 'scripts/voices-local.json'), 'utf8'));
const teacher = voices.teacherRu;
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'audio/manifest.json'), 'utf8'));
const pub = path.join(here, 'video-public');
const cache = path.join(root, 'video/.cache');
for (const d of [pub, cache, ...['narr', 'de', 'img', 'cut', 'scene', 'ava'].map(x => path.join(pub, x))]) fs.mkdirSync(d, { recursive: true });

// Обходит все поля сцены, кроме реплик.
function walk(o, fn) {
  if (Array.isArray(o)) { o.forEach(x => walk(x, fn)); return; }
  if (!o || typeof o !== 'object') return;
  for (const [k, v] of Object.entries(o)) {
    if (k === 'say') continue;
    fn(k, v);
    walk(v, fn);
  }
}

// ---------- Проверка сценария ----------
function check(id, script) {
  const errs = [];
  if (!Array.isArray(script.scenes) || !script.scenes.length) return [`${id}: в сценарии нет сцен`];
  script.scenes.forEach((sc, i) => {
    const bad = msg => errs.push(`${id}, сцена ${i + 1} (${sc.type}): ${msg}`);
    if (!TYPES.includes(sc.type)) bad('неизвестный тип сцены');
    if (!Array.isArray(sc.say) || !sc.say.length) { bad('нет реплик say'); return; }
    sc.say.forEach((it, k) => {
      if (it.ru) { if (/[A-Za-zÄÖÜäöüß]/.test(it.ru)) bad(`реплика ${k}: в тексте для голоса латиница — «${it.ru}»`); }
      else if (it.de) { if (!manifest[it.de]) bad(`реплика ${k}: нет записи «${it.de}» в audio/manifest.json`); }
      else if (!it.pause) bad(`реплика ${k}: нужно поле ru, de или pause`);
    });
    if (sc.type === 'word' || sc.type === 'quiz') {
      if (!sc.seg || !sc.snd) bad('нужны поля seg и snd');
      else if (sc.seg.split('|').length !== sc.snd.split('|').length) bad(`в seg и snd разное число частей: ${sc.seg} / ${sc.snd}`);
    }
    if (['word', 'quiz', 'ask'].includes(sc.type) && !sc.say.some(x => x.de)) bad('нужна реплика { de } с записью слова');
    if (['quiz', 'ask'].includes(sc.type) && !sc.say.some(x => x.pause)) bad('нужна реплика { pause } — время подумать');
    walk(sc, (k, v) => {
      if (SRC[k] && typeof v === 'string' && !fs.existsSync(path.join(root, SRC[k][0], `${v}.png`))) bad(`нет рисунка ${SRC[k][0]}/${v}.png`);
      if (k === 'art' && typeof v === 'string' && !fs.existsSync(path.join(root, 'art/raw/video', `${v}.png`))) bad(`нет рисунка art/raw/video/${v}.png`);
      if (k === 'flag' && !FLAGS.includes(v)) bad(`нет флага «${v}»`);
      if (['at', 'subAt', 'noteAt'].includes(k) && typeof v === 'number' && v >= sc.say.length) bad(`${k}: ${v} — такой реплики нет (всего ${sc.say.length})`);
    });
  });
  return errs;
}

const scripts = {};
const problems = [];
for (const id of ids) {
  const file = path.join(scriptsDir, `${id}.json`);
  if (!fs.existsSync(file)) { problems.push(`${id}: нет файла video/scripts/${id}.json`); continue; }
  try { scripts[id] = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { problems.push(`${id}: ${e.message}`); continue; }
  problems.push(...check(id, scripts[id]));
}
if (problems.length) { console.log(problems.join('\n')); console.log(`\nОшибок в сценариях: ${problems.length}`); process.exit(1); }
if (has('check')) {
  for (const id of ids) {
    const lines = scripts[id].scenes.flatMap(s => s.say).filter(x => x.ru).length;
    console.log(`${id}: сцен ${scripts[id].scenes.length}, реплик учителя ${lines}`);
  }
  console.log('Сценарии в порядке.');
  process.exit(0);
}

// ---------- Озвучка ----------
const duration = file => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim());
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Громкость по кадрам (0…1) — чтобы учитель «говорил» в такт голосу.
function envelope(file) {
  const raw = execFileSync('ffmpeg', ['-v', 'quiet', '-i', file, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], { maxBuffer: 64 << 20 });
  const s = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
  const win = Math.round(16000 / FPS);
  const out = [];
  for (let i = 0; i < s.length; i += win) {
    let sum = 0, n = 0;
    for (let j = i; j < Math.min(s.length, i + win); j++) { sum += s[j] * s[j]; n++; }
    out.push(Math.sqrt(sum / Math.max(1, n)));
  }
  const top = [...out].sort((a, b) => a - b)[Math.floor(out.length * 0.95)] || 1;
  return out.map(v => Math.round(Math.min(1, v / top) * 100) / 100);
}

// Один запрос к VoiceStudio; при сбое сети или сервера — ещё две попытки с паузой.
async function tts(text, seed, rawFile) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const form = new FormData();
      const fields = { text, language: 'ru', ref_text: teacher.refText, num_step: voices.numStep, speed: teacher.speed, seed };
      for (const [k, v] of Object.entries(fields)) form.append(k, String(v));
      form.append('ref_audio', new Blob([fs.readFileSync(path.join(root, teacher.ref))], { type: 'audio/wav' }), 'teacher.wav');
      const res = await fetch(`${voices.url}/generate`, { method: 'POST', body: form });
      const type = res.headers.get('content-type') || '';
      if (!res.ok || !type.startsWith('audio/')) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
      fs.writeFileSync(rawFile, Buffer.from(await res.arrayBuffer()));
      return;
    } catch (e) {
      lastErr = e;
      if (attempt < 2) await sleep(20000);
    }
  }
  throw new Error(`VoiceStudio не отвечает (${voices.url}): ${lastErr.message}`);
}

// Реплика учителя: VoiceStudio -> обрезка тишины -> громкость как у записей курса (-22 LUFS).
async function narrate(text) {
  const key = createHash('sha1').update(`${teacher.ref}|${teacher.seed}|${teacher.speed}|${text}`).digest('hex').slice(0, 16);
  const out = path.join(cache, `${key}.wav`);
  if (!fs.existsSync(out)) {
    // Очень короткие реплики модель иногда выдаёт тишиной: тогда пробуем другие seed,
    // а если не помогло — просим переписать реплику полным предложением.
    const rawFile = path.join(cache, `${key}.raw.wav`);
    let okTake = false;
    for (const seed of [teacher.seed, teacher.seed + 10, teacher.seed + 20]) {
      await tts(text, seed, rawFile);
      const { stderr: vd } = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', rawFile, '-af', 'volumedetect', '-f', 'null', '-']);
      const mean = Number((vd.match(/mean_volume:\s*(-?[\d.]+)/) || [])[1]);
      if (mean > -45) { okTake = true; break; }
    }
    if (!okTake) throw new Error(`Реплика получилась тишиной, перепишите её полным предложением: «${text}»`);
    const trim = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05';
    const tmp = path.join(cache, `${key}.trim.wav`);
    await run('ffmpeg', ['-y', '-v', 'error', '-i', rawFile, '-af', `${trim},areverse,${trim},areverse`, tmp]);
    const { stderr } = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', tmp, '-af', 'ebur128', '-f', 'null', '-']);
    const m = [...stderr.matchAll(/^\s+I:\s+(-?[\d.]+) LUFS/gm)].pop();
    const gain = m ? Math.max(-12, Math.min(12, -22 - Number(m[1]))) : 0;
    await run('ffmpeg', ['-y', '-v', 'error', '-i', tmp, '-af', `volume=${gain.toFixed(1)}dB,alimiter=limit=0.89:level=false`, '-ar', '44100', '-ac', '1', out]);
    fs.rmSync(rawFile); fs.rmSync(tmp);
    process.stdout.write('·');
  }
  const dst = path.join(pub, 'narr', `${key}.wav`);
  if (!fs.existsSync(dst)) fs.copyFileSync(out, dst);
  return { src: `narr/${key}.wav`, file: out };
}

// ---------- Таймлайн ----------
async function buildTimeline(id, script) {
  let f = 0;
  let lastRule = null;
  const scenes = [];
  for (const sc of script.scenes) {
    const from = f;
    let t = f + START;
    const segs = [];
    for (const it of sc.say) {
      if (it.pause) {
        const dur = Math.round(it.pause * FPS);
        segs.push({ kind: 'pause', from: t, dur });
        t += dur + GAP;
      } else if (it.ru) {
        if (has('draft')) {
          // Черновик для проверки вёрстки без VoiceStudio: длительность — по длине текста, без звука.
          const dur = Math.ceil((0.6 + it.ru.length / 13) * FPS);
          segs.push({ kind: 'ru', from: t, dur, src: null, cap: it.cap || it.ru, env: null });
          t += dur + GAP;
          continue;
        }
        const { src, file } = await narrate(it.ru);
        const dur = Math.ceil(duration(file) * FPS);
        segs.push({ kind: 'ru', from: t, dur, src, cap: it.cap || it.ru, env: envelope(file) });
        t += dur + GAP;
      } else if (it.de) {
        const mp3 = manifest[it.de];
        const dst = path.join(pub, 'de', mp3);
        if (!fs.existsSync(dst)) fs.copyFileSync(path.join(root, 'audio', mp3), dst);
        const dur = Math.ceil(duration(path.join(root, 'audio', mp3)) * FPS);
        segs.push({ kind: 'de', from: t, dur, src: `de/${mp3}`, cap: it.de });
        t += dur + GAP + DE_PAD;
      }
    }
    const dur = t - from - GAP + END;
    if (sc.type === 'rule') lastRule = sc;
    const teacherOn = sc.teacher ?? !['title', 'outro', 'dialog'].includes(sc.type);
    scenes.push({ ...sc, say: undefined, from, dur, teacher: teacherOn, ruleSnd: lastRule?.snd, rule: sc.rule ? lastRule?.big : undefined,
      segs: segs.map(x => ({ ...x, rf: x.from - from })) });
    f = from + dur;
  }
  const timeline = { id: script.id || id, kicker: script.kicker, title: script.title, chips: script.chips, duration: f, scenes };
  fs.writeFileSync(path.join(cache, `${id}.timeline.json`), JSON.stringify(timeline));
  return timeline;
}

const timelines = {};
for (const id of ids) {
  process.stdout.write(`${id} «${scripts[id].title}»: озвучка `);
  timelines[id] = await buildTimeline(id, scripts[id]);
  const sec = timelines[id].duration / FPS;
  console.log(` ${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}, сцен: ${timelines[id].scenes.length}`);
}
if (has('audio')) process.exit(0);

// ---------- Картинки ----------
const need = { img: new Set(), scene: new Set(), who: new Set(), art: new Set() };
for (const id of ids) walk(scripts[id].scenes, (k, v) => { if (need[k] && typeof v === 'string') need[k].add(v); });
const py = path.join(root, 'scripts/video-cut.py');
for (const [k, [srcDir, dstDir, size]] of Object.entries(SRC)) {
  const pairs = [...need[k]].flatMap(n => [path.join(root, srcDir, `${n}.png`), path.join(pub, dstDir, `${n}.jpg`)]);
  if (pairs.length) execFileSync('python', [py, `--fit=${size}`, ...pairs], { stdio: 'inherit' });
}
const cutPairs = [
  ['art/raw/mascot/wave.png', 'cut/mascot-wave.png'], ['art/raw/mascot/happy.png', 'cut/mascot-happy.png'],
  ['art/raw/video/teacher-talk.png', 'cut/teacher-talk.png'], ['art/raw/video/teacher-point.png', 'cut/teacher-point.png'],
  ...[...need.art].map(a => [`art/raw/video/${a}.png`, `cut/${a}.png`])
];
execFileSync('python', [py, ...cutPairs.flatMap(([a, b]) => [path.join(root, a), path.join(pub, b)])], { stdio: 'inherit' });
if (!fs.existsSync(path.join(pub, 'paper.jpg'))) execFileSync('python', [path.join(root, 'scripts/video-paper.py'), path.join(pub, 'paper.jpg')], { stdio: 'inherit' });

// ---------- Рендер ----------
console.log('Сборка проекта Remotion…');
const serveUrl = await bundle({ entryPoint: path.join(here, 'src/video/index.jsx'), publicDir: pub });
const gl = opt('gl', 'swangle');
const concurrency = Number(opt('conc', 2));
const failed = [];

// --stills: по кадру из каждой сцены (ближе к концу сцены, когда всё уже на экране) — быстро проверить вёрстку.
if (has('stills')) {
  const scale = Number(opt('scale', 0.3));
  const frac = Number(opt('at', 0.82));
  let browser = null;
  try { browser = await openBrowser('chrome', { chromiumOptions: { gl }, forceDeviceScaleFactor: scale }); } catch { browser = null; }
  for (const id of ids) {
    const timeline = timelines[id];
    const inputProps = { timeline };
    const dir = path.join(cache, 'stills', id);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    try {
      const composition = await selectComposition({ serveUrl, id: 'Explainer', inputProps, puppeteerInstance: browser ?? undefined });
      for (const [i, sc] of timeline.scenes.entries()) {
        const frame = Math.min(timeline.duration - 1, sc.from + Math.floor(sc.dur * frac));
        await renderStill({ composition, serveUrl, inputProps, frame, output: path.join(dir, `${String(i).padStart(2, '0')}-${sc.type}.jpg`),
          imageFormat: 'jpeg', jpegQuality: 72, scale, chromiumOptions: { gl }, puppeteerInstance: browser ?? undefined });
      }
      execFileSync('python', [path.join(root, 'scripts/video-sheet.py'), dir, path.join(cache, 'stills', `${id}.jpg`), opt('cols', '6')], { stdio: 'inherit' });
    } catch (e) {
      failed.push(id);
      console.log(`${id}: ошибка — ${e.message}`);
    }
  }
  if (browser) await browser.close({ silent: true });
  process.exit(failed.length ? 1 : 0);
}

const range = opt('frames', '');
for (const id of ids) {
  const timeline = timelines[id];
  const inputProps = { timeline };
  const started = Date.now();
  try {
    const composition = await selectComposition({ serveUrl, id: 'Explainer', inputProps, chromiumOptions: { gl } });
    const frameRange = range ? range.split('-').map(Number) : null;
    const out = range ? path.join(cache, `${id}.part.mp4`) : path.join(outDir, `${id}.mp4`);
    let last = -1;
    await renderMedia({
      composition, serveUrl, inputProps, codec: 'h264', crf: 26, pixelFormat: 'yuv420p', audioBitrate: '96k', scale: 2 / 3,
      outputLocation: out, chromiumOptions: { gl }, concurrency, frameRange,
      onProgress: ({ progress }) => { const p = Math.floor(progress * 20); if (p !== last) { last = p; process.stdout.write(`\r${id}: рендер ${p * 5}%`); } }
    });
    const secs = (Date.now() - started) / 1000;
    const frames = frameRange ? frameRange[1] - frameRange[0] + 1 : timeline.duration;
    if (!range) await renderStill({ composition, serveUrl, inputProps, frame: Math.min(75, timeline.duration - 1), output: path.join(outDir, `${id}.jpg`), imageFormat: 'jpeg', jpegQuality: 80, scale: 0.5, chromiumOptions: { gl } });
    console.log(`\r${id}: готово — ${path.relative(root, out).replace(/\\/g, '/')} (${(fs.statSync(out).size / 1048576).toFixed(1)} МБ), ${Math.round(secs)} с, ${(frames / secs).toFixed(1)} кадр/с`);
  } catch (e) {
    failed.push(id);
    console.log(`\n${id}: ошибка рендера — ${e.message}`);
  }
}
if (failed.length) { console.log(`Не собраны: ${failed.join(', ')}`); process.exit(1); }
