// Прогресс ученика в localStorage. Все чтения и записи защищены: без хранилища приложение тоже работает.
const KEY = 'brezel.progress.v1';

const fresh = () => ({
  xp: 0,
  streak: 0,
  lastDay: null,
  days: {},          // 'YYYY-MM-DD' -> заработанный опыт
  lessons: {},       // id -> { done, xp, acc, date }
  stories: {},       // id -> { done, date }
  tests: {},         // id -> { best, last, date }
  reading: {},       // id правила чтения -> { done, acc, date }
  mastery: {},       // 'lesson:<id>' | 'read:<id>' -> { level 1–4, acc, date, check }  (см. mastery.js)
  onboarding: null,  // { mode: 'beginner' | 'test', date, … } — выбор на первом экране
  srs: {},           // wordId -> { box, due, right, wrong, last }
  mistakes: {},      // key -> { kind, ref, payload, hits: [day], added }
  settings: { sfx: true, speak: true, slow: false, noSpeakUntil: 0 },
  created: Date.now()
});

let state = load();
let saveT = 0;
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const data = JSON.parse(raw);
    const base = fresh();
    return { ...base, ...data, settings: { ...base.settings, ...(data.settings || {}) } };
  } catch {
    return fresh();
  }
}

export function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* приватный режим или нет места */ }
  }, 120);
  listeners.forEach(fn => fn(state));
}

export const get = () => state;

// Прогресс с другого телефона (sync.js): подменяем разделы на месте, чтобы открытые экраны видели то же состояние.
export function adopt(part) {
  Object.assign(state, part);
  clearTimeout(saveT);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* приватный режим или нет места */ }
  listeners.forEach(fn => fn(state));
}
export const onChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };

export function reset() {
  state = fresh();
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  save();
}

// Дата в местном времени ученика.
export function today(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function addDays(dayStr, n) {
  const [y, m, d] = dayStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

// Опыт и серия дней.
export function addXP(n) {
  if (!n) return;
  const t = today();
  state.xp += n;
  state.days[t] = (state.days[t] || 0) + n;
  if (state.lastDay !== t) {
    state.streak = state.lastDay === today(-1) ? state.streak + 1 : 1;
    state.lastDay = t;
  }
  save();
}

// Серия сгорает, если пропущен вчерашний день.
export function currentStreak() {
  if (!state.lastDay) return 0;
  if (state.lastDay === today() || state.lastDay === today(-1)) return state.streak;
  return 0;
}

export function completeLesson(id, { xp = 0, acc = 0 } = {}) {
  const prev = state.lessons[id];
  state.lessons[id] = { done: true, xp: Math.max(xp, prev?.xp || 0), acc: Math.max(acc, prev?.acc || 0), date: today() };
  save();
}

export const isLessonDone = id => !!state.lessons[id]?.done;

export function completeStory(id) { state.stories[id] = { done: true, date: today() }; save(); }
export const isStoryDone = id => !!state.stories[id]?.done;

export function completeReading(id, acc = 0) {
  const prev = state.reading[id];
  state.reading[id] = { done: true, acc: Math.max(acc, prev?.acc || 0), date: today() };
  save();
}
export const isReadingDone = id => !!state.reading[id]?.done;

export function saveTest(id, score) {
  const prev = state.tests[id];
  state.tests[id] = { best: Math.max(score, prev?.best || 0), last: score, date: today() };
  save();
}

export function setSetting(k, v) { state.settings[k] = v; save(); }
export const setting = k => state.settings[k];
