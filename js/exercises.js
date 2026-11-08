// Типы упражнений. Каждый mount(ex, host, api) рисует задание и возвращает { check() }.
// api: { ready(bool), complete(result), say(text, opts) }
// Результат проверки: { ok, correct, note, score }.
import { h, esc, shuffle, icon, soundBtn } from './ui.js';
import { art, avatar, charName } from './art.js';
import { say, canListen, listen, diffWords, matchText, norm, sayLines } from './speech.js';
import { setting, setSetting } from './store.js';
import { mascotSVG } from './mascot.js';

const kicker = (text, cls = '') => h('div', { class: `task-kicker ${cls}` }, text);
const title = (text) => h('div', { class: 'task-title', html: text });

function umlautBar(input) {
  return h('div', { class: 'umlauts' }, ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'].map(ch => h('button', {
    type: 'button',
    onclick: () => {
      const s = input.selectionStart ?? input.value.length, e = input.selectionEnd ?? input.value.length;
      input.value = input.value.slice(0, s) + ch + input.value.slice(e);
      input.focus();
      input.setSelectionRange(s + 1, s + 1);
      input.dispatchEvent(new Event('input'));
    }
  }, ch)));
}

function playRow(text, who, auto = true) {
  const row = h('div', { class: 'listen-box' },
    soundBtn(() => say(text, { who }), { big: true }),
    soundBtn(() => say(text, { who, slow: true }), { slow: true }));
  if (auto) setTimeout(() => say(text, { who }), 350);
  return row;
}

// Разбить фразу на плитки: знаки препинания по краям убираем.
export function tokens(s) {
  return String(s).split(/\s+/).map(t => t.replace(/^[„“"«(]+|[.,!?;:„“"»)]+$/g, '')).filter(Boolean);
}

// ---------- Выбор варианта ----------
function mountPick(ex, host, api) {
  host.append(kicker(ex.kicker || 'Выберите ответ'));
  const isDeQ = ex.audio && ex.q && !/[а-яё]/i.test(ex.q);
  if (isDeQ) {
    host.append(h('div', { class: 'coach' }, h('div', { html: mascotSVG('idle') }), h('div', { class: 'bubble' }, h('span', { class: 'task-title', text: ex.q }), ' ', soundBtn(() => say(ex.audio), { mini: true }))));
    setTimeout(() => say(ex.audio), 350);
  } else {
    if (ex.q) host.append(title(esc(ex.q)));
    if (ex.text) host.append(h('div', { class: 'note-paper', html: ex.text }));
    if (ex.audio) host.append(playRow(ex.audio, ex.who));
  }
  if (ex.img) host.append(h('div', { style: { width: '170px', margin: '0 auto' }, html: art(ex.img) }));
  const cards = ex.options.some(o => o.img);
  const box = h('div', { class: `opts ${cards ? 'opts--grid' : ''} ${cards && ex.options.length === 3 ? 'opts--3' : ''}` });
  let sel = null;
  const btns = ex.options.map((o, i) => {
    const label = o.de || o.ru || o.text || '';
    const b = h('button', { type: 'button', class: `opt ${cards ? 'opt--card' : ''}` });
    if (cards) {
      b.innerHTML = `${o.img ? art(o.img) : ''}<span class="opt__label">${esc(label)}</span>`;
    } else {
      b.innerHTML = `<span class="opt__key">${i + 1}</span><span>${esc(label)}</span>`;
    }
    b.addEventListener('click', () => {
      sel = i;
      btns.forEach(x => x.classList.toggle('is-selected', x === b));
      if (o.say) say(o.say);
      api.ready(true);
    });
    return b;
  });
  box.append(...btns);
  host.append(box);
  return {
    choose: i => btns[i]?.click(),
    check() {
      btns.forEach(b => b.setAttribute('disabled', ''));
      const ok = sel === ex.answer;
      btns[ex.answer].classList.add('is-right');
      if (!ok && sel != null) btns[sel].classList.add('is-wrong');
      const a = ex.options[ex.answer];
      return { ok, correct: a.de || a.ru || a.text, note: ex.explain };
    }
  };
}

