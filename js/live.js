// «Живая сценка» — знакомство с новыми словами вместо чата и карточек.
// 1) explore: ученик ищет предметы на картинке сцены, потом находит их по звуку.
// 2) detect: сценка идёт сама, а на новом слове останавливается — смысл надо угадать по ситуации.
// Включается полем lesson.scene.live = { spots: [{word, x, y}], guess: [{line, word, form, options, answer}] }.
import { tx } from './i18n.js';
import { h, esc, deWord, pick, soundBtn } from './ui.js';
import { art, scene as sceneArt, avatar, charName } from './art.js';
import { say, stop, sfx } from './speech.js';

const spoken = w => (w.art ? `${w.art} ${w.de}` : w.de);
const wait = ms => new Promise(r => setTimeout(r, ms));
const shuffle = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(p => p[1]);

// Маленькая карточка-награда: картинка, слово с артиклем, перевод.
function miniCard(w, { big = false } = {}) {
  const el = h('button', { class: `live-card ${big ? 'live-card--big' : ''}`, type: 'button' },
    h('span', { class: 'live-card__art', html: art(w.img) }),
    h('span', { class: 'live-card__txt' },
      h('span', { class: 'live-card__de', html: deWord(w) }),
      h('span', { class: 'live-card__ru', text: w.ru }),
      big && w.note ? h('span', { class: 'live-card__note', text: w.note }) : null));
  el.addEventListener('click', () => say(spoken(w)));
  return el;
}

// ---------- 1. Найди на картинке ----------
export function showExplore(s, { body, setMain, mainBtn, next, learn }) {
  const spots = s.spots;
  const found = new Set();
  let mode = 'explore', target = null, queue = [];

  const kicker = h('div', { class: 'task-kicker', text: tx('Исследуйте сцену') });
  const task = h('div', { class: 'task-title', text: tx('Нажимайте на светящиеся места') });
  const stage = h('div', { class: 'live-stage scene-art', html: sceneArt(s.scene.art) });
  const tray = h('div', { class: 'live-tray' });
  const prompt = h('div', { class: 'live-prompt' });
  body.append(kicker, task, stage, prompt, tray);

  const btns = spots.map(sp => {
    const b = h('button', { class: 'live-spot', type: 'button', 'aria-label': '?', style: { left: `${sp.x}%`, top: `${sp.y}%` } },
      h('span', { class: 'live-spot__ring' }),
      h('span', { class: 'live-spot__tag', html: deWord(sp.w) }));
    b.addEventListener('click', () => tap(sp, b));
    stage.append(b);
    return b;
  });

  const status = () => setMain(tx`Найдено ${found.size} из ${spots.length}`, { enabled: false, cls: 'btn--sky' });
  status();

  function tap(sp, b) {
    if (mode === 'explore') {
      say(spoken(sp.w));
      if (found.has(sp.word)) return;
      found.add(sp.word);
      learn(sp.w.id);
      sfx('ok');
      btns.forEach(x => x.classList.remove('is-last'));
      b.classList.add('is-found', 'is-last');
      tray.append(miniCard(sp.w));
      status();
      if (found.size === spots.length) setTimeout(startFind, 1300);
    } else if (mode === 'find' && target) {
      if (sp !== target) {
        sfx('bad');
        b.classList.remove('is-wrong'); void b.offsetWidth; b.classList.add('is-wrong');
        return;
      }
      sfx('ok');
      target = null;
      b.classList.add('is-hit');
      setTimeout(() => b.classList.remove('is-hit'), 700);
      say(spoken(sp.w));
      setTimeout(ask, 900);
    }
  }

  function startFind() {
    mode = 'find';
    btns.forEach(x => x.classList.remove('is-last'));
    stage.classList.add('is-quiz');
    tray.style.display = 'none';
    kicker.textContent = tx('Проверка на слух');
    task.textContent = tx('Где это? Послушайте и нажмите на картинке');
    queue = shuffle(spots);
    ask();
  }

  function ask() {
    target = queue.shift();
    if (!target) {
      mode = 'done';
      stage.classList.remove('is-quiz');
      tray.style.display = '';
      prompt.innerHTML = '';
      prompt.append(h('div', { class: 'live-done', text: tx('Все слова найдены!') }));
      sfx('done');
      setMain(tx('Дальше'));
      mainBtn.onclick = () => { stop(); next(); };
      return;
    }
    prompt.innerHTML = '';
    prompt.append(soundBtn(() => say(spoken(target.w))), h('span', { class: 'live-prompt__q', text: tx('Где это?') }));
    say(spoken(target.w));
    setMain(tx`Осталось: ${queue.length + 1}`, { enabled: false, cls: 'btn--sky' });
  }
}

