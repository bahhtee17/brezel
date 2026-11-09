#!/usr/bin/env node
// Озвучка через плагин ElevenLabs (без ключа API): фразы одного героя склеиваются в небольшие «пачки»,
// каждая фраза — с новой строки (абзацем). Плагин озвучивает пачку целиком, затем
// scripts/audio-split.py режет запись по естественным паузам на отдельные mp3.
// Теги <break> не используем: при нескольких паузах модель начинает тараторить (в 2–2,5 раза быстрее).
//
//   node scripts/audio-chunks.mjs   -> audio/chunks.json (какие пачки озвучить и каким голосом)
//
// Список фраз и голосов — тот же, что у generate-audio.mjs (audio/TODO.md, scripts/voices.json).
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const voices = JSON.parse(await readFile(path.join(root, 'scripts/voices.json'), 'utf8'));
let manifest = {};
try { manifest = JSON.parse(await readFile(path.join(root, 'audio/manifest.json'), 'utf8')); } catch { /* пусто */ }

const todo = (await readFile(path.join(root, 'audio/TODO.md'), 'utf8')).split('\n')
  .filter(l => l.startsWith('| ') && !l.startsWith('| Кто') && !l.startsWith('| ---'))
  .map(l => { const m = l.match(/^\| ([^|]+) \| (.*) \|$/); return m && { who: m[1].trim(), text: m[2].replace(/\\\|/g, '|').trim() }; })
  .filter(x => x && !manifest[x.text]);

const v = voices.voices;
const voiceFor = who => v[who] || ((voices.female || []).includes(who) ? v.f : (voices.male || []).includes(who) ? v.m : '') || v.default;

const MAX_PHRASES = 8, MAX_CHARS = 320, SEP = '\n\n';
// Фраза без знака в конце получает точку — так модель делает паузу и ровную интонацию.
const spoken = t => (/[.!?…“"»]$/.test(t) ? t : `${t}.`);
const byVoice = new Map();
for (const p of todo) {
  const voice = voiceFor(p.who);
  if (!byVoice.has(voice)) byVoice.set(voice, []);
  byVoice.get(voice).push(p);
}
const chunks = [];
for (const [voice, list] of byVoice) {
  let cur = [];
  const flush = () => { if (cur.length) chunks.push({ id: `p${String(chunks.length + 1).padStart(3, '0')}`, voice, who: [...new Set(cur.map(p => p.who))].join(','), phrases: cur.map(p => p.text), text: cur.map(p => spoken(p.text)).join(SEP) }); cur = []; };
  for (const p of list) {
    const chars = cur.reduce((n, x) => n + x.text.length, 0);
    if (cur.length >= MAX_PHRASES || chars + p.text.length > MAX_CHARS) flush();
    cur.push(p);
  }
  flush();
}
await writeFile(path.join(root, 'audio/chunks.json'), JSON.stringify(chunks, null, 1), 'utf8');
const chars = chunks.reduce((n, c) => n + c.phrases.join('').length, 0);
console.log(`Пачек: ${chunks.length}, фраз: ${todo.length}, символов текста: ${chars}`);
