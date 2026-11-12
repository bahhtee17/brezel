// Синхронизация прогресса между телефонами через бесплатную базу Firebase Realtime Database (адрес — в config.js).
// На каждом телефоне вводится один и тот же секретный код; по нему прогресс сохраняется в облако и забирается оттуда.
// Без интернета приложение работает как обычно и синхронизируется, когда сеть появится.
//
// Объединение трёхстороннее: помним прогресс на момент прошлой синхронизации («основа»), поэтому видим,
// что именно изменилось на этом телефоне, а что — на другом, и ничего не теряем и не воскрешаем удалённое.
import { SYNC_URL } from './config.js';
import { get, adopt, onChange } from './store.js';

const K_LINK = 'brezel.sync';       // { id, code }
const K_BASE = 'brezel.sync.base';  // прогресс на момент прошлой синхронизации
const MIN_CODE = 8;

const ls = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* нет места */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } }
};

// Адрес базы. Для проверки на компьютере его можно подменить: localStorage['brezel.sync.url'].
function baseUrl() {
  let dev = null;
  try { dev = localStorage.getItem('brezel.sync.url'); } catch { /* ignore */ }
  return (dev || SYNC_URL || '').replace(/\/+$/, '');
}

export const syncAvailable = () => !!baseUrl() && !!globalThis.crypto?.subtle;
export const syncCode = () => ls.get(K_LINK)?.code || null;
export const syncOn = () => syncAvailable() && !!ls.get(K_LINK)?.id;

// ---------- состояние для экрана профиля ----------
let status = { state: 'idle', at: 0 }; // idle | busy | ok | error
const watchers = new Set();
export const syncStatus = () => status;
export const onSyncStatus = fn => { watchers.add(fn); return () => watchers.delete(fn); };
function setStatus(state) {
  status = { state, at: state === 'ok' ? Date.now() : status.at };
  watchers.forEach(fn => fn(status));
}

// ---------- объединение ----------
const SECTIONS = ['lessons', 'stories', 'tests', 'reading', 'mastery', 'srs', 'mistakes'];
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const later = (a, b) => ((a || '') >= (b || '') ? a : b);

// Обе стороны изменили одну запись: что оставить.
const BOTH = {
  lessons: (a, b) => ({ done: true, xp: Math.max(a.xp || 0, b.xp || 0), acc: Math.max(a.acc || 0, b.acc || 0), date: later(a.date, b.date) }),
  stories: (a, b) => ({ done: true, date: later(a.date, b.date) }),
  tests: (a, b) => { const n = (a.date || '') >= (b.date || '') ? a : b; return { best: Math.max(a.best || 0, b.best || 0), last: n.last, date: n.date }; },
  reading: (a, b) => ({ done: true, acc: Math.max(a.acc || 0, b.acc || 0), date: later(a.date, b.date) }),
  // Уровень освоения: верим более свежей записи, при равенстве дат — более высокому уровню.
  mastery: (a, b) => (a.date === b.date ? ((a.level || 0) >= (b.level || 0) ? a : b) : (a.date || '') > (b.date || '') ? a : b),
  // Слово: более свежее повторение; в один день — то, где ответов больше.
  srs: (a, b) => (a.last === b.last ? ((a.right + a.wrong) >= (b.right + b.wrong) ? a : b) : (a.last || '') > (b.last || '') ? a : b),
  // Ошибка: осторожный вариант — где меньше верных ответов подряд.
  mistakes: (a, b) => ((a.hits?.length || 0) <= (b.hits?.length || 0) ? a : b)
};

function mergeMap(base = {}, mine = {}, theirs = {}, both) {
  const out = {};
  for (const k of new Set([...Object.keys(mine), ...Object.keys(theirs)])) {
    const b = base[k], m = mine[k], t = theirs[k];
    if (m !== undefined && t !== undefined) out[k] = eq(m, b) ? t : eq(t, b) || eq(m, t) ? m : both(m, t);
    else if (m !== undefined) { if (b === undefined || !eq(m, b)) out[k] = m; }   // у них удалено, у нас не менялось — удаляем
    else if (b === undefined || !eq(t, b)) out[k] = t;                              // у нас удалено, у них не менялось — удаляем
  }
  return out;
}

// Опыт по дням: к чужому числу прибавляем то, что заработано здесь после прошлой синхронизации.
function mergeDays(base, mine = {}, theirs = {}) {
  const out = {};
  for (const d of new Set([...Object.keys(mine), ...Object.keys(theirs)])) {
    // Первое подключение (основы ещё нет): берём большее, иначе один и тот же день посчитался бы дважды.
    const v = base ? (theirs[d] || 0) + (mine[d] || 0) - (base[d] || 0) : Math.max(theirs[d] || 0, mine[d] || 0);
    if (v > 0) out[d] = v;
  }
  return out;
}