// ---------- Аудирование: услышать и выбрать ----------
function mountListen(ex, host, api) {
  return mountPick({ ...ex, kicker: ex.kicker || 'Услышь и выбери', q: ex.q || 'Что вы слышите?', audio: ex.de, options: ex.options.map(t => (typeof t === 'string' ? { de: t } : t)) }, host, api);
}

// ---------- Сборка фразы из плиток ----------
function mountTiles(ex, host, api) {
  const toRu = ex.dir === 'ru';
  host.append(kicker(ex.kicker || (toRu ? 'Переведите на русский' : 'Соберите фразу по-немецки')));
  const promptText = toRu ? ex.de : ex.ru;
  if (toRu) {
    host.append(h('div', { class: 'coach' }, h('div', { html: mascotSVG('idle') }), h('div', { class: 'bubble' }, h('span', { class: 'task-title', text: promptText }), ' ', soundBtn(() => say(ex.de), { mini: true }))));
    setTimeout(() => say(ex.de), 350);
  } else {
    host.append(h('div', { class: 'coach' }, h('div', { html: mascotSVG('idle') }), h('div', { class: 'bubble task-title', text: promptText })));
  }
  const answer = toRu ? ex.ruAnswer || ex.ru : ex.answer;
  const toks = tokens(answer);
  const bankWords = shuffle([...toks, ...(ex.distract || [])]);
  const line = h('div', { class: 'answer-line' });
  const bank = h('div', { class: 'bank' });
  const chosen = [];
  const bankBtns = bankWords.map(w => {
    const b = h('button', { type: 'button', class: 'tile' }, w);
    b.addEventListener('click', () => {
      if (b.classList.contains('is-used')) return;
      b.classList.add('is-used');
      const t = h('button', { type: 'button', class: 'tile' }, w);
      t.addEventListener('click', () => {
        const i = chosen.findIndex(c => c.tile === t);
        if (i >= 0) chosen.splice(i, 1);
        t.remove();
        b.classList.remove('is-used');
        api.ready(chosen.length > 0);
      });
      chosen.push({ w, tile: t });
      line.append(t);
      if (!toRu) say(w);
      api.ready(true);
    });
    return b;
  });
  bank.append(...bankBtns);
  host.append(line, bank);
  return {
    check() {
      const built = chosen.map(c => c.w).join(' ');
      const accepts = [answer, ...((toRu ? ex.ruAlts : ex.alts) || [])];
      const ok = accepts.some(a => norm(a) === norm(built));
      [...line.children, ...bank.children].forEach(b => b.setAttribute('disabled', ''));
      line.style.borderColor = ok ? 'var(--ok)' : 'var(--bad)';
      return { ok, correct: answer, note: ok ? (toRu ? '' : ex.ru) : ex.explain, sayAfter: toRu ? null : answer };
    }
  };
}

