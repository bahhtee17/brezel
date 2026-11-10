// Раздел «Чтение»: правила чтения по-немецки. У каждого правила — пример-слова с картинками,
// разбор слова по буквам со звуками, озвучка и короткая тренировка в формате урока.
import { h, icon, shuffle, soundBtn, toast } from './ui.js';
import { mascotSVG, setMood } from './mascot.js';
import { say } from './speech.js';
import { completeReading, isReadingDone } from './store.js';
import { runPlayer } from './player.js';
import { videoCard } from './video.js';
import { topbar, mount } from './screens.js';
import { levelOf, levelBadge, LEVELS, LEVEL_HINT, PASS, practiceNote, recordPractice } from './mastery.js';
import { loadReading, readingRules, readingRule, readPicHtml, readWordHtml, readSegsHtml, readExercise } from './readkit.js';

const go = hash => { location.hash = hash; };
const sizeCls = (text, m, s) => (text.length > s ? 'is-s' : text.length > m ? 'is-m' : '');

// ---------- Список правил ----------
export async function readingScreen() {
  const data = await loadReading();
  const rules = readingRules();
  const doneN = rules.filter(r => isReadingDone(r.id)).length;
  const next = rules.find(r => !isReadingDone(r.id));
  const scr = h('div', { class: 'screen' }, topbar('Чтение'));

  const pct = Math.round((doneN / rules.length) * 100);
  scr.append(h('div', { class: 'card rd-hero' },
    h('div', { class: 'rd-hero__m', html: mascotSVG(doneN ? 'happy' : 'wave') }),
    h('div', { class: 'rd-hero__main' },
      h('div', { class: 'task-kicker', text: 'Учимся читать' }),
      h('h2', { text: doneN === rules.length ? 'Все правила освоены!' : doneN ? `Освоено ${doneN} из ${rules.length}` : 'Как читать по-немецки' }),
      h('div', { class: 'small muted', text: `Немецкий читается почти так, как пишется. ${rules.length} коротких правил — и вы прочитаете любое слово.` }),
      h('div', { class: 'score-bar__track', style: { marginTop: '8px' } }, h('div', { class: 'score-bar__fill', style: { width: `${pct}%`, background: 'var(--ok)' } })))));

  const actions = h('div', { class: 'stack', style: { marginBottom: '18px' } });
  if (next) actions.append(h('button', { class: 'btn', type: 'button', onclick: () => go(`#/read/${next.id}`) },
    doneN ? `Дальше: ${next.big}` : 'Начать с первого правила'));
  if (doneN >= 2) actions.append(h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => mixedTraining(rules.filter(r => isReadingDone(r.id))) }, 'Тренировка: прочитай слово'));
  scr.append(actions);

  data.chapters.forEach((c, ci) => {
    const chRules = rules.filter(r => r.chapter.id === c.id);
    const chDone = chRules.filter(r => isReadingDone(r.id)).length;
    scr.append(h('div', { class: 'rd-chapter' },
      h('div', {}, h('div', { class: 'section-title', style: { margin: 0 }, text: `${ci + 1}. ${c.title}` }), h('div', { class: 'small muted', text: c.sub })),
      h('div', { class: `rd-chapter__n ${chDone === chRules.length ? 'is-done' : ''}`, text: `${chDone}/${chRules.length}` })));
    if (c.video) scr.append(videoCard(c.video, c.title));
    const grid = h('div', { class: 'rd-grid' });
    chRules.forEach(r => {
      const done = isReadingDone(r.id);
      const lv = done ? Math.max(1, levelOf(`read:${r.id}`)) : 0;
      grid.append(h('button', { class: `rd-tile ${lv >= 2 ? 'is-done' : lv === 1 ? 'is-weak' : ''} ${r === next ? 'is-next' : ''}`, type: 'button', 'aria-label': `${r.title}${lv ? ` (${LEVELS[lv]})` : ''}`, onclick: () => go(`#/read/${r.id}`) },
        lv ? h('span', { class: 'rd-tile__ok', html: levelBadge(lv) }) : null,
        h('span', { class: `rd-tile__big ${sizeCls(r.big, 3, 6)}`, text: r.big }),
        h('span', { class: `rd-tile__snd ${sizeCls(r.snd, 6, 9)}`, text: `[${r.snd}]` }),
        h('span', { class: 'rd-tile__ex', text: r.words[0].de })));
    });
    scr.append(grid);
  });
  mount(scr, 'read');
}

