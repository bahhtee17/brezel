// Начало урока: как ученик впервые встречает новые слова.
// «Доска» (teach) — для грамматических уроков: Брецель объясняет, строки таблицы появляются по одной.
// «Угадай заранее» (guess) — для уроков со словами: слово звучит, ученик угадывает картинку,
// потом открывается карточка. Угадывание до объяснения помогает лучше запомнить, ошибка не наказывается.
import { tx } from './i18n.js';
import { h, esc, deWord, soundBtn } from './ui.js';
import { mascotSVG } from './mascot.js';
import { art } from './art.js';
import { say, sfx } from './speech.js';

const spoken = w => (w.art ? `${w.art} ${w.de}` : w.de);

// Окончание в конце строки выделяется цветом: «du lernst» + end «st».
function rowDe(r) {
  const de = esc(r.de);
  if (!r.end || !r.de.endsWith(r.end)) return de;
  return `${esc(r.de.slice(0, -r.end.length))}<span class="end">${esc(r.end)}</span>`;
}

// ---------- «Доска»: объяснение с таблицей ----------
export function showTeach(s, { body, setMain, mainBtn, next, learn }) {
  const t = s.teach;
  const rows = t.rows;
  const coach = h('div', { class: 'coach teach-coach' },
    h('div', { html: mascotSVG('wave') }),
    h('div', { class: 'bubble teach-say', html: t.text }));
  const board = h('div', { class: 'teach-board' });
  body.append(
    h('div', { class: 'task-kicker', text: tx('Брецель объясняет') }),
    t.title ? h('div', { class: 'task-title', text: t.title }) : null,
    coach, board);
  const sayEl = coach.querySelector('.teach-say');

  let shown = 0;
  const els = [];
  const addRow = () => {
    const r = rows[shown];
    const el = h('button', { class: 'teach-row is-new', type: 'button' },
      h('span', { class: 'teach-row__art', html: r.img ? art(r.img) : '' }),
      h('span', { class: 'teach-row__txt' },
        h('span', { class: 'teach-row__de', html: rowDe(r) }),
        h('span', { class: 'teach-row__ru', text: r.ru }),
        r.ex ? h('span', { class: 'teach-row__ex', text: r.ex.de }) : null),
      h('span', { class: 'teach-row__play', html: '' }));
    el.querySelector('.teach-row__play').append(soundBtn(() => {}, { mini: true }));
    el.addEventListener('click', () => say(r.say || r.de));
    els.forEach(x => x.classList.remove('is-new'));
    els.push(el);
    board.append(el);
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    sayEl.innerHTML = r.tip || t.text;
    if (r.word) learn(r.word);
    say(r.say || r.de);
    shown++;
  };
  addRow();
  const update = () => {
    if (shown < rows.length) { setMain(tx`Дальше · ${shown} из ${rows.length}`, { cls: 'btn--sky' }); return; }
    els.forEach(x => x.classList.remove('is-new'));
    board.classList.add('is-done');
    sayEl.innerHTML = t.outro || tx('Вот вся таблица. Нажмите на строку, чтобы послушать ещё раз.');
    setMain(tx('Понятно!'));
  };
  update();
  mainBtn.onclick = () => {
    if (shown < rows.length) { sfx('tap'); addRow(); update(); }
    else next();
  };
}

// ---------- «Угадай заранее» ----------
export function showGuess(s, { body, setMain, mainBtn, next, learn }) {
  const w = s.word;
  const head = h('div', { class: 'guess-head' },
    h('div', { class: 'guess-de', html: deWord(w) }),
    soundBtn(() => say(spoken(w))), soundBtn(() => say(spoken(w), { slow: true }), { slow: true }));
  const opts = h('div', { class: `opts opts--3 guess-opts` });
  const reveal = h('div', { class: 'guess-reveal' });
  body.append(
    h('div', { class: 'task-kicker', text: tx`Новое слово · ${s.i + 1} из ${s.n}` }),
    h('div', { class: 'task-title', text: tx('Как вы думаете, что это значит?') }),
    head, opts, reveal,
    h('div', { class: 'dots' }, Array.from({ length: s.n }, (_, k) => h('i', { class: k === s.i ? 'on' : '' }))));
  setTimeout(() => say(spoken(w)), 250);

  const btns = s.options.map(o => {
    const b = h('button', { type: 'button', class: 'opt opt--card', html: `${art(o.img)}<span class="opt__label guess-label">${esc(o.ru.split(';')[0])}</span>` });
    b.addEventListener('click', () => choose(o, b));
    opts.append(b);
    return b;
  });
  setMain(tx('Выберите картинку'), { enabled: false, cls: 'btn--sky' });

  function choose(o, b) {
    const ok = o.id === w.id;
    btns.forEach(x => { x.disabled = true; });
    opts.classList.add('is-answered');
    btns[s.options.indexOf(s.options.find(x => x.id === w.id))].classList.add('is-right');
    if (!ok) b.classList.add('is-wrong');
    sfx(ok ? 'ok' : 'bad');
    learn(w.id);
    reveal.append(h('div', { class: `guess-verdict ${ok ? 'is-ok' : ''}`, text: ok ? tx('Угадали!') : tx('Не угадали — ничего страшного. Теперь вы знаете!') }),
      h('div', { class: 'card guess-card' },
        h('div', { class: 'guess-card__ru', text: w.ru }),
        w.plural ? h('div', { class: 'small muted', text: tx`мн. ч.: ${w.plural}` }) : null,
        w.note ? h('div', {}, h('span', { class: 'word-card__note', text: w.note })) : null,
        w.ex ? h('div', { class: 'ex-item guess-card__ex' }, soundBtn(() => say(w.ex.de), { mini: true }),
          h('div', { style: { textAlign: 'left' } }, h('div', { class: 'de', text: w.ex.de }), h('div', { class: 'small muted', text: w.ex.ru }))) : null));
    reveal.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setTimeout(() => say(w.ex ? w.ex.de : spoken(w)), 700);
    setMain(s.i + 1 < s.n ? tx('Дальше') : tx('К заданиям'));
    mainBtn.onclick = () => next();
  }
}
