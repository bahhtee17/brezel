// Комикс-ролевая игра в конце урока: герой говорит в кадре, ученик отвечает,
// а в следующих кадрах видно его ответ и реакцию героя.
// Режимы ответа (ex.mode): pick — выбрать из трёх, listen — реплика только на слух,
// audio — и реплика, и варианты только на слух, tiles — собрать из плиток,
// type — напечатать, speak — сказать вслух.
import { tx } from './i18n.js';
import { h, esc, icon } from './ui.js';
import { avatar, charName, scene as sceneArt } from './art.js';
import { hasImg, media } from './img.js';
import { say, stop } from './speech.js';

const OOPS = { de: 'Wie bitte?', ru: 'Простите, что?' };

// Герой в кадре: вырезанная фигура нужной эмоции, иначе обычная, иначе круглый портрет.
export function comicFig(who, mood = 'talk') {
  for (const m of [mood, 'talk']) {
    if (hasImg('comic', `${who}-${m}`)) return `<div class="comic__fig">${media('comic', `${who}-${m}`, { lazy: false })}</div>`;
  }
  return `<div class="comic__fig comic__fig--avatar">${avatar(who, mood === 'surprised' ? 'oops' : mood === 'happy' ? 'smile' : 'talk')}</div>`;
}

const FX = {
  happy: '<svg viewBox="0 0 60 60" aria-hidden="true"><path d="M30 4l5 17 17 5-17 5-5 17-5-17-17-5 17-5z" fill="#FFD23F" stroke="#1d1d1d" stroke-width="3" stroke-linejoin="round"/></svg>',
  surprised: '<svg viewBox="0 0 60 60" aria-hidden="true"><text x="30" y="46" text-anchor="middle" font-size="44" font-weight="900" fill="#FF6B5B" stroke="#1d1d1d" stroke-width="2.5" font-family="Nunito, sans-serif">?!</text></svg>'
};

function bubble(text, { hidden = false, tail = 'left', ru = '' } = {}) {
  const b = h('div', { class: `comic__bubble comic__bubble--${tail}` });
  if (hidden) {
    b.classList.add('is-audio');
    b.innerHTML = `${icon('speaker')}<span>${esc(tx('Слушайте!'))}</span>`;
  } else {
    b.innerHTML = `<span class="comic__de" lang="de">${esc(text)}</span>${ru ? `<span class="comic__ru">${esc(ru)}</span>` : ''}`;
  }
  return b;
}

