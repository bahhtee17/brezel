// Озвучка и распознавание речи.
// 1) Если для фразы есть живая запись (audio/manifest.json, ElevenLabs) — играем её.
// 2) Иначе — голос браузера (Web Speech API, немецкий).
import { setting } from './store.js';

let audioMap = {};
let voices = [];
let current = null;

export async function initSpeech() {
  try {
    const r = await fetch('audio/manifest.json', { cache: 'no-cache' });
    if (r.ok) audioMap = await r.json();
  } catch { audioMap = {}; }
  if ('speechSynthesis' in window) {
    const load = () => { voices = speechSynthesis.getVoices().filter(v => /^de(-|_|$)/i.test(v.lang)); };
    load();
    speechSynthesis.addEventListener?.('voiceschanged', load);
  }
}

export const canSpeak = () => 'speechSynthesis' in window || Object.keys(audioMap).length > 0;

// Разные персонажи — разные голоса и высота, чтобы диалоги не звучали одинаково.
const VOICE_STYLE = {
  lena: { pref: 'f', pitch: 1.12, rate: 0.95 },
  aigerim: { pref: 'f', pitch: 1.2, rate: 0.92 },
  wagner: { pref: 'f', pitch: 0.95, rate: 0.88 },
  woman: { pref: 'f', pitch: 1.05, rate: 0.95 },
  f: { pref: 'f', pitch: 1.08, rate: 0.95 },
  tom: { pref: 'm', pitch: 0.95, rate: 1.0 },
  marco: { pref: 'm', pitch: 1.05, rate: 0.98 },
  becker: { pref: 'm', pitch: 0.85, rate: 0.9 },
  driver: { pref: 'm', pitch: 0.9, rate: 0.95 },
  passenger: { pref: 'm', pitch: 1.0, rate: 0.95 },
  man: { pref: 'm', pitch: 0.9, rate: 0.95 },
  m: { pref: 'm', pitch: 0.92, rate: 0.95 },
  brezel: { pref: 'm', pitch: 1.3, rate: 0.95 }
};
const FEMALE = /(female|frau|katja|amala|seraphina|vicki|marlene|anna|petra|hedda|helena|elke|gisela|klarissa|louisa|maja|tanja|yara)/i;
const MALE = /(male|mann|conrad|florian|stefan|hans|markus|yannick|killian|kasper|bernd|christoph|ralf|klaus|jonas)/i;

function pickVoice(pref) {
  if (!voices.length && 'speechSynthesis' in window) voices = speechSynthesis.getVoices().filter(v => /^de(-|_|$)/i.test(v.lang));
  if (!voices.length) return null;
  const de = voices.filter(v => /de-DE/i.test(v.lang));
  const pool = de.length ? de : voices;
  const nice = pool.filter(v => /(natural|online|google|neural|premium|enhanced)/i.test(v.name));
  const ranked = nice.length ? nice : pool;
  const re = pref === 'f' ? FEMALE : pref === 'm' ? MALE : null;
  return (re && ranked.find(v => re.test(v.name))) || (re && pool.find(v => re.test(v.name))) || ranked[0];
}

export function stop() {
  try { speechSynthesis.cancel(); } catch { /* ignore */ }
  if (current) { current.pause(); current = null; }
}

// Произнести немецкий текст. Возвращает промис, который завершится после озвучки.
export function say(text, { who = '', slow = false } = {}) {
  stop();
  const clean = String(text || '').replace(/[_]+/g, '…').trim();
  if (!clean) return Promise.resolve();
  const slowMode = slow || setting('slow');
  const file = audioMap[clean];
  if (file) {
    return new Promise(res => {
      const a = new Audio(`audio/${file}`);
      a.playbackRate = slowMode ? 0.72 : 1;
      a.onended = a.onerror = () => res();
      current = a;
      a.play().catch(() => res());
    });
  }
  if (!('speechSynthesis' in window)) return Promise.resolve();
  return new Promise(res => {
    const st = VOICE_STYLE[who] || {};
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'de-DE';
    const v = pickVoice(st.pref);
    if (v) u.voice = v;
    u.pitch = st.pitch || 1;
    u.rate = (st.rate || 0.95) * (slowMode ? 0.62 : 1);
    let done = false;
    const finish = () => { if (!done) { done = true; res(); } };
    u.onend = finish; u.onerror = finish;
    // Подстраховка: некоторые браузеры не присылают onend.
    setTimeout(finish, 1200 + clean.length * 140 * (slowMode ? 1.7 : 1));
    speechSynthesis.speak(u);
  });
}

