// Проигрыватель урока: шаги (вступление, сценка, новые слова, упражнения, босс, итог),
// проверка ответов, комбо, опыт, интервальное повторение и тетрадь ошибок.
import { h, esc, icon, soundBtn, deWord, pick, toast } from './ui.js';
import { mascotSVG, setMood } from './mascot.js';
import { art, scene as sceneArt, avatar, charName } from './art.js';
import { mountExercise } from './exercises.js';
import { say, stop, sfx } from './speech.js';
import { learn, grade, addMistake, mistakeCorrect, mistakeWrong, isLearned } from './srs.js';
import { addXP } from './store.js';
import { word as wordById } from './content.js';

let activeCleanup = null;
const PRAISE = ['Отлично!', 'Супер!', 'Так держать!', 'Wunderbar!', 'Prima!', 'Верно!', 'Sehr gut!', 'Klasse!'];
const OOPS = ['Почти!', 'Не совсем', 'Ошибка — не страшно', 'Ещё разок'];

// opts.onAnswer(step, ok, { hinted, skipped }) — после каждого ответа (для проверок освоения и входного теста).
// opts.allowSkip — кнопка «Не знаю» (входной тест). Подсказки есть везде, кроме экзаменов.
export function runPlayer(opts) {
  const { steps: initial, mode = 'lesson', title = '', onExit, onFinish, onAnswer, allowSkip = false, exam = false } = opts;
  const app = document.getElementById('app');
  app.innerHTML = '';
  stop();

  const steps = initial.slice();
  let idx = 0, done = 0;
  let combo = 0, maxCombo = 0, right = 0, graded = 0, xp = 0;
  const examResults = {}; // часть -> [score]
  const requeued = new Set();
  let ctl = null, canCheck = false, phase = 'answer', hinted = false;

  const bar = h('div', { class: 'progress__bar', style: { width: '0%' } });
  const comboEl = h('div', { class: 'combo' });
  const closeBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Выйти', html: icon('close') });
  const head = h('div', { class: 'lesson__head' }, closeBtn, h('div', { class: 'progress' }, bar), comboEl);
  const body = h('div', { class: 'lesson__body' });
  const mainBtn = h('button', { class: 'btn', type: 'button' }, 'Проверить');
  const skipBtn = h('button', { class: 'btn btn--link skip-btn', type: 'button' }, 'Не знаю');
  const foot = h('div', { class: 'lesson__foot' }, mainBtn, allowSkip ? skipBtn : null);
  const root = h('div', { class: 'lesson' }, head, body, foot);

  const fbTitle = h('div', { class: 'feedback__title' });
  const fbText = h('div', { class: 'feedback__text' });
  const fbMascot = h('div', { html: mascotSVG('idle') });
  const fbBtn = h('button', { class: 'btn btn--ok', type: 'button' }, 'Дальше');
  const fbSay = h('span');
  const fbWhy = h('div', { class: 'why' });
  const feedback = h('div', { class: 'feedback', role: 'status' },
    h('div', { class: 'feedback__inner' }, h('div', { class: 'feedback__head' }, fbMascot, fbTitle, h('span', { class: 'spacer' }), fbSay), fbText, fbWhy, fbBtn));
  app.append(root, feedback);

  closeBtn.addEventListener('click', () => {
    if (idx >= steps.length - 1 || confirm('Выйти? Прогресс этого урока не сохранится.')) { cleanup(); stop(); onExit?.(); }
  });

  const onKey = e => {
    if (e.target.matches('input, textarea') && e.key !== 'Enter') return;
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = phase === 'feedback' ? fbBtn : mainBtn.isConnected ? mainBtn : foot.querySelector('.btn');
      if (target && !target.disabled) target.click();
    }
    else if (/^[1-9]$/.test(e.key) && phase === 'answer' && ctl?.choose) ctl.choose(Number(e.key) - 1);
  };
  // Новый проигрыватель (например, «Повторить сейчас») снимает обработчики прежнего.
  activeCleanup?.();
  document.addEventListener('keydown', onKey);
  function cleanup() { document.removeEventListener('keydown', onKey); if (activeCleanup === cleanup) activeCleanup = null; }
  activeCleanup = cleanup;
  window.addEventListener('hashchange', cleanup, { once: true });

  function setProgress() {
    const total = steps.filter(s => s.kind !== 'outro' && s.kind !== 'gate').length;
    bar.style.width = `${Math.min(100, (done / Math.max(1, total)) * 100)}%`;
  }

  function setMain(label, { enabled = true, cls = '' } = {}) {
    mainBtn.textContent = label;
    mainBtn.className = `btn ${cls}`;
    mainBtn.disabled = !enabled;
  }

  function next() {
    feedback.classList.remove('is-open');
    phase = 'answer';
    done++;
    idx++;
    setProgress();
    show();
  }

  function show() {
    stop();
    body.innerHTML = '';
    body.scrollTop = 0;
    window.scrollTo(0, 0);
    const s = steps[idx];
    if (!s) return;
    // «Шлагбаум» входного теста: если часть не сдана, остальные вопросы пропускаются.
    if (s.kind === 'gate') {
      if (!s.pass(examResults)) {
        const outroAt = steps.findIndex(x => x.kind === 'outro');
        if (outroAt > idx) steps.splice(idx + 1, outroAt - idx - 1);
      }
      idx++;
      setProgress();
      show();
      return;
    }
    foot.style.display = '';
    skipBtn.style.display = s.kind === 'ex' ? '' : 'none';
    ({ intro: showIntro, section: showSection, scene: showScene, word: showWord, ex: showEx, outro: showOutro })[s.kind](s);
  }

  // ---------- Вступление ----------
  function showIntro(s) {
    body.append(h('div', { class: 'stack stack--lg center', style: { margin: 'auto 0' } },
      h('div', { style: { width: '160px', margin: '0 auto' }, html: mascotSVG('wave') }),
      h('div', { class: 'task-kicker', text: s.kicker || '' }),
      h('h1', { style: { fontSize: '30px' }, text: s.title }),
      s.goal ? h('div', { class: 'task-sub', text: s.goal }) : null,
      s.note ? h('div', { class: 'scene-note', text: s.note }) : null));
    setMain(s.button || 'Начать');
    mainBtn.onclick = () => { sfx('tap'); next(); };
  }

  function showSection(s) {
    body.append(h('div', { class: 'stack stack--lg center', style: { margin: 'auto 0' } },
      h('div', { style: { width: '140px', margin: '0 auto' }, html: mascotSVG(s.mood || 'wave') }),
      s.badge ? h('div', {}, h('span', { class: 'part-badge', text: s.badge })) : null,
      h('h2', { style: { fontSize: '26px' }, text: s.title }),
      s.text ? h('div', { class: 'task-sub', html: s.text }) : null));
    setMain(s.button || 'Дальше', { cls: s.boss ? 'btn--bad' : '' });
    mainBtn.onclick = () => { sfx('tap'); next(); };
  }

  // ---------- Сценка ----------
  function showScene(s) {
    const sc = s.scene;
    if (sc.art) body.append(h('div', { class: 'scene-art', html: sceneArt(sc.art) }));
    if (sc.setting) body.append(h('div', { class: 'scene-note', text: sc.setting }));
    const chat = h('div', { class: 'chat' });
    body.append(chat, h('div', { class: 'small muted center', text: 'Нажмите на реплику — перевод и повтор' }));
    const words = (s.highlight || []).filter(Boolean).sort((a, b) => b.length - a.length);
    const mark = text => {
      let out = esc(text);
      words.forEach(w => { out = out.replace(new RegExp(`(^|[^\\wäöüß])(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?=[^\\wäöüß]|$)`, 'gi'), '$1<span class="hl">$2</span>'); });
      return out;
    };
    let shown = 0;
    const addLine = () => {
      const l = sc.lines[shown];
      const me = l.who === 'you';
      const el = h('div', { class: `line ${me ? 'line--me' : ''}` },
        h('div', { html: avatar(l.who) }),
        h('div', { class: 'line__bubble' },
          h('div', { class: 'line__who', text: charName(l.who) }),
          h('div', { class: 'line__de', html: mark(l.de) }),
          h('div', { class: 'line__ru', text: l.ru })));
      el.addEventListener('click', () => { el.classList.toggle('show-ru'); say(l.de, { who: l.who }); });
      chat.append(el);
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      say(l.de, { who: l.who });
      shown++;
    };
    addLine();
    const update = () => setMain(shown < sc.lines.length ? 'Дальше' : 'Продолжить', { cls: shown < sc.lines.length ? 'btn--sky' : '' });
    update();
    mainBtn.onclick = () => {
      if (shown < sc.lines.length) { addLine(); update(); }
      else next();
    };
  }

  // ---------- Новое слово ----------
  function showWord(s) {
    const w = s.word;
    learn(w.id);
    const card = h('div', { class: 'card word-card' },
      h('div', { html: art(w.img, '', { anim: true }) }),
      h('div', { class: 'word-card__de', html: deWord(w) }),
      w.plural ? h('div', { class: 'small muted', text: `мн. ч.: ${w.plural}` }) : null,
      h('div', { class: 'word-card__ru', text: w.ru }),
      h('div', { class: 'listen-box' }, soundBtn(() => say(w.art ? `${w.art} ${w.de}` : w.de)), soundBtn(() => say(w.art ? `${w.art} ${w.de}` : w.de, { slow: true }), { slow: true })),
      w.note ? h('div', {}, h('span', { class: 'word-card__note', text: w.note })) : null,
      w.ex ? h('div', { class: 'word-card__ex' },
        h('div', { class: 'ex-item', style: { justifyContent: 'center' } }, soundBtn(() => say(w.ex.de), { mini: true }), h('div', { style: { textAlign: 'left' } }, h('div', { class: 'de', text: w.ex.de }), h('div', { class: 'small muted', text: w.ex.ru })))) : null);
    body.append(h('div', { class: 'task-kicker center', text: `Новое слово · ${s.i + 1} из ${s.n}` }), card,
      h('div', { class: 'dots' }, Array.from({ length: s.n }, (_, k) => h('i', { class: k === s.i ? 'on' : '' }))));
    setTimeout(() => say(w.art ? `${w.art} ${w.de}` : w.de), 300);
    setMain(s.i + 1 < s.n ? 'Дальше' : 'К заданиям');
    mainBtn.onclick = () => next();
  }

  // ---------- Упражнение ----------
  function showEx(s) {
    const ex = s.ex;
    const tagText = { warmup: 'Разминка · повторение', review: 'Повторение', boss: 'Мини-босс' }[s.tag];
    if (tagText && ex.type !== 'info') body.append(h('div', { class: `task-kicker ${s.tag === 'boss' ? 'task-kicker--boss' : 'task-kicker--review'}`, html: `${s.tag === 'boss' ? icon('boss').replace('<svg', '<svg style="width:16px;height:16px;display:inline;vertical-align:-2px"') : ''} ${tagText}` }));
    if (s.retry) body.append(h('div', { class: 'task-kicker task-kicker--review', text: 'Ещё раз: здесь была ошибка' }));
    const host = h('div', { class: 'stack stack--lg' });
    body.append(host);
    canCheck = false;
    const api = {
      ready: v => { canCheck = v; if (phase === 'answer') mainBtn.disabled = !v; },
      complete: res => finishEx(s, res),
      autoCheck: () => { if (phase === 'answer' && canCheck) mainBtn.click(); }
    };
    hinted = false;
    ctl = mountExercise(ex.boss ? ex : { ...ex, boss: s.tag === 'boss' }, host, api);
    if (ctl.selfComplete) { foot.style.display = 'none'; return; }
    if (ctl.info) { setMain('Понятно'); mainBtn.onclick = () => next(); skipBtn.style.display = 'none'; return; }
    // Подсказка, как в Khan Academy: помогает, но ответ с ней засчитывается только наполовину и без опыта.
    if (ctl.hint && !exam) {
      const hintBtn = h('button', { class: 'hint-btn', type: 'button', html: `${icon('bulb')}<span>Подсказка</span>` });
      hintBtn.addEventListener('click', () => {
        if (phase !== 'answer' || hinted) return;
        const r = ctl.hint();
        if (r === false) { hintBtn.disabled = true; hintBtn.lastChild.textContent = 'Подсказки нет'; return; }
        hinted = true;
        hintBtn.disabled = true;
        hintBtn.lastChild.textContent = 'Подсказка взята';
        if (typeof r === 'string') host.append(h('div', { class: 'hint-note', html: r }));
      });
      host.append(h('div', { class: 'hint-row' }, hintBtn));
    }
    setMain(exam ? 'Ответить' : 'Проверить', { enabled: canCheck });
    mainBtn.onclick = () => {
      if (!canCheck) return;
      finishEx(s, ctl.check());
    };
    skipBtn.onclick = () => { if (phase === 'answer') finishEx(s, { ok: false, skipped: true }); };
  }

  function finishEx(s, res) {
    const ex = s.ex;
    phase = 'feedback';
    const ok = !!res.ok;
    const score = typeof res.score === 'number' ? res.score : ok ? 1 : 0;

    // Память слов и тетрадь ошибок.
    (ex.words || []).forEach(id => {
      if (!isLearned(id)) return;
      grade(id, ok, !!ex.auto);
      if (ok) mistakeCorrect('word', id);
    });
    if (s.mistakeKey) {
      if (ok) { if (mistakeCorrect(s.mistakeKey.kind, s.mistakeKey.ref)) toast('Ошибка исправлена навсегда — убрана из тетради!'); }
      else mistakeWrong(s.mistakeKey.kind, s.mistakeKey.ref);
    } else if (!ok && !ex.auto && ex.type !== 'pairs' && ex.type !== 'speakCard' && mode !== 'placement') {
      addMistake('ex', s.key || `${opts.lessonId || mode}:${idx}`, ex);
    }
    onAnswer?.(s, ok && !hinted, { hinted, skipped: !!res.skipped });

    if (exam) {
      (examResults[s.part] = examResults[s.part] || []).push(score);
      done++; idx++; setProgress(); phase = 'answer';
      setTimeout(show, 120);
      return;
    }

    graded++;
    if (ok && hinted) {
      // С подсказкой: половина балла точности, без опыта и без комбо.
      right += 0.5;
      sfx('ok');
    } else if (ok) {
      right++;
      combo++;
      maxCombo = Math.max(maxCombo, combo);
      xp += s.tag === 'boss' ? 2 : 1;
      if (combo >= 3) xp += 1;
      if (res.bonus) xp += res.bonus;
      sfx(combo === 3 || combo === 5 || combo === 10 ? 'combo' : 'ok');
    } else {
      combo = 0;
      sfx('bad');
      // Ошибочное задание вернётся в конце урока (кроме «пар» и экзамена).
      const key = s.key || idx;
      if (!s.retry && !requeued.has(key) && ex.type !== 'pairs' && ex.type !== 'speakCard') {
        requeued.add(key);
        const outroAt = steps.findIndex(x => x.kind === 'outro');
        steps.splice(outroAt >= 0 ? outroAt : steps.length, 0, { ...s, retry: true, key });
      }
    }
    comboEl.textContent = combo >= 3 ? `Комбо ×${combo}` : '';
    comboEl.classList.toggle('is-on', combo >= 3);
    if (combo >= 3) { comboEl.classList.remove('is-pop'); void comboEl.offsetWidth; comboEl.classList.add('is-pop'); }

    feedback.classList.toggle('feedback--bad', !ok);
    fbTitle.textContent = ok ? (res.bonus ? `${pick(PRAISE)} +${res.bonus} бонус` : pick(PRAISE)) : pick(OOPS);
    const parts = [];
    if (!ok && res.correct) parts.push(`Правильно: <b>${esc(res.correct)}</b>`);
    if (res.note) parts.push(esc(res.note));
    if (ok && hinted) parts.push('С подсказкой: засчитано наполовину, без опыта.');
    else if (ok && combo >= 3) parts.push(`Комбо ×${combo}: +1 опыт за ответ`);
    fbText.innerHTML = parts.join('<br>') || (ok ? 'Так держать!' : '');
    renderWhy(s, res, ok);
    fbSay.innerHTML = '';
    if (res.sayAfter || (ok ? null : res.correct)) {
      const t = res.sayAfter || res.correct;
      if (!/[а-яё]/i.test(t)) fbSay.append(soundBtn(() => say(t), { mini: true }));
    }
    fbBtn.className = `btn ${ok ? 'btn--ok' : 'btn--bad'}`;
    fbBtn.textContent = ok ? 'Дальше' : 'Понятно';
    feedback.classList.add('is-open');
    setMood(fbMascot, ok ? 'happy' : 'sad', null);
    foot.style.visibility = 'hidden';
    if (ok && res.sayAfter && ex.type !== 'speak') setTimeout(() => say(res.sayAfter), 150);
    fbBtn.onclick = () => { foot.style.visibility = ''; next(); };
    setTimeout(() => fbBtn.focus({ preventScroll: true }), 50);
  }

  // «Почему так»: объяснение ошибки — разбор из задания, значения слов и правило урока.
  function renderWhy(s, res, ok) {
    fbWhy.innerHTML = '';
    if (ok) return;
    const ex = s.ex;
    const box = [];
    if (res.why) box.push(h('div', { class: 'why__main', html: res.why }));
    if (ex.explain && ex.explain !== res.note) box.push(h('div', { class: 'why__main', text: ex.explain }));
    const ws = (ex.words || []).map(wordById).filter(Boolean).slice(0, 2);
    ws.forEach(w => box.push(h('div', { class: 'why__word' },
      h('div', { class: 'why__pic', html: art(w.img) }),
      h('div', { class: 'why__wt' }, h('div', { class: 'de', html: deWord(w) }), h('div', { class: 'small muted', text: w.note ? `${w.ru} · ${w.note}` : w.ru })))));
    if (s.rule) {
      box.push(h('button', { class: 'why__rule-btn', type: 'button', html: `${icon('grammar')}<span>Правило: ${esc(s.rule.title)}</span>`, onclick: () => openRule(s.rule) }));
    }
    if (!box.length) return;
    fbWhy.append(h('div', { class: 'why__title', text: 'Почему так' }), ...box);
  }

  // Правило урока поверх задания — без выхода из урока.
  function openRule(info) {
    const host = h('div', { class: 'stack' });
    const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-label': info.title || 'Правило' },
      h('div', { class: 'sheet__card' },
        h('div', { class: 'sheet__bar' }, h('button', { class: 'icon-btn sheet__close', type: 'button', 'aria-label': 'Закрыть', html: icon('close') })),
        host));
    mountExercise({ ...info, kicker: 'Правило урока' }, host, { ready() {}, complete() {} });
    sheet.addEventListener('click', e => { if (e.target === sheet || e.target.closest('.sheet__close')) sheet.remove(); });
    document.body.append(sheet);
  }

  // ---------- Итог ----------
  function showOutro(s) {
    document.querySelector('.sheet')?.remove();
    feedback.classList.remove('is-open');
    bar.style.width = '100%';
    let summary;
    if (s.render) {
      // Свой итоговый экран (входной тест): получает ответы по частям.
      summary = s.render(body, { examResults });
      onFinish?.(summary);
    } else if (exam) {
      summary = buildExamResult(s);
      onFinish?.(summary);
    } else {
      const acc = graded ? Math.round((right / graded) * 100) : 100;
      const bonus = s.bonusXP || 0;
      const total = xp + bonus;
      addXP(total);
      sfx('done');
      summary = { xp: total, acc, maxCombo };
      // Результат сохраняется сразу, даже если ученик закроет приложение на этом экране.
      const fin = onFinish?.(summary);
      const title = typeof s.title === 'function' ? s.title(summary) : s.title;
      body.append(h('div', { class: 'stack stack--lg result', style: { margin: 'auto 0' } },
        h('div', { html: mascotSVG('happy') }),
        h('h1', { style: { fontSize: '28px' }, text: title || 'Готово!' }),
        s.sub ? h('div', { class: 'task-sub', text: s.sub }) : null,
        h('div', { class: 'stats' },
          h('div', { class: 'stat stat--xp' }, h('div', { class: 'stat__k', text: 'Опыт' }), h('div', { class: 'stat__v', text: `+${total}` })),
          h('div', { class: 'stat stat--acc' }, h('div', { class: 'stat__k', text: 'Точность' }), h('div', { class: 'stat__v', text: `${acc}%` })),
          h('div', { class: 'stat stat--combo' }, h('div', { class: 'stat__k', text: 'Комбо' }), h('div', { class: 'stat__v', text: `×${maxCombo}` }))),
        s.extra ? s.extra(summary, fin) : null,
        s.teaser ? h('div', { class: 'teaser', html: `<b>Что дальше?</b> ${esc(s.teaser)}` }) : null));
      setTimeout(() => setMood(body, 'happy', 'idle', 2000), 50);
    }
    foot.style.visibility = '';
    if (s.nextLabel && s.onNext) {
      foot.innerHTML = '';
      const nextB = h('button', { class: 'btn btn--ok', type: 'button' }, s.nextLabel);
      const homeB = h('button', { class: 'btn btn--ghost', type: 'button' }, s.homeLabel || 'На карту');
      foot.append(h('div', { class: 'stack' }, nextB, homeB));
      nextB.onclick = () => { cleanup(); s.onNext(); };
      homeB.onclick = () => { cleanup(); onExit?.(); };
    } else {
      setMain('Продолжить', { cls: 'btn--ok' });
      mainBtn.onclick = () => { cleanup(); onExit?.(); };
    }
  }

  function buildExamResult(s) {
    const parts = s.parts || [];
    let total = 0;
    const rows = parts.map(p => {
      const arr = examResults[p.id] || [];
      const pts = arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * (p.max || 25)) : 0;
      total += pts;
      return { ...p, pts };
    });
    const max = parts.reduce((a, p) => a + (p.max || 25), 0) || 100;
    const scaled = Math.round((total / max) * 100);
    const passed = scaled >= 60;
    addXP(passed ? 30 : 10);
    sfx(passed ? 'done' : 'bad');
    body.append(h('div', { class: 'stack stack--lg result', style: { margin: 'auto 0' } },
      h('div', { html: mascotSVG(passed ? 'happy' : 'sad') }),
      h('h1', { style: { fontSize: '28px' }, text: passed ? 'Тест сдан!' : 'Пока не сдан' }),
      h('div', { class: 'task-sub', text: `${scaled} из 100 баллов. Для сдачи нужно 60 — как на экзамене Goethe.` }),
      h('div', { class: 'score-bars card' }, rows.map(r => h('div', {},
        h('div', { class: 'score-bar__top' }, h('span', { text: r.title }), h('span', { text: `${r.pts} / ${r.max || 25}` })),
        h('div', { class: 'score-bar__track' }, h('div', { class: 'score-bar__fill', style: { width: `${(r.pts / (r.max || 25)) * 100}%`, background: r.pts / (r.max || 25) >= 0.6 ? 'var(--ok)' : 'var(--bad)' } }))))),
      h('div', { class: 'teaser', html: passed ? '<b>Отлично!</b> Тема закрыта. Ошибки из теста можно повторить в разделе «Ошибки».' : '<b>Совет:</b> повторите уроки темы и слова в разделе «Слова», потом попробуйте ещё раз.' })));
    return { score: scaled, passed, rows };
  }

  setProgress();
  show();
}