// ---------- 2. Детектив слов ----------
export function showDetect(s, { body, setMain, mainBtn, next, learn }) {
  const sc = s.scene;
  const guessAt = Object.fromEntries((s.guess || []).map(g => [g.line, g]));
  const known = (s.highlight || []).filter(Boolean).sort((a, b) => b.length - a.length);
  const mark = (text, hide) => {
    let out = esc(text);
    if (hide) out = out.replace(new RegExp(`(^|[^\\wäöüß])(${hide.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?=[^\\wäöüß]|$)`), '$1\u0000$2\u0001');
    known.forEach(w => { out = out.replace(new RegExp(`(^|[^\\wäöüß\u0000])(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?=[^\\wäöüß\u0001]|$)`, 'gi'), '$1<span class="hl">$2</span>'); });
    return out.replace('\u0000', '<span class="live-q">').replace('\u0001', '</span>');
  };

  if (sc.art) body.append(h('div', { class: 'scene-art', html: sceneArt(sc.art) }));
  body.append(h('div', { class: 'task-kicker', text: tx('Детектив слов') }),
    h('div', { class: 'small muted', text: tx('Сценка идёт сама. На новом слове угадайте смысл по ситуации.') }));
  if (sc.setting) body.append(h('div', { class: 'scene-note', text: sc.setting }));
  const chat = h('div', { class: 'chat' });
  body.append(chat);
  const alive = () => chat.isConnected;

  const lineEl = (l, i) => {
    const g = guessAt[i];
    const me = l.who === 'you';
    const el = h('div', { class: `line ${me ? 'line--me' : ''}` },
      h('div', { html: avatar(l.who) }),
      h('div', { class: 'line__bubble' },
        h('div', { class: 'line__who', text: charName(l.who) }),
        h('div', { class: 'line__de', html: mark(l.de, g && (g.form || g.w.de)) }),
        h('div', { class: 'line__ru', text: l.ru })));
    el.addEventListener('click', () => { el.classList.toggle('show-ru'); say(l.de, { who: l.who }); });
    return el;
  };

  // Вопрос «что значит …?»: ждём ответа, затем показываем карточку-награду.
  const guess = (g, el) => new Promise(resolve => {
    const w = g.w;
    const q = el.querySelector('.live-q');
    q?.classList.add('is-asking');
    const opts = shuffle(g.options.map((t, k) => ({ t, ok: k === g.answer })));
    const box = h('div', { class: 'live-guess card' },
      h('div', { class: 'live-guess__q', html: tx`Что значит <b>${esc(g.form || w.de)}</b>? Угадайте по ситуации` }));
    const row = h('div', { class: 'live-guess__opts' });
    opts.forEach(o => {
      const b = h('button', { class: 'opt', type: 'button' }, h('span', { class: 'opt__txt', text: o.t }));
      b.addEventListener('click', () => {
        if (box.classList.contains('is-done')) return;
        box.classList.add('is-done');
        row.querySelectorAll('.opt').forEach((x, k) => { x.disabled = true; if (opts[k].ok) x.classList.add('is-right'); });
        if (!o.ok) b.classList.add('is-wrong');
        sfx(o.ok ? 'ok' : 'bad');
        q?.classList.remove('is-asking');
        q?.classList.add(o.ok ? 'is-solved' : 'is-shown');
        el.classList.add('show-ru');
        learn(w.id);
        const verdict = h('div', { class: `live-guess__verdict ${o.ok ? 'is-ok' : ''}`, text: o.ok ? pick([tx('Верно! Вы детектив!'), tx('Точно! По ситуации понятно.'), 'Super!']) : tx('Не страшно — теперь вы знаете:') });
        box.append(verdict, miniCard(w, { big: true }));
        say(spoken(w));
        setMain(tx('Дальше'), { cls: 'btn--sky' });
        mainBtn.onclick = () => { stop(); box.classList.add('is-closed'); resolve(); };
      });
      row.append(b);
    });
    box.append(row);
    chat.append(box);
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setMain(tx('Выберите ответ'), { enabled: false, cls: 'btn--sky' });
  });

  let skip = false;
  (async () => {
    for (let i = 0; i < sc.lines.length; i++) {
      if (!alive()) return;
      const l = sc.lines[i];
      const el = lineEl(l, i);
      chat.append(el);
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setMain(tx('Слушайте…'), { cls: 'btn--sky' });
      mainBtn.onclick = () => { skip = true; stop(); };
      skip = false;
      await Promise.race([say(l.de, { who: l.who }), new Promise(r => { const t = setInterval(() => { if (skip || !alive()) { clearInterval(t); r(); } }, 80); })]);
      if (!alive()) return;
      if (guessAt[i]) await guess(guessAt[i], el);
      else if (!skip) await wait(450);
    }
    if (!alive()) return;
    setMain(tx('Продолжить'));
    mainBtn.onclick = () => { stop(); next(); };
  })();
}
