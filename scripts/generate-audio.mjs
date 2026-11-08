#!/usr/bin/env node
// Живая озвучка через ElevenLabs. Ключ API — только из переменной окружения, в файлы не пишется.
//
//   node scripts/generate-audio.mjs --dry-run   посчитать фразы и символы, записать audio/TODO.md
//   node scripts/generate-audio.mjs             сгенерировать недостающие mp3 (нужен ELEVENLABS_API_KEY)
//
// Генерируются только новые фразы: уже озвученные лежат в audio/manifest.json.
import { readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dry = process.argv.includes('--dry-run');
const read = async p => JSON.parse(await readFile(path.join(root, p), 'utf8'));

const course = await read('content/course.json');
const voices = await read('scripts/voices.json');
const manifestPath = path.join(root, 'audio/manifest.json');
let manifest = {};
try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); } catch { manifest = {}; }

// ---------- Сбор фраз: ровно те строки, которые приложение передаёт в озвучку ----------
const items = new Map(); // текст -> кто говорит
const add = (text, who = 'default') => {
  const t = String(text ?? '').replace(/<[^>]+>/g, '').replace(/[_]+/g, '…').trim();
  if (!t || /[а-яё]/i.test(t) || t === '…') return;
  if (!items.has(t)) items.set(t, who);
};
const tokens = s => String(s).split(/\s+/).map(t => t.replace(/^[„“"«(]+|[.,!?;:„“"»)]+$/g, '')).filter(Boolean);

function collectExercise(ex) {
  if (!ex || typeof ex !== 'object') return;
  const who = ex.who || 'default';
  add(ex.de, who); add(ex.line, who); add(ex.audio && typeof ex.audio === 'string' ? ex.audio : null, who);
  if (typeof ex.answer === 'string') { add(ex.answer); tokens(ex.answer).forEach(t => add(t)); (ex.distract || []).forEach(t => add(t)); }
  if (ex.type === 'gap' && ex.text) add(ex.text.replace('___', ex.options[ex.answer]));
  if (ex.type === 'tf') add(ex.statement);
  (ex.options || []).forEach(o => { if (typeof o === 'string') add(o); else if (o && o.de) add(o.de); });
  if (Array.isArray(ex.audio)) ex.audio.forEach(l => add(l.de, l.who));
  (ex.examples || []).forEach(e => add(e.de));
  (ex.accept || []).slice(0, 1).forEach(a => add(a));
}

for (const level of course.levels) {
  for (const t of level.topics) {
    if (!t.ready || !t.file) continue;
    const topic = await read(`content/${t.file}`);
    for (const w of topic.words) {
      add(w.art ? `${w.art} ${w.de}` : w.de);
      add(w.de);
      if (w.ex) add(w.ex.de);
    }
    for (const l of topic.lessons) {
      (l.scene?.lines || []).forEach(x => add(x.de, x.who));
      (l.exercises || []).forEach(collectExercise);
      (l.boss?.turns || []).forEach(collectExercise);
    }
    (topic.story?.sentences || []).forEach(s => add(s.de, s.who || 'f'));
    (topic.story?.questions || []).forEach(collectExercise);
    (topic.test?.parts || []).forEach(p => p.items.forEach(collectExercise));
  }
}

const missing = [...items].filter(([text]) => !manifest[text]);
const chars = missing.reduce((n, [t]) => n + t.length, 0);
console.log(`Фраз всего: ${items.size}. Без озвучки: ${missing.length}. Символов к генерации: ${chars}.`);

if (dry) {
  const lines = [
    '# Фразы для живой озвучки',
    '',
    `Без озвучки: ${missing.length} фраз, ${chars} символов (ElevenLabs списывает кредиты за символы).`,
    '',
    'Сгенерировать: задайте переменную окружения `ELEVENLABS_API_KEY`, впишите ID голосов в `scripts/voices.json` и запустите `node scripts/generate-audio.mjs`.',
    '',
    '| Кто | Фраза |',
    '| --- | --- |',
    ...missing.map(([t, w]) => `| ${w} | ${t.replace(/\|/g, '\\|')} |`)
  ];
  await writeFile(path.join(root, 'audio/TODO.md'), lines.join('\n') + '\n', 'utf8');
  console.log('Список записан в audio/TODO.md');
  process.exit(0);
}

const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error('Нет переменной окружения ELEVENLABS_API_KEY. Задайте её и запустите снова (или используйте --dry-run).');
  process.exit(1);
}
const voiceFor = who => {
  const v = voices.voices || {};
  if (v[who]) return v[who];
  if ((voices.female || []).includes(who) && v.f) return v.f;
  if ((voices.male || []).includes(who) && v.m) return v.m;
  return v.default;
};
if (!voiceFor('default')) {
  console.error('Впишите хотя бы голос "default" в scripts/voices.json.');
  process.exit(1);
}

let done = 0;
for (const [text, who] of missing) {
  const voice = voiceFor(who);
  const file = `${createHash('sha1').update(`${voice}|${text}`).digest('hex').slice(0, 16)}.mp3`;
  const out = path.join(root, 'audio', file);
  try { await access(out); manifest[text] = file; continue; } catch { /* файла нет — генерируем */ }
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: voices.model || 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75 } })
  });
  if (!res.ok) {
    console.error(`Ошибка ${res.status} для «${text}»: ${await res.text()}`);
    if (res.status === 401 || res.status === 402 || res.status === 429) break;
    continue;
  }
  await writeFile(out, Buffer.from(await res.arrayBuffer()));
  manifest[text] = file;
  done++;
  if (done % 10 === 0) await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  process.stdout.write(`\r${done}/${missing.length}`);
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`\nГотово: ${done} новых файлов. После генерации увеличьте VERSION в sw.js.`);
