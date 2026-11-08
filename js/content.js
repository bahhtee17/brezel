// Загрузка курса и генерация упражнений из слов.
import { shuffle, pick, deText } from './ui.js';
import { strength, isLearned } from './srs.js';
import { hasArt } from './art.js';

let course = null;
const topics = new Map();
const wordIndex = new Map(); // id -> слово (с полем topic)

export async function loadCourse() {
  if (course) return course;
  const r = await fetch('content/course.json');
  course = await r.json();
  return course;
}

export function allTopics() {
  return course ? course.levels.flatMap(l => l.topics.map(t => ({ ...t, level: l.id }))) : [];
}

export async function loadTopic(id) {
  if (topics.has(id)) return topics.get(id);
  const meta = allTopics().find(t => t.id === id);
  if (!meta || !meta.file) return null;
  const r = await fetch(`content/${meta.file}`);
  const data = await r.json();
  data.meta = meta;
  for (const w of data.words) wordIndex.set(w.id, { ...w, topic: id });
  data.lessons.forEach((l, i) => { l.index = i; l.topic = id; });
  topics.set(id, data);
  return data;
}

export async function loadReadyTopics() {
  await loadCourse();
  const ready = allTopics().filter(t => t.ready);
  return Promise.all(ready.map(t => loadTopic(t.id)));
}

export const word = id => wordIndex.get(id);
export const allWords = () => [...wordIndex.values()];

// ---------- Генерация упражнений по словам ----------
// Отвлекающие варианты берём из той же темы и того же типа, с непохожими картинками.
// Сначала — слова, которые ученик уже видел (текущий урок и выученные), чтобы не подсказывать незнакомое.
let preferIds = new Set();
export function preferWords(ids) { preferIds = new Set(ids); }

function distractors(w, n = 3, needArt = false) {
  const pool = allWords().filter(x => x.id !== w.id && x.de !== w.de && x.ru !== w.ru && (!needArt || (hasArt(x.img) && x.img !== w.img)));
  const known = x => preferIds.has(x.id) || isLearned(x.id);
  const tiers = [
    pool.filter(x => known(x) && x.kind === w.kind),
    pool.filter(x => known(x) && x.kind !== w.kind),
    pool.filter(x => !known(x) && x.kind === w.kind && x.topic === w.topic),
    pool.filter(x => !known(x) && !(x.kind === w.kind && x.topic === w.topic))
  ];
  return tiers.flatMap(t => shuffle(t)).slice(0, n);
}

function choiceSet(w, needArt) {
  const opts = shuffle([w, ...distractors(w, 3, needArt)]);
  return { opts, answer: opts.indexOf(w) };
}

// Виды автоупражнений по силе памяти: сначала узнавание, потом воспроизведение.
export function genForWord(w, kind) {
  const box = strength(w.id);
  const withArt = hasArt(w.img);
  const kinds = kind ? [kind] : box <= 1 ? (withArt ? ['pickDe', 'listenImg'] : ['pickDe', 'listenText'])
    : box <= 3 ? (withArt ? ['pickImg', 'listenText', 'pickRu'] : ['listenText', 'pickRu'])
    : ['writeDe', 'dictation', 'pickRu'];
  const k = pick(kinds);
  const words = [w.id];
  if (k === 'pickDe') {
    const { opts, answer } = choiceSet(w, withArt);
    return { type: 'pick', kicker: 'Выберите перевод', q: `Как по-немецки «${w.ru}»?`, options: opts.map(o => ({ de: deText(o), img: withArt ? o.img : null, say: o.de })), answer, words, auto: true };
  }
  if (k === 'pickImg') {
    const { opts, answer } = choiceSet(w, false);
    return { type: 'pick', kicker: 'Угадай по картинке', q: 'Что на картинке?', img: w.img, options: opts.map(o => ({ de: deText(o), say: o.de })), answer, words, auto: true };
  }
  if (k === 'listenImg') {
    const { opts, answer } = choiceSet(w, true);
    return { type: 'pick', kicker: 'Услышь и выбери', q: 'Что вы слышите?', audio: w.de, options: opts.map(o => ({ ru: o.ru, img: o.img })), answer, words, auto: true };
  }
  if (k === 'listenText') {
    const { opts, answer } = choiceSet(w, false);
    return { type: 'listen', de: w.de, options: opts.map(o => deText(o)), answer, words, auto: true };
  }
  if (k === 'pickRu') {
    const { opts, answer } = choiceSet(w, false);
    return { type: 'pick', kicker: 'Что это значит?', q: deText(w), audio: w.de, options: opts.map(o => ({ ru: o.ru })), answer, words, auto: true };
  }
  if (k === 'writeDe') {
    return { type: 'write', ru: w.ru, accept: [deText(w), w.de, ...(w.accept || [])], hint: w.art ? 'Не забудьте артикль' : '', words, auto: true };
  }
  return { type: 'dictation', de: w.de, accept: [w.de, ...(w.accept || [])], words, auto: true };
}

export function genPairs(ws) {
  const list = shuffle(ws).slice(0, 5);
  return { type: 'pairs', pairs: list.map(w => [deText(w), w.ru]), words: list.map(w => w.id), auto: true };
}

// Набор для тренировки: по одному упражнению на слово плюс «пары», перемешано.
export function practiceSet(ids, max = 10) {
  const ws = ids.map(word).filter(Boolean).slice(0, max);
  const out = ws.map(w => genForWord(w));
  if (ws.length >= 4) out.splice(Math.min(3, out.length), 0, genPairs(ws));
  return out;
}
