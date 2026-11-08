// Интервальное повторение: у каждого слова «сила памяти» (коробка 1–6).
// Верный ответ отодвигает повторение, ошибка возвращает слово в начало и в тетрадь ошибок.
import { get, save, today, addDays } from './store.js';

export const INTERVALS = [0, 1, 3, 7, 14, 30, 60]; // дней до следующего повторения для коробки N
export const MAX_BOX = 6;

export function learn(wordId) {
  const s = get().srs;
  if (!s[wordId]) {
    s[wordId] = { box: 1, due: addDays(today(), 1), right: 0, wrong: 0, last: today() };
    save();
  }
}

export function grade(wordId, ok, recordMistake = true) {
  const s = get().srs;
  const it = s[wordId];
  if (!it) return;
  const t = today();
  if (ok) {
    // Повторять раньше срока можно, но коробка растёт только при повторении в срок.
    if (it.due <= t) it.box = Math.min(MAX_BOX, it.box + 1);
    it.due = addDays(t, INTERVALS[it.box]);
    it.right++;
  } else {
    it.box = 1;
    it.due = t;
    it.wrong++;
    if (recordMistake) addMistake('word', wordId);
  }
  it.last = t;
  save();
}

export const strength = wordId => get().srs[wordId]?.box || 0;
export const isLearned = wordId => !!get().srs[wordId];
export const learnedIds = () => Object.keys(get().srs);

export function dueIds() {
  const t = today();
  return Object.entries(get().srs)
    .filter(([, v]) => v.due <= t)
    .sort((a, b) => a[1].box - b[1].box || a[1].due.localeCompare(b[1].due))
    .map(([k]) => k);
}

export function nextDueDay() {
  const days = Object.values(get().srs).map(v => v.due).sort();
  return days[0] || null;
}

// ---------- Тетрадь ошибок ----------
// Элемент уходит из тетради после 3 верных ответов подряд в разные дни.
export const MISTAKE_DAYS = 3;

export function addMistake(kind, ref, payload = null) {
  const m = get().mistakes;
  const key = `${kind}:${ref}`;
  if (m[key]) { m[key].hits = []; if (payload) m[key].payload = payload; }
  else m[key] = { kind, ref, payload, hits: [], added: today() };
  save();
  return key;
}

export function mistakeCorrect(kind, ref) {
  const m = get().mistakes;
  const key = `${kind}:${ref}`;
  const it = m[key];
  if (!it) return false;
  const t = today();
  if (!it.hits.includes(t)) it.hits.push(t);
  let removed = false;
  if (it.hits.length >= MISTAKE_DAYS) { delete m[key]; removed = true; }
  save();
  return removed;
}

export function mistakeWrong(kind, ref) {
  const it = get().mistakes[`${kind}:${ref}`];
  if (it) { it.hits = []; save(); }
}

export const mistakes = () => Object.entries(get().mistakes).map(([key, v]) => ({ key, ...v }));
export const mistakeCount = () => Object.keys(get().mistakes).length;
