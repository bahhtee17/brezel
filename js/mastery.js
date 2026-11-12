// Уровни освоения, как в Khan Academy: Пробовал → Знаком → Уверенно → Освоено.
// Урок или правило чтения:
//   • пройдено с точностью меньше 80% — «Пробовал» (курс предложит повторить);
//   • 80% и больше — «Знаком»; через день открывается проверка освоения;
//   • проверка без ошибок поднимает уровень: «Знаком» → «Уверенно» (следующая проверка через 3 дня)
//     → «Освоено» (дальше контрольная проверка раз в 2 недели);
//   • одна ошибка — уровень остаётся, проверка повторится завтра; больше — уровень снижается.
import { tx } from './i18n.js';
import { h, shuffle, icon } from './ui.js';
import { get, save, today, addDays } from './store.js';
import { allTopics, loadTopic, word, genForWord } from './content.js';
import { loadReading, readingRule, readExercise } from './readkit.js';

export const PASS = 80;
export const LEVELS = [tx('Не начато'), tx('Пробовал'), tx('Знаком'), tx('Уверенно'), tx('Освоено')];
export const LEVEL_HINT = [
  '',
  tx('Точность ниже 80% — стоит повторить'),
  tx('Точность 80%+. Проверка освоения — на следующий день'),
  tx('Проверка пройдена. Ещё одна — через 3 дня'),
  tx('Навык закреплён. Контрольная проверка — раз в 2 недели')
];
const NEXT_CHECK = { 2: 1, 3: 3, 4: 14 }; // дней до проверки на этом уровне

const store = () => (get().mastery = get().mastery || {});

// Уровень с запасным вариантом для старого прогресса (до появления уровней).
export function masteryOf(key) {
  const m = store()[key];
  if (m) return m;
  const [kind, id] = key.split(':');
  const old = kind === 'lesson' ? get().lessons[id] : kind === 'read' ? get().reading?.[id] : null;
  if (!old?.done) return { level: 0 };
  const level = (old.acc || 0) >= PASS ? 2 : 1;
  return { level, acc: old.acc || 0, date: old.date, check: level >= 2 ? addDays(old.date || today(), 1) : null };
}
export const levelOf = key => masteryOf(key).level || 0;

// После урока или тренировки правила. Тренировка уровень не снижает.
export function recordPractice(key, acc) {
  const cur = masteryOf(key);
  const got = acc >= PASS ? 2 : 1;
  const level = Math.max(cur.level || 0, got);
  const check = level >= 2 ? (cur.level >= 2 && cur.check ? cur.check : addDays(today(), NEXT_CHECK[2])) : null;
  store()[key] = { level, acc: Math.max(acc, cur.acc || 0), date: today(), check };
  save();
  return { before: cur.level || 0, after: level };
}

// Отметить уровень без тренировки (входной тест): только повышает.
export function grantLevel(key, level, acc = PASS) {
  const cur = masteryOf(key);
  if (store()[key] && (cur.level || 0) >= level) return;
  const lv = Math.max(level, cur.level || 0);
  store()[key] = { level: lv, acc: Math.max(acc, cur.acc || 0), date: today(), check: cur.check && cur.level >= lv ? cur.check : addDays(today(), NEXT_CHECK[lv] || 1) };
  save();
}

// Итог проверки освоения по одному уроку/правилу.
export function recordCheck(key, right, total) {
  const cur = masteryOf(key);
  const before = cur.level || 0;
  const wrong = total - right;
  let level = before;
  if (wrong === 0) level = Math.min(4, before + 1);
  else if (wrong >= 2) level = Math.max(1, before - 1);
  const check = level >= 2 ? addDays(today(), wrong === 0 ? NEXT_CHECK[level] : 1) : null;
  store()[key] = { ...cur, level, date: today(), check };
  save();
  return { before, after: level };
}

// Что пора проверить: уровень 2+ и наступил день проверки. Сначала самые давние.
export function dueChecks() {
  const t = today();
  const keys = new Set([
    ...Object.keys(store()),
    ...Object.entries(get().lessons).filter(([, v]) => v.done).map(([id]) => `lesson:${id}`),
    ...Object.entries(get().reading || {}).filter(([, v]) => v.done).map(([id]) => `read:${id}`)
  ]);
  return [...keys].map(key => ({ key, ...masteryOf(key) }))
    .filter(m => m.level >= 2 && m.check && m.check <= t)
    .sort((a, b) => a.check.localeCompare(b.check))
    .map(m => m.key);
}

// Сводка по уровням для профиля.
export function levelCounts() {
  const c = [0, 0, 0, 0, 0];
  const keys = new Set([...Object.keys(store()), ...Object.keys(get().lessons).map(id => `lesson:${id}`), ...Object.keys(get().reading || {}).map(id => `read:${id}`)]);
  keys.forEach(k => { c[levelOf(k)]++; });
  return c;
}

// Значок уровня: маленький кружок с иконкой (для карты курса, плиток чтения, итогов).
export function levelBadge(level, cls = '') {
  if (!level) return '';
  const ic = level === 1 ? icon('review') : level === 4 ? icon('boss') : icon('check');
  return `<span class="lvl lvl--${level} ${cls}" title="${LEVELS[level]}">${ic}</span>`;
}

