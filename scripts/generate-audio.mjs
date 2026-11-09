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
import { collectPhrases } from './phrases.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dry = process.argv.includes('--dry-run');
const read = async p => JSON.parse(await readFile(path.join(root, p), 'utf8'));

const voices = await read('scripts/voices.json');
const manifestPath = path.join(root, 'audio/manifest.json');
let manifest = {};
try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); } catch { manifest = {}; }

const items = await collectPhrases(root); // текст -> кто говорит

const missing = [...items].filter(([text]) => !manifest[text]);
const chars = missing.reduce((n, [t]) => n + t.length, 0);
console.log(`Фраз всего: ${items.size}. Без озвучки: ${missing.length}. Символов к генерации: ${chars}.`);

if (dry) {
  const lines = [
    '# Фразы для живой озвучки',
    '',
    `Без озвучки: ${missing.length} фраз, ${chars} символов (ElevenLabs списывает кредиты за символы).`,
    '',
    'Бесплатно: откройте VoiceStudio и запустите `node scripts/generate-audio-local.mjs`. Через ElevenLabs: задайте переменную окружения `ELEVENLABS_API_KEY`, впишите ID голосов в `scripts/voices.json` и запустите `node scripts/generate-audio.mjs`.',
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
// --pick-voices: подобрать голоса героям из голосов вашего аккаунта (пол, возраст, немецкий язык).
// Уже вписанные вручную ID не трогаются. Результат — в scripts/voices.json.
const PROFILE = {
  default: ['female', 'middle_aged'], f: ['female', 'middle_aged'], m: ['male', 'middle_aged'],
  lena: ['female', 'young'], tom: ['male', 'young'], wagner: ['female', 'old'], marco: ['male', 'young'],
  aigerim: ['female', 'young'], becker: ['male', 'old'], passenger: ['male', 'middle_aged'],
  man: ['male', 'middle_aged'], woman: ['female', 'middle_aged'], driver: ['male', 'middle_aged']
};
if (process.argv.includes('--pick-voices')) {
  const r = await fetch('https://api.elevenlabs.io/v2/voices?page_size=100', { headers: { 'xi-api-key': key } });
  if (!r.ok) { console.error(`Ошибка ${r.status}: ${await r.text()}`); process.exit(1); }
  const list = (await r.json()).voices || [];
  const german = v => (v.verified_languages || []).some(l => l.language === 'de') || /german|deutsch/i.test(JSON.stringify(v.labels || {}));
  const used = new Map();
  const score = (v, [gender, age]) => {
    const L = v.labels || {};
    if (L.gender !== gender) return -1;
    return 10 + ((L.age || '').replace(/\s+/g, '_') === age ? 4 : 0) + (german(v) ? 6 : 0) - (used.get(v.voice_id) || 0) * 5;
  };
  voices.voices = voices.voices || {};
  for (const [who, prof] of Object.entries(PROFILE)) {
    if (voices.voices[who]) continue;
    const best = list.map(v => [score(v, prof), v]).filter(([s]) => s >= 0).sort((a, b) => b[0] - a[0])[0];
    if (!best) { console.log(`${who}: подходящего голоса нет`); continue; }
    const v = best[1];
    voices.voices[who] = v.voice_id;
    used.set(v.voice_id, (used.get(v.voice_id) || 0) + 1);
    console.log(`${who.padEnd(10)} → ${v.name} (${v.labels?.gender || '?'}, ${v.labels?.age || '?'}${german(v) ? ', немецкий' : ''})`);
  }
  await writeFile(path.join(root, 'scripts/voices.json'), JSON.stringify(voices, null, 2) + '\n', 'utf8');
  console.log(`Голосов в аккаунте: ${list.length}. Записано в scripts/voices.json.`);
  process.exit(0);
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
  // 64 кбит/с: для речи звучит чисто, а файлы в 2 раза легче — курс быстрее скачивается на телефон.
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=${voices.format || 'mp3_44100_64'}`, {
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