// ---------- Заполнить пропуск ----------
function mountGap(ex, host, api) {
  host.append(kicker(ex.kicker || 'Заполните пропуск'));
  if (ex.ru) host.append(h('div', { class: 'task-sub', text: ex.ru }));
  const parts = ex.text.split('___');
  const slot = h('span', { class: 'tile', style: { minWidth: '90px', justifyContent: 'center', color: 'var(--ink-3)', borderStyle: 'dashed' } }, '…');
  const sentence = h('div', { class: 'task-title', style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', lineHeight: '1.6' } },
    parts[0] ? h('span', {}, parts[0].trim()) : null, slot, parts[1] ? h('span', {}, parts[1].trim()) : null);
  host.append(sentence);
  let sel = null;
  const box = h('div', { class: 'opts' });
  const btns = ex.options.map((o, i) => {
    const b = h('button', { type: 'button', class: 'opt', html: `<span class="opt__key">${i + 1}</span><span>${esc(o)}</span>` });
    b.addEventListener('click', () => {
      sel = i;
      btns.forEach(x => x.classList.toggle('is-selected', x === b));
      slot.textContent = o;
      slot.style.color = 'var(--sky-dark)';
      slot.style.borderStyle = 'solid';
      api.ready(true);
    });
    return b;
  });
  box.append(...btns);
  host.append(box);
  const full = ex.text.replace('___', ex.options[ex.answer]);
  return {
    choose: i => btns[i]?.click(),
    check() {
      btns.forEach(b => b.setAttribute('disabled', ''));
      const ok = sel === ex.answer;
      btns[ex.answer].classList.add('is-right');
      if (!ok && sel != null) btns[sel].classList.add('is-wrong');
      slot.style.color = ok ? 'var(--ok-dark)' : 'var(--bad-dark)';
      return { ok, correct: full, note: ex.explain, sayAfter: full };
    }
  };
}

// ---------- Мини-диалог: выбрать реплику ----------
function mountReply(ex, host, api) {
  host.append(kicker(ex.kicker || 'Ответьте в диалоге', ex.boss ? 'task-kicker--boss' : ''));
  if (ex.situation) host.append(h('div', { class: 'scene-note', text: ex.situation }));
  const line = h('div', { class: 'line' },
    h('div', { html: avatar(ex.who) }),
    h('div', { class: 'line__bubble' },
      h('div', { class: 'line__who', text: charName(ex.who) }),
      h('div', { class: 'line__de', text: ex.line }),
      h('div', { class: 'line__ru', text: ex.lineRu || '' })));
  line.addEventListener('click', () => { line.classList.toggle('show-ru'); say(ex.line, { who: ex.who }); });
  host.append(h('div', { class: 'chat' }, line));
  setTimeout(() => say(ex.line, { who: ex.who }), 350);
  host.append(h('div', { class: 'small muted', text: 'Нажмите на реплику, чтобы увидеть перевод' }));
  return mountPickOptions(ex, host, api);
}

function mountPickOptions(ex, host, api) {
  let sel = null;
  const box = h('div', { class: 'opts' });
  const btns = ex.options.map((o, i) => {
    const b = h('button', { type: 'button', class: 'opt', html: `<span class="opt__key">${i + 1}</span><span>${esc(o)}</span>` });
    b.addEventListener('click', () => { sel = i; btns.forEach(x => x.classList.toggle('is-selected', x === b)); api.ready(true); });
    return b;
  });
  box.append(...btns);
  host.append(box);
  return {
    choose: i => btns[i]?.click(),
    check() {
      btns.forEach(b => b.setAttribute('disabled', ''));
      const ok = sel === ex.answer;
      btns[ex.answer].classList.add('is-right');
      if (!ok && sel != null) btns[sel].classList.add('is-wrong');
      return { ok, correct: ex.options[ex.answer], note: ex.explain || ex.answerRu, sayAfter: ex.options[ex.answer] };
    }
  };
}

// ---------- Письмо: перевести или записать на слух ----------
function mountWrite(ex, host, api, dictation = false) {
  if (dictation) {
    host.append(kicker(ex.kicker || 'Прослушайте и напишите'));
    host.append(playRow(ex.de, ex.who));
  } else {
    host.append(kicker(ex.kicker || 'Напишите по-немецки'));
    host.append(h('div', { class: 'coach' }, h('div', { html: mascotSVG('idle') }), h('div', { class: 'bubble task-title', text: ex.ru })));
  }
  if (ex.hint) host.append(h('div', { class: 'small muted', text: ex.hint }));
  const input = h('input', { class: 'field', type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', lang: 'de', placeholder: 'Ваш ответ по-немецки' });
  input.addEventListener('input', () => api.ready(input.value.trim().length > 0));
  host.append(input, umlautBar(input));
  setTimeout(() => input.focus({ preventScroll: true }), 400);
  const accepts = ex.accept || [ex.de];
  return {
    check() {
      const r = matchText(input.value, accepts);
      input.classList.add(r.ok ? 'is-right' : 'is-wrong');
      input.setAttribute('disabled', '');
      return { ok: r.ok, correct: accepts[0], note: r.typo ? `Почти! Опечатка — правильно: ${accepts[0]}` : (dictation ? ex.ru : ''), sayAfter: accepts[0] };
    }
  };
}

// ---------- Говорение ----------
function speakingOff() {
  return !canListen() || !setting('speak') || (setting('noSpeakUntil') || 0) > Date.now();
}

function mountSpeak(ex, host, api) {
  const asTiles = () => mountTiles({ ru: ex.ru, answer: ex.de, distract: ex.distract || [], kicker: 'Соберите фразу (вместо речи)' }, host, api);
  if (speakingOff()) return asTiles();
  host.append(kicker(ex.kicker || 'Скажите вслух'));
  host.append(h('div', { class: 'coach' }, h('div', { html: mascotSVG('idle') }),
    h('div', { class: 'bubble' }, h('div', { class: 'task-title', text: ex.de }), h('div', { class: 'small muted', text: ex.ru }))));
  host.append(h('div', { class: 'listen-box' }, soundBtn(() => say(ex.de), { label: 'Послушать образец' }), soundBtn(() => say(ex.de, { slow: true }), { slow: true })));
  const heard = h('div', { class: 'heard muted', text: 'Нажмите на микрофон и скажите фразу' });
  const mic = h('button', { type: 'button', class: 'mic-btn', 'aria-label': 'Говорить', html: icon('mic') });
  let best = { score: 0, words: [] };
  let tries = 0;
  const ctl = {
    check() {
      const ok = best.score >= 0.75;
      return { ok, correct: ex.de, note: ok ? ex.ru : 'Послушайте образец и попробуйте ещё раз в следующий раз.' };
    }
  };
  mic.addEventListener('click', async () => {
    if (mic.classList.contains('is-listening')) return;
    mic.classList.add('is-listening');
    heard.textContent = 'Слушаю…';
    try {
      const alts = await listen();
      tries++;
      if (!alts.length) { heard.textContent = 'Ничего не услышал. Попробуйте ещё раз, чуть громче.'; }
      else {
        const results = alts.map(a => diffWords(ex.de, a));
        best = results.reduce((a, b) => (b.score > a.score ? b : a), best.score ? best : results[0]);
        heard.innerHTML = best.words.map(x => `<span class="${x.ok ? 'w-ok' : 'w-miss'}">${esc(x.w)}</span>`).join(' ');
        if (best.score >= 0.75) { api.ready(true); setTimeout(() => api.autoCheck?.(), 500); }
        else heard.insertAdjacentHTML('beforeend', '<div class="small muted">Подчёркнутые слова не распознаны. Ещё раз?</div>');
      }
      if (tries >= 2) api.ready(true);
    } catch (e) {
      heard.textContent = e.message === 'not-allowed' ? 'Нет доступа к микрофону. Можно ответить без речи.' : 'Распознавание недоступно. Можно ответить без речи.';
      api.ready(true);
    } finally {
      mic.classList.remove('is-listening');
    }
  });
  const skip = h('button', { type: 'button', class: 'btn btn--link', text: 'Сейчас не могу говорить' });
  skip.addEventListener('click', () => {
    setSetting('noSpeakUntil', Date.now() + 60 * 60 * 1000);
    host.innerHTML = '';
    api.ready(false);
    const t = asTiles();
    ctl.check = t.check;
  });
  host.append(mic, heard, skip);
  return ctl;
}

// ---------- Пары на скорость ----------
function mountPairs(ex, host, api) {
  host.append(kicker(ex.kicker || 'Пары на скорость'));
  host.append(title('Соедините слово и перевод'));
  const timer = h('div', { class: 'timer', text: '0,0 с' });
  host.append(timer);
  const left = shuffle(ex.pairs.map((p, i) => ({ t: p[0], i })));
  const right = shuffle(ex.pairs.map((p, i) => ({ t: p[1], i })));
  const grid = h('div', { class: 'pairs' });
  let selL = null, selR = null, mistakes = 0, matched = 0, t0 = 0, tick = 0;
  const lb = [], rb = [];
  const start = () => {
    if (t0) return;
    t0 = performance.now();
    tick = setInterval(() => { timer.textContent = `${((performance.now() - t0) / 1000).toFixed(1).replace('.', ',')} с`; }, 100);
  };
  const tryMatch = () => {
    if (selL == null || selR == null) return;
    const L = lb[selL], R = rb[selR];
    if (left[selL].i === right[selR].i) {
      L.classList.remove('is-selected'); R.classList.remove('is-selected');
      L.classList.add('is-right'); R.classList.add('is-right');
      setTimeout(() => { L.classList.add('is-done'); R.classList.add('is-done'); }, 250);
      matched++;
      if (matched === ex.pairs.length) {
        clearInterval(tick);
        const sec = (performance.now() - t0) / 1000;
        setTimeout(() => api.complete({ ok: mistakes === 0, correct: '', note: `Время: ${sec.toFixed(1).replace('.', ',')} с${mistakes ? `, ошибок: ${mistakes}` : ' — без ошибок!'}`, bonus: sec < 15 && !mistakes ? 3 : 0 }), 380);
      }
    } else {
      mistakes++;
      L.classList.add('is-wrong'); R.classList.add('is-wrong');
      setTimeout(() => { L.classList.remove('is-wrong', 'is-selected'); R.classList.remove('is-wrong', 'is-selected'); }, 380);
    }
    selL = selR = null;
  };
  for (let k = 0; k < left.length; k++) {
    const a = h('button', { type: 'button', class: 'opt', text: left[k].t });
    a.addEventListener('click', () => { start(); selL = k; lb.forEach(x => x.classList.toggle('is-selected', x === a)); say(left[k].t.replace(/^(der|die|das) /, '$1 ')); tryMatch(); });
    const b = h('button', { type: 'button', class: 'opt', text: right[k].t });
    b.addEventListener('click', () => { start(); selR = k; rb.forEach(x => x.classList.toggle('is-selected', x === b)); tryMatch(); });
    lb.push(a); rb.push(b);
    grid.append(a, b);
  }
  host.append(grid);
  return { selfComplete: true, check: () => ({ ok: true }) };
}

// ---------- Объяснение грамматики ----------
function mountInfo(ex, host, api) {
  host.append(kicker(ex.kicker || 'Грамматика'));
  const card = h('div', { class: 'card rule' });
  card.append(h('h3', { text: ex.title }));
  (ex.paras || []).forEach(p => card.append(h('p', { html: p })));
  if (ex.table) {
    const t = h('table', { class: 'rule-table' });
    if (ex.table.head) t.append(h('tr', {}, ex.table.head.map(c => h('th', { html: c }))));
    ex.table.rows.forEach(r => {
      const tr = h('tr', {}, r.map(c => h('td', { html: c })));
      if (ex.table.say) {
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', () => say(r.map(c => c.replace(/<[^>]+>/g, '').trim()).filter(x => x && !/[а-яё]/i.test(x) && !x.startsWith('-')).join(' ').replace(/ \/ /g, ', ')));
      }
      t.append(tr);
    });
    card.append(t);
  }
  if (ex.examples) {
    const list = h('div', { class: 'ex-list' });
    ex.examples.forEach(e => list.append(h('div', { class: 'ex-item' }, soundBtn(() => say(e.de), { mini: true }), h('div', {}, h('div', { class: 'de', html: e.hl || esc(e.de) }), h('div', { class: 'small muted', text: e.ru })))));
    card.append(list);
  }
  if (ex.tip) card.append(h('div', { class: 'tip', html: ex.tip }));
  if (ex.art) host.append(h('div', { style: { width: '120px', margin: '0 auto' }, html: art(ex.art) }));
  host.append(card);
  api.ready(true);
  return { info: true, check: () => ({ ok: true, info: true }) };
}

// ---------- Анкета (Schreiben, Teil 1) ----------
function mountForm(ex, host, api) {
  host.append(kicker(ex.kicker || 'Заполните анкету'));
  if (ex.task) host.append(h('div', { class: 'task-sub', text: ex.task }));
  host.append(h('div', { class: 'note-paper', html: ex.intro }));
  const paper = h('div', { class: 'form-paper' });
  if (ex.formTitle) paper.append(h('div', { class: 'de', style: { marginBottom: '10px' }, text: ex.formTitle }));
  const grid = h('div', { class: 'form-grid' });
  const inputs = ex.fields.map(f => {
    const id = `f${Math.random().toString(36).slice(2, 8)}`;
    const inp = h('input', { class: 'field', id, type: 'text', autocomplete: 'off', spellcheck: 'false', lang: 'de', value: f.given || '' });
    if (f.given) inp.setAttribute('disabled', '');
    inp.addEventListener('input', () => api.ready(inputs.some(x => !x.disabled && x.value.trim())));
    grid.append(h('div', { class: 'form-row' }, h('label', { for: id, text: f.label }), inp));
    return inp;
  });
  paper.append(grid);
  host.append(paper);
  return {
    check() {
      let right = 0;
      const total = ex.fields.filter(f => !f.given).length;
      const wrong = [];
      ex.fields.forEach((f, i) => {
        if (f.given) return;
        const r = f.contains
          ? { ok: f.contains.every(c => norm(inputs[i].value).includes(norm(c))) }
          : matchText(inputs[i].value, f.accept);
        inputs[i].classList.add(r.ok ? 'is-right' : 'is-wrong');
        inputs[i].setAttribute('disabled', '');
        if (r.ok) right++; else wrong.push(`${f.label}: ${f.accept[0]}`);
      });
      return { ok: right === total, score: total ? right / total : 1, correct: wrong.join(' · '), note: right === total ? 'Все поля верны!' : `Верно ${right} из ${total}.` };
    }
  };
}

// ---------- Верно / неверно ----------
function mountTF(ex, host, api) {
  host.append(kicker(ex.kicker || 'Richtig oder falsch?'));
  if (ex.text) host.append(h('div', { class: 'note-paper', html: ex.text }));
  if (ex.audio) host.append(playRow(ex.audio, ex.who));
  host.append(title(esc(ex.statement)));
  if (ex.statementRu) host.append(h('div', { class: 'small muted', text: ex.statementRu }));
  return mountPickOptions({ options: ['Richtig — верно', 'Falsch — неверно'], answer: ex.answer ? 0 : 1, explain: ex.explain }, host, api);
}

// ---------- Аудирование в формате экзамена: диалог, ограничение прослушиваний ----------
function mountListenDialog(ex, host, api) {
  host.append(kicker(ex.kicker || 'Hören'));
  host.append(title(esc(ex.q)));
  if (ex.qRu) host.append(h('div', { class: 'small muted', text: ex.qRu }));
  let plays = ex.maxPlays || 2;
  const left = h('div', { class: 'plays-left', text: `Можно прослушать: ${plays}` });
  const btn = soundBtn(async () => {
    if (plays <= 0) return;
    plays--;
    left.textContent = plays ? `Можно прослушать ещё: ${plays}` : 'Прослушивания закончились';
    await sayLines(ex.audio);
    if (!plays) btn.setAttribute('disabled', '');
  }, { big: true });
  host.append(h('div', { class: 'listen-box' }, btn), left);
  const opts = ex.options.map(o => (typeof o === 'string' ? { text: o } : o));
  const sub = h('div');
  host.append(sub);
  const ctl = mountPickInto(opts, ex.answer, sub, api);
  return { ...ctl, transcript: ex.audio.map(l => l.de).join(' ') };
}

function mountPickInto(opts, answer, host, api) {
  const cards = opts.some(o => o.img);
  const box = h('div', { class: `opts ${cards ? 'opts--grid' : ''} ${cards && opts.length === 3 ? 'opts--3' : ''}` });
  let sel = null;
  const btns = opts.map((o, i) => {
    const label = o.text || o.de || o.ru;
    const b = h('button', { type: 'button', class: `opt ${cards ? 'opt--card' : ''}`, html: cards ? `${o.img ? art(o.img) : ''}<span class="opt__label">${esc(label)}</span>` : `<span class="opt__key">${String.fromCharCode(97 + i)}</span><span>${esc(label)}</span>` });
    b.addEventListener('click', () => { sel = i; btns.forEach(x => x.classList.toggle('is-selected', x === b)); api.ready(true); });
    return b;
  });
  box.append(...btns);
  host.append(box);
  return {
    choose: i => btns[i]?.click(),
    check() {
      btns.forEach(b => b.setAttribute('disabled', ''));
      const ok = sel === answer;
      btns[answer].classList.add('is-right');
      if (!ok && sel != null) btns[sel].classList.add('is-wrong');
      return { ok, correct: opts[answer].text || opts[answer].de || opts[answer].ru };
    }
  };
}

// ---------- Рассказ о себе по карточке (Sprechen, Teil 1) ----------
function mountSpeakCard(ex, host, api) {
  host.append(kicker(ex.kicker || 'Sprechen, Teil 1'));
  host.append(title(esc(ex.q || 'Расскажите о себе')));
  if (ex.sub) host.append(h('div', { class: 'small muted', text: ex.sub }));
  const chips = ex.points.map(p => h('span', {}, p.label));
  host.append(h('div', { class: 'speak-card' }, chips));
  const area = h('textarea', { class: 'field', lang: 'de', spellcheck: 'false', placeholder: 'Ich heiße … Ich komme aus … Ich wohne in … Ich spreche …' });
  const evaluate = text => {
    let n = 0;
    ex.points.forEach((p, i) => {
      const ok = new RegExp(p.re, 'i').test(norm(text));
      chips[i].classList.toggle('is-done', ok);
      if (ok) n++;
    });
    return n;
  };
  area.addEventListener('input', () => { evaluate(area.value); api.ready(area.value.trim().length > 3); });
  if (!speakingOff()) {
    const heard = h('div', { class: 'heard small muted', text: 'Скажите 4 предложения или напишите их ниже' });
    const mic = h('button', { type: 'button', class: 'mic-btn', 'aria-label': 'Говорить', html: icon('mic') });
    mic.addEventListener('click', async () => {
      mic.classList.add('is-listening');
      heard.textContent = 'Слушаю… говорите все предложения подряд';
      try {
        const alts = await listen({ timeout: 15000 });
        if (alts.length) {
          area.value = (area.value ? `${area.value} ` : '') + alts[0];
          evaluate(area.value);
          heard.textContent = 'Записал. Можно поправить текст или сказать ещё.';
          api.ready(true);
        } else heard.textContent = 'Ничего не услышал. Попробуйте ещё раз.';
      } catch { heard.textContent = 'Микрофон недоступен — напишите ответ.'; }
      mic.classList.remove('is-listening');
    });
    host.append(mic, heard);
  }
  host.append(area);
  return {
    check() {
      const n = evaluate(area.value);
      area.setAttribute('disabled', '');
      const miss = ex.points.filter((p, i) => !chips[i].classList.contains('is-done')).map(p => p.model);
      return { ok: n === ex.points.length, score: n / ex.points.length, correct: miss.join(' '), note: `Пунктов раскрыто: ${n} из ${ex.points.length}.` };
    }
  };
}

const TYPES = {
  pick: mountPick, choose: mountPick, listen: mountListen, tiles: mountTiles, gap: mountGap, reply: mountReply,
  write: (e, h2, a) => mountWrite(e, h2, a, false), dictation: (e, h2, a) => mountWrite(e, h2, a, true),
  speak: mountSpeak, pairs: mountPairs, info: mountInfo, form: mountForm, tf: mountTF,
  listenDialog: mountListenDialog, speakCard: mountSpeakCard
};

// Варианты ответа перемешиваются при каждом показе, чтобы правильный не стоял всегда первым.
const SHUFFLE = new Set(['pick', 'choose', 'listen', 'gap', 'reply', 'listenDialog']);
function shuffleOptions(ex) {
  if (!SHUFFLE.has(ex.type) || ex.noShuffle || !Array.isArray(ex.options) || typeof ex.answer !== 'number') return ex;
  const order = shuffle(ex.options.map((_, i) => i));
  return { ...ex, options: order.map(i => ex.options[i]), answer: order.indexOf(ex.answer) };
}

export function mountExercise(ex, host, api) {
  const fn = TYPES[ex.type];
  if (!fn) {
    host.append(h('div', { class: 'card', text: `Неизвестный тип задания: ${ex.type}` }));
    api.ready(true);
    return { check: () => ({ ok: true, info: true }) };
  }
  const shown = shuffleOptions(ex);
  const ctl = fn(shown, host, api);
  // Для автотестов на локальном сервере: какое задание сейчас на экране.
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__brezel = { ex: shown, ctl, host };
  return ctl;
}