// Строка «уровень → уровень» для итоговых экранов.
export function levelRow(title, before, after) {
  const arrow = after > before ? '↑' : after < before ? '↓' : '=';
  return h('div', { class: `lvl-row ${after > before ? 'is-up' : after < before ? 'is-down' : ''}` },
    h('div', { class: 'lvl-row__t', text: title }),
    h('div', { class: 'lvl-row__v', html: `${before ? `${LEVELS[before]} ` : ''}${before !== after ? `<b>${arrow}</b> ` : ''}${levelBadge(after)} ${LEVELS[after]}` }));
}

// Плашка на итоговом экране урока или правила: какой уровень получен и что дальше.
export function practiceNote(fin, acc, onRetry) {
  if (!fin) return null;
  const { before, after } = fin;
  if (after <= 1) {
    return h('div', { class: 'lvl-note lvl-note--warn' },
      h('div', { class: 'lvl-note__t', html: tx`${levelBadge(1)} <b>Пробовал</b> · точность ${acc}%` }),
      h('div', { class: 'small', text: tx`Для уровня «Знаком» нужно ${PASS}%. Повторите сейчас или чуть позже — так материал закрепится.` }),
      onRetry ? h('button', { class: 'btn btn--ghost btn--small', type: 'button', style: { marginTop: '8px' }, onclick: onRetry }, tx('Повторить сейчас')) : null);
  }
  const up = after > before;
  return h('div', { class: 'lvl-note' },
    h('div', { class: 'lvl-note__t', html: `${levelBadge(after)} ${up ? tx('Новый уровень: ') : tx('Уровень: ')}<b>${LEVELS[after]}</b>` }),
    h('div', { class: 'small', text: LEVEL_HINT[after] }));
}

// ---------- Где что лежит ----------
export async function findLesson(id) {
  for (const t of allTopics().filter(x => x.ready)) {
    const topic = await loadTopic(t.id);
    const i = topic?.lessons.findIndex(l => l.id === id) ?? -1;
    if (i >= 0) return { topic, lesson: topic.lessons[i], index: i };
  }
  return null;
}

export async function unitTitle(key) {
  const [kind, id] = key.split(':');
  if (kind === 'read') { await loadReading(); const r = readingRule(id); return r ? tx`Чтение: ${r.big} = [${r.snd}]` : id; }
  const f = await findLesson(id);
  return f ? tx`Урок ${f.index + 1}. ${f.lesson.title}` : id;
}

// ---------- Проверка освоения ----------
// До 4 уроков/правил, по 3 вопроса на каждый, вперемешку (чередование помогает запоминать).
export async function runMasteryCheck(onExit) {
  const keys = dueChecks().slice(0, 4);
  if (!keys.length) { onExit(); return; }
  const tally = {};
  const qs = [];
  for (const key of keys) {
    const list = await questionsFor(key, 3);
    if (!list.length) continue;
    tally[key] = { right: 0, total: list.length, title: await unitTitle(key) };
    list.forEach((ex, i) => qs.push({ kind: 'ex', ex, key: `check:${key}:${i}`, unit: key }));
  }
  const units = Object.keys(tally);
  if (!units.length) { onExit(); return; }
  const { runPlayer } = await import('./player.js');
  runPlayer({
    steps: [
      { kind: 'intro', kicker: tx('Проверка освоения'), title: tx('Помните ли вы?'), goal: tx`${qs.length} вопросов по ${units.length} ${units.length === 1 ? tx('теме') : tx('темам')}, пройденным раньше`, note: tx('Все ответы верны — уровень растёт. Две ошибки и больше — уровень снижается, и тему стоит повторить.'), button: tx('Начать') },
      ...shuffle(qs),
      { kind: 'outro', title: tx('Проверка готова!'), bonusXP: 5, extra: (sum, results) => h('div', { class: 'card lvl-list' }, results.map(r => levelRow(r.title, r.before, r.after))) }
    ],
    mode: 'check', onExit,
    onAnswer: (s, ok) => { if (s.unit && !s.retry && ok) tally[s.unit].right++; },
    onFinish: () => units.map(key => ({ key, title: tally[key].title, ...recordCheck(key, tally[key].right, tally[key].total) }))
  });
}

// ---------- Вопросы для проверки ----------
// Задания, которые быстро проверяются и не требуют микрофона.
const QUICK = new Set(['pick', 'listen', 'gap', 'reply', 'tiles', 'tf']);

export async function questionsFor(key, n = 3) {
  const [kind, id] = key.split(':');
  if (kind === 'read') {
    await loadReading();
    const r = readingRule(id);
    return r ? shuffle(r.words).slice(0, n).map(w => readExercise(w, r)) : [];
  }
  const f = await findLesson(id);
  if (!f) return [];
  const ws = shuffle((f.lesson.newWords || []).map(word).filter(Boolean));
  const authored = shuffle((f.lesson.exercises || []).filter(e => QUICK.has(e.type)));
  const out = [];
  if (authored[0]) out.push(authored[0]);
  const kinds = shuffle(['pickRu', 'listenText', 'pickDe']);
  ws.slice(0, n - out.length).forEach((w, i) => out.push(genForWord(w, kinds[i % kinds.length])));
  if (out.length < n && authored[1]) out.push(authored[1]);
  return shuffle(out).slice(0, n);
}