export function mountComic(ex, host, api, inner) {
  const mode = ex.mode || 'pick';
  const hideLine = mode === 'listen' || mode === 'audio';
  const reply = typeof ex.answer === 'number' ? ex.options[ex.answer] : (ex.reply || (ex.accept || [])[0] || '');

  // Кадр 1: герой говорит.
  const lineBubble = bubble(ex.line, { hidden: hideLine, ru: '' });
  const panel1 = h('div', { class: 'comic__panel comic__panel--main' },
    h('div', { class: 'comic__bg', html: ex.art ? sceneArt(ex.art) : '' }),
    ex.cap ? h('div', { class: 'comic__cap', text: ex.cap }) : null,
    h('div', { class: 'comic__who', text: charName(ex.who) }),
    h('div', { html: comicFig(ex.who, 'talk') }).firstChild,
    lineBubble);
  const playLine = () => say(ex.line, { who: ex.who });
  panel1.addEventListener('click', () => { if (!hideLine) lineBubble.classList.toggle('show-ru'); playLine(); });
  if (!hideLine && ex.lineRu) lineBubble.append(h('span', { class: 'comic__ru', text: ex.lineRu }));
  const row = h('div', { class: 'comic__row' });
  const page = h('div', { class: 'comic' }, panel1, row);
  host.append(page);
  setTimeout(playLine, 400);

  // Что сделать ученику.
  const TASK = {
    pick: tx('Что вы ответите?'), listen: tx('Послушайте и выберите ответ'), audio: tx('Послушайте реплику и варианты ответа'),
    tiles: tx('Соберите ответ из плиток'), type: tx('Напечатайте ответ'), speak: tx('Ответьте вслух')
  };
  const area = h('div', { class: 'stack comic-area' });
  area.append(h('div', { class: 'comic__task' }, h('b', { text: TASK[mode] || TASK.pick }),
    ex.replyRu && (mode === 'tiles' || mode === 'type' || mode === 'speak') ? h('span', { text: tx`Смысл: «${ex.replyRu}»` }) : null));
  if (hideLine) area.append(h('button', { type: 'button', class: 'btn btn--sky comic__again', html: `${icon('speaker')} ${esc(tx('Ещё раз'))}`, onclick: playLine }));
  host.append(area);

  let ctl;
  if (mode === 'audio') ctl = audioOptions(ex, area, api);
  else ctl = inner(mode, area);

  return {
    ...ctl,
    check() {
      stop();
      const res = ctl.check();
      const ok = !!res.ok;
      // Реплика героя открывается вместе с переводом.
      if (hideLine) {
        lineBubble.classList.remove('is-audio');
        lineBubble.innerHTML = `<span class="comic__de" lang="de">${esc(ex.line)}</span>${ex.lineRu ? `<span class="comic__ru">${esc(ex.lineRu)}</span>` : ''}`;
      }
      lineBubble.classList.add('show-ru');
      const after = ok ? ex.after : (ex.oops || OOPS);
      // При ошибке в пузыре — то, что ученик действительно ответил.
      let said = '';
      if (!ok) {
        const wrong = area.querySelector('.opt.is-wrong');
        const input = area.querySelector('input.field');
        const line = area.querySelector('.answer-line');
        if (wrong) said = (wrong.querySelector('.opt__txt') || wrong.lastElementChild).textContent;
        else if (input) said = input.value.trim();
        else if (line) said = [...line.children].map(t => t.textContent).join(' ');
      }
      const mood = ok ? 'happy' : 'surprised';
      const you = h('div', { class: 'comic__panel comic__panel--you' },
        h('div', { html: comicFig('you', ok ? 'talk' : 'surprised') }).firstChild,
        bubble(ok ? reply : (said || '…?'), { tail: 'right' }));
      const react = h('div', { class: `comic__panel comic__panel--react is-${mood}` },
        h('div', { html: comicFig(ex.who, mood) }).firstChild,
        h('div', { class: 'comic__fx', html: FX[mood] }),
        after ? bubble(after.de, { tail: 'left', ru: after.ru }) : null);
      row.append(you, react);
      area.classList.add('is-done');
      requestAnimationFrame(() => { page.classList.add('is-answered'); row.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
      // Озвучка по ролям: ваш ответ, затем реакция героя.
      (async () => {
        if (ok && mode !== 'speak') await say(reply, { who: 'you' });
        if (after) await say(after.de, { who: ex.who });
      })();
      return { ...res, ok, correct: reply, sayAfter: reply, selfSay: true, note: ok ? (res.note || ex.replyRu || '') : res.note };
    }
  };
}

// Варианты ответа, которые можно только услышать: текст откроется после проверки.
function audioOptions(ex, host, api) {
  let sel = null;
  const box = h('div', { class: 'opts' });
  const btns = ex.options.map((o, i) => {
    const b = h('button', { type: 'button', class: 'opt opt--audio', html: `<span class="opt__key">${i + 1}</span>${icon('speaker')}<span class="opt__txt">${esc(tx`Вариант ${i + 1}`)}</span>` });
    b.addEventListener('click', () => {
      sel = i;
      btns.forEach(x => x.classList.toggle('is-selected', x === b));
      say(o, { who: 'you' });
      api.ready(true);
    });
    return b;
  });
  box.append(...btns);
  host.append(box);
  return {
    choose: i => btns[i]?.click(),
    check() {
      btns.forEach((b, i) => { b.setAttribute('disabled', ''); b.querySelector('.opt__txt').textContent = ex.options[i]; });
      const ok = sel === ex.answer;
      btns[ex.answer].classList.add('is-right');
      if (!ok && sel != null) btns[sel].classList.add('is-wrong');
      return { ok };
    }
  };
}