// ---------- Одно правило ----------
export async function ruleScreen(id) {
  await loadReading();
  const rules = readingRules();
  const rule = readingRule(id);
  if (!rule) return go('#/read');
  const i = rules.indexOf(rule);
  const prev = rules[i - 1], next = rules[i + 1];
  const app = document.getElementById('app');
  app.innerHTML = '';
  const scr = h('div', { class: 'screen screen--bare rd-rule' });

  scr.append(h('div', { class: 'lesson__head' },
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'К списку правил', html: icon('close'), onclick: () => go('#/read') }),
    h('div', { class: 'task-kicker', style: { flex: 1 }, text: `Чтение · ${rule.chapter.title}` }),
    h('div', { class: 'rd-count', text: `${rule.n} / ${rules.length}` })));

  scr.append(h('div', { class: 'rd-eq' },
    h('div', { class: `rd-eq__l ${sizeCls(rule.big, 3, 7)}`, text: rule.big }),
    h('div', { class: 'rd-eq__arrow', html: icon('arrow') }),
    h('div', { class: `rd-eq__r ${sizeCls(rule.snd, 4, 8)}`, text: `[${rule.snd}]` })));
  scr.append(h('h1', { class: 'rd-title', text: rule.title }));
  const lvNow = isReadingDone(rule.id) ? Math.max(1, levelOf(`read:${rule.id}`)) : 0;
  if (lvNow) scr.append(h('div', { class: 'rd-level', html: `${levelBadge(lvNow)} <b>${LEVELS[lvNow]}</b> · ${LEVEL_HINT[lvNow]}` }));
  scr.append(h('div', { class: 'card rd-text', html: rule.text }));
  if (rule.tip) scr.append(h('div', { class: 'coach rd-tip' }, h('div', { html: mascotSVG('idle') }), h('div', { class: 'bubble', text: rule.tip })));
  if (rule.chapter.video) scr.append(videoCard(rule.chapter.video, `Глава «${rule.chapter.title}»`));

  scr.append(h('div', { class: 'section-title', text: 'Прочитайте сами' }));
  scr.append(h('div', { class: 'small muted', style: { margin: '-6px 0 12px' }, text: 'Сначала прочитайте слово вслух. Потом нажмите на карточку: услышите, как правильно, и увидите, как звучит каждая буква.' }));
  const list = h('div', { class: 'rd-words' });
  rule.words.forEach(w => list.append(wordCard(w)));
  scr.append(list);

  const doneNow = isReadingDone(rule.id);
  scr.append(h('button', { class: 'btn btn--ok', type: 'button', style: { marginTop: '18px' }, onclick: () => quiz(rule) },
    doneNow ? 'Потренироваться ещё раз' : 'Проверить себя'));
  scr.append(h('div', { class: 'rd-pager' },
    prev ? h('button', { class: 'btn btn--ghost btn--small', type: 'button', onclick: () => go(`#/read/${prev.id}`) }, `← ${prev.big}`) : h('span'),
    next ? h('button', { class: 'btn btn--ghost btn--small', type: 'button', onclick: () => go(`#/read/${next.id}`) }, `${next.big} →`) : h('span')));

  app.append(scr);
  window.scrollTo(0, 0);
  setTimeout(() => setMood(scr.querySelector('.rd-tip'), 'wave', 'idle', 1800), 400);
}

