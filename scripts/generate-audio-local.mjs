#!/usr/bin/env node
// Бесплатная живая озвучка на своём компьютере через VoiceStudio (модель OmniVoice).
// VoiceStudio должен быть открыт: его сервер слушает http://localhost:3900.
//
//   node scripts/generate-audio-local.mjs --dry-run      сколько фраз без озвучки
//   node scripts/generate-audio-local.mjs                озвучить недостающие фразы
//   node scripts/generate-audio-local.mjs --design lena  заново создать образец голоса героя
//                                                        (instruct и seed — в scripts/voices-local.json)
//
// Озвучиваются только фразы, которых нет в audio/manifest.json, поэтому записи ElevenLabs не трогаются.
// Лицензия OmniVoice — CC BY-NC: эти записи нельзя использовать в платном курсе.
import { readFile, writeFile, mkdir, rm, access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectPhrases } from './phrases.mjs';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const cfg = JSON.parse(await readFile(path.join(root, 'scripts/voices-local.json'), 'utf8'));
const manifestPath = path.join(root, 'audio/manifest.json');
let manifest = {};
try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); } catch { manifest = {}; }
const refPath = who => path.join(root, 'scripts/voice-refs', `${who}.wav`);
const tmp = path.join(tmpdir(), `brezel-tts-${process.pid}`);

const voiceFor = who => {
  if (cfg.voices[who]) return who;
  if (cfg.female.includes(who)) return 'f';
  if (cfg.male.includes(who)) return 'm';
  return 'default';
};

async function generate(fields, refFile) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null) form.append(k, String(v));
  if (refFile) form.append('ref_audio', new Blob([await readFile(refFile)], { type: 'audio/wav' }), path.basename(refFile));
  const res = await fetch(`${cfg.url}/generate`, { method: 'POST', body: form });
  const type = res.headers.get('content-type') || '';
  if (!res.ok || !type.startsWith('audio/')) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return Buffer.from(await res.arrayBuffer());
}

// Обрезать тишину по краям, выровнять громкость под записи ElevenLabs и сжать в mp3 44,1 кГц 64 кбит/с.
async function toMp3(wavBuf, out) {
  const a = path.join(tmp, 'a.wav'), b = path.join(tmp, 'b.wav');
  await mkdir(tmp, { recursive: true });
  await writeFile(a, wavBuf);
  const trim = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04';
  await run('ffmpeg', ['-y', '-v', 'error', '-i', a, '-af', `${trim},areverse,${trim},areverse`, b]);
  const { stderr } = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', b, '-af', 'ebur128', '-f', 'null', '-']);
  const m = [...stderr.matchAll(/^\s+I:\s+(-?[\d.]+) LUFS/gm)].pop();
  const measured = m ? Number(m[1]) : NaN;
  const gain = Number.isFinite(measured) && measured > -60 ? Math.max(-12, Math.min(12, cfg.loudness - measured)) : 0;
  await run('ffmpeg', ['-y', '-v', 'error', '-i', b, '-af', `volume=${gain.toFixed(1)}dB,alimiter=limit=0.89:level=false`,
    '-ar', '44100', '-ac', '1', '-b:a', '64k', out]);
}

try {
  // ---------- Образец голоса героя ----------
  const di = args.indexOf('--design');
  if (di >= 0) {
    const who = args[di + 1];
    const v = cfg.voices[who];
    if (!v) throw new Error(`Нет героя «${who}» в scripts/voices-local.json`);
    const wav = await generate({ text: cfg.refText, language: cfg.language, instruct: v.instruct, seed: v.seed, num_step: cfg.numStep });
    await mkdir(path.dirname(refPath(who)), { recursive: true });
    await writeFile(refPath(who), wav);
    console.log(`Образец голоса «${who}» записан: scripts/voice-refs/${who}.wav`);
    process.exit(0);
  }

  // ---------- Озвучка недостающих фраз ----------
  const items = await collectPhrases(root);
  const missing = [...items].filter(([text]) => !manifest[text]);
  console.log(`Фраз всего: ${items.size}. Без озвучки: ${missing.length}.`);
  if (args.includes('--dry-run') || !missing.length) process.exit(0);

  try { await fetch(`${cfg.url}/health`); } catch {
    throw new Error(`VoiceStudio не отвечает на ${cfg.url}. Откройте программу и подождите, пока загрузится модель.`);
  }
  for (const who of new Set(missing.map(([, w]) => voiceFor(w)))) {
    try { await access(refPath(who)); } catch { throw new Error(`Нет образца голоса: node scripts/generate-audio-local.mjs --design ${who}`); }
  }

  let done = 0, failed = 0;
  for (const [text, w] of missing) {
    const who = voiceFor(w);
    const file = `${createHash('sha1').update(`omnivoice|${who}|${text}`).digest('hex').slice(0, 16)}.mp3`;
    const out = path.join(root, 'audio', file);
    try {
      // speed 0.8: OmniVoice говорит примерно на 30% быстрее записей ElevenLabs, для новичка это слишком быстро.
      const wav = await generate({ text, language: cfg.language, ref_text: cfg.refText, num_step: cfg.numStep, speed: cfg.speed ?? 1, seed: cfg.voices[who].seed }, refPath(who));
      await toMp3(wav, out);
      manifest[text] = file;
      done++;
      if (done % 10 === 0) await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
      process.stdout.write(`\r${done}/${missing.length}`);
    } catch (e) {
      failed++;
      console.error(`\nНе получилось «${text}» (${who}): ${e.message}`);
    }
  }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nГотово: ${done} новых файлов${failed ? `, ошибок: ${failed}` : ''}. После генерации увеличьте VERSION в sw.js.`);
} finally {
  await rm(tmp, { recursive: true, force: true });
}