// ---------- Сборка шагов урока ----------
export function lessonSteps(lesson, topic, { warmup = [], interleave = [], genNew, nextLesson } = {}) {
  const wordsById = Object.fromEntries(topic.words.map(w => [w.id, w]));
  const newWords = (lesson.newWords || []).map(id => wordsById[id]).filter(Boolean);
  const steps = [];
  steps.push({
    kind: 'intro', kicker: `Тема ${topic.meta.n} · Урок ${lesson.index + 1}`, title: lesson.title, goal: lesson.goal,
    note: warmup.length ? `Сначала разминка: ${warmup.length} ${warmup.length === 1 ? 'слово' : 'слова'} из прошлых уроков.` : (lesson.index === 0 ? 'Это ваш первый урок. Разминки пока нет — сразу к делу!' : '')
  });
  warmup.forEach((ex, i) => steps.push({ kind: 'ex', ex, tag: 'warmup', key: `w${i}` }));
  if (lesson.scene) steps.push({ kind: 'scene', scene: lesson.scene, highlight: newWords.map(w => w.de.replace(/[!?.…]+$/, '')) });
  newWords.forEach((w, i) => steps.push({ kind: 'word', word: w, i, n: newWords.length }));

  // Упражнения: сначала автоузнавание новых слов, затем авторские задания; старые слова вкраплены (чередование).
  const auto = genNew ? genNew(newWords) : [];
  const all = (lesson.exercises || []).map((ex, i) => ({ ex, key: `${lesson.id}:${i}` }));
  // Объяснение грамматики в начале урока идёт сразу после новых слов, до тренировки.
  let lead = 0;
  while (lead < all.length && all[lead].ex.type === 'info') lead++;
  const authored = all.slice(lead);
  const mixed = all.slice(0, lead);
  auto.forEach((ex, i) => mixed.push({ ex, key: `${lesson.id}:a${i}` }));
  authored.forEach((x, i) => {
    mixed.push(x);
    if (i === 1 && interleave[0]) mixed.push({ ex: interleave[0], key: `${lesson.id}:i0`, tag: 'review' });
    if (i === 3 && interleave[1]) mixed.push({ ex: interleave[1], key: `${lesson.id}:i1`, tag: 'review' });
  });
  // Правило урока (первое объяснение грамматики) можно открыть из объяснения ошибки.
  const ruleInfo = (lesson.exercises || []).find(e => e.type === 'info') || null;
  mixed.forEach(x => steps.push({ kind: 'ex', ex: x.ex, key: x.key, tag: x.tag, rule: x.ex.type === 'info' || x.tag === 'review' ? null : ruleInfo }));

  if (lesson.boss && lesson.boss.turns?.length) {
    steps.push({ kind: 'section', boss: true, mood: 'wave', badge: 'Мини-босс', title: lesson.boss.title || 'Мини-босс', text: esc(lesson.boss.intro || ''), button: 'В бой!' });
    lesson.boss.turns.forEach((t, i) => steps.push({ kind: 'ex', ex: { ...t, boss: true }, tag: 'boss', key: `${lesson.id}:b${i}` }));
  }
  steps.push({
    kind: 'outro', title: 'Урок пройден!', sub: lesson.title, teaser: lesson.teaser, bonusXP: 10,
    nextLabel: nextLesson ? 'Следующий урок' : null, onNext: nextLesson || null
  });
  return steps;
}
