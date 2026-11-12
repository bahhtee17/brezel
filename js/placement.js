// Первый экран и входной тест.
// Новичок выбирает «Я начинаю с нуля» и сразу идёт к первому уроку.
// Остальные проходят тест: сначала чтение (6 слов, по одному из каждой главы правил),
// потом уроки курса блоками по 3: в блоке 4 вопроса, блок сдан при 3 верных.
// Первый несданный блок останавливает тест. Всё, что до него, отмечается «Знаком»,
// а слова этих уроков уходят в интервальное повторение.
import { tx, lang, setLang, LANGS } from './i18n.js';
import { h, icon, shuffle, pick, go } from './ui.js';
import { mascotSVG } from './mascot.js';
import { get, save, today, completeLesson, completeReading } from './store.js';
import { allTopics, loadTopic, word, genForWord } from './content.js';
import { learn } from './srs.js';
import { runPlayer } from './player.js';
import { loadReading, readingRules, readExercise } from './readkit.js';
import { grantLevel } from './mastery.js';

const QUICK = new Set(['pick', 'listen', 'gap', 'reply', 'tiles', 'tf']);
const CHUNK = 3, PER = 4, NEED = 3, READ_NEED = 5;
const sum = arr => (arr || []).reduce((a, b) => a + b, 0);

// Нужен ли первый экран: выбор ещё не сделан и прогресса нет.
export function needsOnboarding() {
  const st = get();
  if (st.onboarding) return false;
  const any = st.xp > 0 || Object.keys(st.lessons).length || Object.keys(st.reading || {}).length;
  if (any) { st.onboarding = { mode: 'legacy', date: today() }; save(); return false; }
  return true;
}

// ---------- Первый экран ----------
// Переключатель языка объяснений: Русский / O'zbekcha.
export function langPicker() {
  return h('div', { class: 'langs', role: 'group', 'aria-label': tx('Язык / Til') }, LANGS.map(l =>
    h('button', { type: 'button', class: `langs__b ${l.id === lang() ? 'is-on' : ''}`, 'aria-pressed': String(l.id === lang()), onclick: () => setLang(l.id) }, l.name)));
}

export function welcomeScreen() {
  const app = document.getElementById('app');
  app.innerHTML = '';
  const choice = (ic, title, text, onClick, cls = '') => {
    const b = h('button', { class: `choice ${cls}`, type: 'button' },
      h('span', { class: 'choice__ic', html: icon(ic) }),
      h('span', { class: 'choice__main' }, h('span', { class: 'choice__t', text: title }), h('span', { class: 'choice__s', text })),
      h('span', { class: 'choice__go', html: icon('arrow') }));
    b.addEventListener('click', onClick);
    return b;
  };
  app.append(h('div', { class: 'screen screen--bare welcome' },
    langPicker(),
    h('div', { class: 'welcome__m', html: mascotSVG('wave') }),
    h('h1', { class: 'welcome__t', text: tx('Привет! Я Брецель') }),
    h('div', { class: 'welcome__s', text: tx('Помогу выучить немецкий с нуля до уровня A2 и подготовиться к экзамену Goethe. С чего начнём?') }),
    h('div', { class: 'stack' },
      choice('sprout', tx('Я начинаю с нуля'), tx('Ничего не знаю по-немецки. Начнём с первого урока и правил чтения.'), () => {
        get().onboarding = { mode: 'beginner', date: today() };
        save();
        go('#/');
      }, 'choice--new'),
      choice('target', tx('Я уже немного знаю'), tx('Входной тест на 5–8 минут найдёт ваш уровень, и курс пропустит то, что вы уже знаете.'), () => go('#/placement'))),
    h('div', { class: 'small muted center', style: { marginTop: '16px' }, text: tx('Пройти входной тест можно и позже — в профиле.') })));
  window.scrollTo(0, 0);
}