export async function sayLines(lines, onLine) {
  for (let i = 0; i < lines.length; i++) {
    onLine?.(i);
    await say(lines[i].de, { who: lines[i].who });
    await new Promise(r => setTimeout(r, 250));
  }
  onLine?.(-1);
}

// ---------- Распознавание речи ----------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const canListen = () => !!SR;

export function listen({ timeout = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!SR) return reject(new Error('unsupported'));
    stop();
    const rec = new SR();
    rec.lang = 'de-DE';
    rec.interimResults = false;
    rec.maxAlternatives = 4;
    let finished = false;
    const end = (fn, v) => { if (!finished) { finished = true; clearTimeout(t); try { rec.stop(); } catch { /* ignore */ } fn(v); } };
    rec.onresult = e => {
      const alts = [];
      const res = e.results[0];
      for (let i = 0; i < res.length; i++) alts.push(res[i].transcript);
      end(resolve, alts);
    };
    rec.onerror = e => end(reject, new Error(e.error || 'error'));
    rec.onend = () => end(resolve, []);
    const t = setTimeout(() => end(resolve, []), timeout);
    try { rec.start(); } catch (err) { end(reject, err); }
  });
}

// ---------- Сравнение текста ----------
export function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[’'`´]/g, '')
    .replace(/[.,!?;:„“"«»()\-–—…]/g, ' ')
    .replace(/ß/g, 'ss').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
    .replace(/\s+/g, ' ')
    .trim();
}

export function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const d = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = d[0]; d[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return d[n];
}

// Проверка письменного ответа: точное совпадение или одна опечатка в длинной фразе.
export function matchText(input, accepts) {
  const x = norm(input);
  if (!x) return { ok: false };
  let best = { ok: false, typo: false, target: accepts[0] };
  for (const a of accepts) {
    const y = norm(a);
    if (x === y) return { ok: true, typo: false, target: a };
    const dist = lev(x, y);
    if (y.length >= 6 && dist <= 1 && !best.ok) best = { ok: true, typo: true, target: a };
  }
  return best;
}

// Пословное сравнение сказанного с образцом: какие слова совпали.
export function diffWords(target, heard) {
  const T = norm(target).split(' ').filter(Boolean);
  const H = norm(heard).split(' ').filter(Boolean);
  const dp = Array.from({ length: T.length + 1 }, () => new Array(H.length + 1).fill(0));
  const eq = (a, b) => a === b || (a.length > 4 && lev(a, b) <= 1);
  for (let i = T.length - 1; i >= 0; i--)
    for (let j = H.length - 1; j >= 0; j--)
      dp[i][j] = eq(T[i], H[j]) ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ok = new Array(T.length).fill(false);
  let i = 0, j = 0;
  while (i < T.length && j < H.length) {
    if (eq(T[i], H[j])) { ok[i] = true; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  const words = String(target).replace(/[.,!?;:„“"«»]/g, '').split(/\s+/).filter(Boolean);
  const score = T.length ? ok.filter(Boolean).length / T.length : 0;
  return { words: words.map((w, k) => ({ w, ok: !!ok[k] })), score };
}

// ---------- Звуки интерфейса (синтез, без файлов) ----------
let ctx = null;
export function sfx(kind) {
  if (!setting('sfx')) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = { ok: [660, 880], bad: [300, 220], combo: [660, 880, 1100], done: [523, 659, 784, 1047], tap: [520] }[kind] || [440];
    const t0 = ctx.currentTime;
    notes.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = kind === 'bad' ? 'triangle' : 'sine';
      o.frequency.value = f;
      const s = t0 + i * 0.09;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(kind === 'tap' ? 0.05 : 0.14, s + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.18);
      o.connect(g).connect(ctx.destination);
      o.start(s); o.stop(s + 0.2);
    });
  } catch { /* звук недоступен */ }
}