// Карточка слова: сначала только слово и картинка, по нажатию — озвучка и разбор по буквам.
function wordCard(w) {
  const more = h('div', { class: 'rd-word__more' },
    h('div', { html: readSegsHtml(w) }),
    h('div', { class: 'rd-tr' },
      h('span', { text: `[${w.tr}]` }),
      h('span', { class: 'rd-tr__btns' }, soundBtn(() => say(w.de), { mini: true }), soundBtn(() => say(w.de, { slow: true }), { mini: true, slow: true }))));
  const card = h('div', { class: 'card rd-word', role: 'button', tabindex: '0', 'aria-label': `${w.de} — ${w.ru}` },
    h('div', { class: 'rd-word__pic', html: readPicHtml(w) }),
    h('div', { class: 'rd-word__main' },
      h('div', { class: `rd-word__de ${sizeCls(w.de, 8, 11)}`, html: readWordHtml(w) }),
      h('div', { class: 'rd-word__ru', text: w.ru }),
      h('div', { class: 'rd-word__hint', html: `${icon('speaker')}<span>Проверить</span>` })),
    more);
  const act = e => {
    if (e.target.closest('.sound-btn')) return;
    card.classList.add('is-open');
    say(w.de);
  };
  card.addEventListener('click', act);
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(e); } });
  return card;
}

// ---------- Тренировки ----------
const readEx = readExercise;

const listenEx = (w, rule) => {
  const others = shuffle(rule.words.filter(x => x.de !== w.de)).slice(0, 2).map(x => x.de);
  const options = [w.de, ...others];
  return { type: 'listen', kicker: 'Послушайте и выберите', q: 'Какое слово прозвучало?', de: w.de, options, answer: 0 };
};

function quiz(rule) {
  const ws = shuffle(rule.words);
  const exs = ws.map(w => readEx(w, rule));
  if (!rule.stress && rule.words.length >= 3) {
    const [a, b] = shuffle(rule.words);
    exs.splice(2, 0, listenEx(a, rule));
    exs.push(listenEx(b, rule));
  }
  const rules = readingRules();
  const next = rules[rules.indexOf(rule) + 1];
  runPlayer({
    steps: [
      { kind: 'intro', kicker: `Чтение · правило ${rule.n}`, title: `${rule.big} = [${rule.snd}]`, goal: `${exs.length} коротких заданий: прочитайте слово и выберите, как оно звучит`, button: 'Начать' },
      ...exs.map((ex, k) => ({ kind: 'ex', ex, key: `read:${ex.type}:${ex.de}` })),
      { kind: 'outro', title: sum => (sum.acc >= PASS ? 'Отлично прочитано!' : 'Почти получилось'), sub: rule.title, bonusXP: 3, homeLabel: 'К правилам',
        extra: (sum, fin) => practiceNote(fin, sum.acc, () => quiz(rule)),
        ...(next ? { nextLabel: `Следующее: ${next.big}`, onNext: () => go(`#/read/${next.id}`) } : {}) }
    ],
    mode: 'reading', onExit: () => go('#/read'),
    onFinish: sum => {
      completeReading(rule.id, sum?.acc || 0);
      return recordPractice(`read:${rule.id}`, sum?.acc || 0);
    }
  });
}

function mixedTraining(pool) {
  if (!pool.length) { toast('Сначала пройдите хотя бы одно правило'); return; }
  const items = shuffle(pool.flatMap(r => r.words.map(w => ({ w, r })))).filter((x, k, arr) => arr.findIndex(y => y.w.de === x.w.de) === k).slice(0, 10);
  runPlayer({
    steps: [
      { kind: 'intro', kicker: 'Тренировка чтения', title: 'Прочитай слово', goal: `${items.length} слов из пройденных правил`, button: 'Поехали' },
      ...items.map(({ w, r }, k) => ({ kind: 'ex', ex: readEx(w, r), key: `read:readWord:${w.de}` })),
      { kind: 'outro', title: 'Отлично читаете!', bonusXP: 5 }
    ],
    mode: 'reading', onExit: () => go('#/read')
  });
}