// ---------- Входной тест ----------
export async function placementTest() {
  await loadReading();
  const rules = readingRules();

  // Часть 1: чтение — по одному слову из каждой главы правил.
  const chapterIds = [...new Set(rules.map(r => r.chapter.id))];
  const readQs = chapterIds.map(cid => {
    const r = pick(rules.filter(x => x.chapter.id === cid));
    return readExercise(pick(r.words), r);
  });

  // Часть 2: уроки готовых тем, блоками по 3.
  const lessons = [];
  for (const t of allTopics().filter(x => x.ready)) {
    const topic = await loadTopic(t.id);
    topic.lessons.forEach((lesson, index) => lessons.push({ topic, lesson, index }));
  }
  const chunks = [];
  for (let i = 0; i < lessons.length; i += CHUNK) chunks.push(lessons.slice(i, i + CHUNK));
  const chunkQs = chunks.map(chunk => {
    const qs = [];
    const kinds = shuffle(['pickRu', 'listenText', 'pickDe']);
    chunk.forEach((x, k) => {
      const w = pick((x.lesson.newWords || []).map(word).filter(Boolean));
      if (w) qs.push(genForWord(w, kinds[k % kinds.length]));
    });
    const authored = shuffle(chunk.flatMap(x => (x.lesson.exercises || []).filter(e => QUICK.has(e.type))));
    while (qs.length < PER && authored.length) qs.push(authored.shift());
    return shuffle(qs);
  });
  const maxQ = readQs.length + chunkQs.reduce((a, q) => a + q.length, 0);

  const steps = [
    { kind: 'intro', kicker: tx('Входной тест'), title: tx('Найдём ваш уровень'), goal: tx`До ${maxQ} вопросов, 5–8 минут. Вопросы идут от простого к сложному, тест закончится сам, когда станет трудно.`, note: tx('Ответы не показываются сразу. Не знаете — нажмите «Не знаю»: угадывание сделает результат неточным.'), button: tx('Начать') },
    { kind: 'section', badge: tx('Часть 1'), title: tx('Чтение'), text: tx`Как читается слово? ${readQs.length} вопросов.`, mood: 'idle', button: tx('Начать') },
    ...readQs.map((ex, i) => ({ kind: 'ex', ex, part: 'read', key: `place:read:${i}` })),
    { kind: 'section', badge: tx('Часть 2'), title: tx('Слова и фразы'), text: tx('Вопросы по урокам курса, по порядку.'), mood: 'idle', button: tx('Дальше') }
  ];
  chunkQs.forEach((qs, c) => {
    qs.forEach((ex, i) => steps.push({ kind: 'ex', ex, part: `c${c}`, key: `place:c${c}:${i}` }));
    steps.push({ kind: 'gate', pass: res => sum(res[`c${c}`]) >= Math.min(NEED, qs.length) });
  });
  steps.push({ kind: 'outro', render: (body, { examResults }) => applyResult(body, examResults, { rules, chunks, chunkQs, lessons, readN: readQs.length }) });

  runPlayer({ steps, mode: 'placement', exam: true, allowSkip: true, onExit: () => go(get().onboarding ? '#/' : '#/welcome') });
}

function applyResult(body, res, { rules, chunks, chunkQs, lessons, readN }) {
  const readRight = sum(res.read);
  let passed = 0;
  while (passed < chunks.length && sum(res[`c${passed}`]) >= Math.min(NEED, chunkQs[passed].length)) passed++;
  const placed = chunks.slice(0, passed).flat();
  let words = 0;
  placed.forEach(({ lesson }) => {
    completeLesson(lesson.id, { xp: 0, acc: 80 });
    grantLevel(`lesson:${lesson.id}`, 2);
    (lesson.newWords || []).forEach(id => { if (word(id)) { learn(id); words++; } });
  });
  const readingOk = readRight >= READ_NEED;
  if (readingOk) rules.forEach(r => { completeReading(r.id, 80); grantLevel(`read:${r.id}`, 2); });
  const st = get();
  st.onboarding = { ...(st.onboarding || {}), mode: 'test', date: today(), lessons: placed.length, reading: readingOk, readScore: readRight };
  save();

  const next = lessons[placed.length];
  const title = !placed.length ? (readingOk ? tx('Читать вы умеете!') : tx('Начнём с самого начала')) : placed.length === lessons.length ? tx('Все готовые уроки уже знакомы!') : tx`Вы знаете уроки 1–${placed.length}`;
  const row = (ok, t, s) => h('div', { class: `place-row ${ok ? 'is-ok' : ''}` },
    h('span', { class: 'place-row__ic', html: icon(ok ? 'check' : 'arrow') }),
    h('div', {}, h('div', { class: 'de', text: t }), h('div', { class: 'small muted', text: s })));
  body.append(h('div', { class: 'stack stack--lg result', style: { margin: 'auto 0' } },
    h('div', { html: mascotSVG('happy') }),
    h('h1', { style: { fontSize: '28px' }, text: title }),
    h('div', { class: 'card stack' },
      row(readingOk, tx`Чтение: ${readRight} из ${readN}`, readingOk ? tx('Правила чтения отмечены «Знаком». Раздел «Чтение» можно пройти для закрепления.') : tx('Начните с раздела «Чтение»: 24 коротких правила.')),
      row(placed.length > 0, tx`Уроки: ${placed.length} из ${lessons.length} уже знакомы`,
        placed.length ? tx`Они отмечены «Знаком». ${words} слов добавлено в повторение — курс будет иногда их спрашивать.` : tx('Курс начнётся с первого урока.')),
      next ? row(false, tx`Начните с урока ${next.index + 1}: ${next.lesson.title}`, tx`Тема ${next.topic.meta.n} · ${next.topic.meta.title}`) : null)));
  return { readRight, lessons: placed.length };
}