const dayBefore = d => {
  const [y, m, n] = d.split('-').map(Number);
  const dt = new Date(y, m - 1, n - 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

// Только то, что синхронизируется. Настройки (звук, язык) у каждого телефона свои.
export function snapshot(s) {
  const out = { days: s.days || {}, onboarding: s.onboarding || null, created: s.created || Date.now() };
  for (const k of SECTIONS) out[k] = s[k] || {};
  return JSON.parse(JSON.stringify(out));
}

export function merge(base, mine, theirs) {
  const first = !base;
  base = base || {};
  const out = {};
  for (const k of SECTIONS) out[k] = mergeMap(base[k], mine[k], theirs[k], BOTH[k]);
  out.days = mergeDays(first ? null : base.days || {}, mine.days, theirs.days);
  out.onboarding = eq(mine.onboarding, base.onboarding ?? null) ? (theirs.onboarding ?? mine.onboarding) : mine.onboarding;
  out.created = Math.min(mine.created || Infinity, theirs.created || Infinity);
  return out;
}

// Опыт и серия дней считаются из опыта по дням — так они одинаковы на обоих телефонах.
function withTotals(snap) {
  const days = Object.keys(snap.days).sort();
  const lastDay = days[days.length - 1] || null;
  let streak = 0;
  for (let d = lastDay; d && snap.days[d]; d = dayBefore(d)) streak++;
  return { ...snap, xp: Object.values(snap.days).reduce((a, b) => a + b, 0), lastDay, streak };
}

// ---------- обмен с облаком ----------
async function hash(code) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('brezel:' + code));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const docUrl = id => `${baseUrl()}/brezel/${id}.json`;

async function pull(id) {
  const r = await fetch(docUrl(id), { cache: 'no-store' });
  if (!r.ok) throw new Error('sync pull ' + r.status);
  const doc = await r.json();
  return doc?.data ? JSON.parse(doc.data) : null;
}

async function push(id, snap, keepalive = false) {
  // Прогресс лежит одной строкой: в ключах уроков есть символы, которые база не принимает.
  const r = await fetch(docUrl(id), { method: 'PUT', keepalive, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: Date.now(), data: JSON.stringify(snap) }) });
  if (!r.ok) throw new Error('sync push ' + r.status);
}

let busy = null, dirty = false, applying = false, timer = 0;

// Полный обмен: забрать, объединить, отправить. Возвращает true, если прогресс на этом телефоне изменился.
export function syncNow() {
  if (!syncOn()) return Promise.resolve(false);
  if (busy) { dirty = true; return busy; }
  busy = (async () => {
    let changed = false;
    try {
      setStatus('busy');
      do {
        dirty = false;
        const { id } = ls.get(K_LINK);
        const theirs = await pull(id);
        const mine = snapshot(get());
        const merged = theirs ? merge(ls.get(K_BASE), mine, theirs) : mine;
        if (!theirs || !eq(merged, theirs)) await push(id, merged);
        // Пока шёл обмен, ученик мог ответить ещё на вопрос — тогда повторим круг.
        if (!eq(mine, snapshot(get()))) { dirty = true; continue; }
        if (!eq(merged, mine)) {
          applying = true;
          try { adopt(withTotals(merged)); } finally { applying = false; }
          changed = true;
        }
        ls.set(K_BASE, merged);
      } while (dirty);
      setStatus('ok');
    } catch (err) {
      console.warn(err);
      setStatus('error');
    } finally {
      busy = null;
    }
    if (changed) remoteListeners.forEach(fn => fn());
    return changed;
  })();
  return busy;
}

// Прогресс пришёл с другого телефона — экран стоит перерисовать.
const remoteListeners = new Set();
export const onRemoteProgress = fn => { remoteListeners.add(fn); return () => remoteListeners.delete(fn); };

// Подключить этот телефон к коду. Прогресс с обоих телефонов объединяется.
export async function linkSync(code) {
  code = String(code || '').trim().toLowerCase().replace(/\s+/g, '');
  if (code.length < MIN_CODE) throw new Error('short');
  const id = await hash(code);
  await pull(id); // проверяем связь до того, как запомнить код
  ls.set(K_LINK, { id, code });
  ls.del(K_BASE);
  return syncNow();
}

export function unlinkSync() {
  ls.del(K_LINK);
  ls.del(K_BASE);
  setStatus('idle');
}

// Случайный код вида abcd-efgh-jkmn без похожих букв и цифр.
export function newCode() {
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789';
  const rnd = crypto.getRandomValues(new Uint8Array(12));
  return [...rnd].map((n, i) => (i && i % 4 === 0 ? '-' : '') + abc[n % abc.length]).join('');
}

// Запуск: синхронизация при открытии, после каждого изменения, при возврате в приложение и при появлении сети.
export function startSync() {
  onChange(() => {
    if (applying || !syncOn()) return;
    clearTimeout(timer);
    timer = setTimeout(syncNow, 4000);
  });
  document.addEventListener('visibilitychange', () => {
    if (!syncOn()) return;
    if (document.visibilityState === 'visible') syncNow();
    else {
      // Приложение сворачивают: быстро отправляем то, что есть. Объединение пройдёт при следующем открытии.
      clearTimeout(timer);
      const base = ls.get(K_BASE), mine = snapshot(get());
      if (base && !eq(base, mine) && !busy) syncNow();
    }
  });
  window.addEventListener('online', () => syncNow());
  return syncOn() ? syncNow() : Promise.resolve(false);
}
