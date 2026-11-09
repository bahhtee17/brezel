// Экраны приложения: карта курса, слова, повторение, ошибки, профиль, история, тест, запуск урока.
import { h, esc, icon, toast, popover, soundBtn, deWord, deText, shuffle } from './ui.js';
import { mascotSVG, setMood } from './mascot.js';
import { art, scene as sceneArt } from './art.js';
import { allTopics, loadTopic, word, allWords, genForWord, genPairs, practiceSet, preferWords } from './content.js';
import { get, currentStreak, isLessonDone, completeLesson, isStoryDone, completeStory, saveTest, setSetting, setting, today, addDays, reset } from './store.js';
import { dueIds, learnedIds, strength, mistakes, mistakeCount, nextDueDay, MISTAKE_DAYS, MAX_BOX } from './srs.js';
import { runPlayer, lessonSteps } from './player.js';
import { say, sayLines, norm } from './speech.js';

const go = hash => { location.hash = hash; };

// ---------- Общая обвязка ----------
function topbar(titleText) {
  const st = get();
  return h('div', { class: 'topbar' },
    h('div', { class: 'topbar__title', text: titleText }),
    h('div', { class: 'chips' },
      h('span', { class: 'chip chip--fire', title: 'Дней подряд', html: `${icon('fire')}${currentStreak()}` }),
      h('span', { class: 'chip chip--xp', title: 'Опыт', html: `${icon('star')}${st.xp}` })));
}

export function nav(active) {
  const due = dueIds().length, mist = mistakeCount();
  const items = [
    ['#/', 'path', 'Курс', 'home'],
    ['#/words', 'words', 'Слова', 'words'],
    ['#/review', 'review', 'Повторить', 'review', due],
    ['#/mistakes', 'mistakes', 'Ошибки', 'mistakes', mist],
    ['#/profile', 'profile', 'Профиль', 'profile']
  ];
  return h('nav', { class: 'nav', 'aria-label': 'Разделы' }, h('div', { class: 'nav__inner' },
    items.map(([href, ic, label, key, badge]) => h('a', { href, class: active === key ? 'is-active' : '', 'aria-current': active === key ? 'page' : null, html: `${icon(ic)}<span>${label}</span>${badge ? `<span class="badge">${badge > 99 ? '99+' : badge}</span>` : ''}` }))));
}

function mount(screenEl, active) {
  const app = document.getElementById('app');
  app.innerHTML = '';
  app.append(screenEl, nav(active));
  window.scrollTo(0, 0);
}

// ---------- Карта курса ----------
export async function homeScreen() {
  const topics = allTopics();
  const scr = h('div', { class: 'screen' }, topbar('Брецель'));
  const due = dueIds().length;
  if (due) {
    scr.append(h('div', { class: 'card', style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' } },
      h('div', { style: { width: '64px', flex: 'none' }, html: mascotSVG('wave') }),
      h('div', { style: { flex: 1 } }, h('div', { class: 'de', text: `Пора повторить: ${due}` }), h('div', { class: 'small muted', text: 'Слова, которые память начинает терять' })),
      h('button', { class: 'btn btn--sky btn--small', type: 'button', onclick: () => go('#/review') }, 'Повторить')));
  }
  let lastLevel = null;
  let mascotPlaced = false;
  for (const t of topics) {
    if (t.level !== lastLevel) {
      lastLevel = t.level;
      scr.append(h('div', { class: 'level-title', text: t.level === 'a1' ? 'A1 · Start Deutsch 1' : 'A2 · Goethe-Zertifikat A2' }));
    }
    if (!t.ready) {
      scr.append(h('div', { class: 'unit unit--locked' },
        h('div', {}, h('div', { class: 'unit__n', text: `Тема ${t.n}` }), h('div', { class: 'unit__t', text: t.title }), h('div', { class: 'unit__s', text: t.subtitle || 'Скоро' })),
        h('div', { class: 'unit__btn', html: icon('lock').replace('<svg', '<svg style="width:28px;height:28px;opacity:.9"') })));
      continue;
    }
    const topic = await loadTopic(t.id);
    const doneCount = topic.lessons.filter(l => isLessonDone(l.id)).length;
    scr.append(h('div', { class: 'unit' },
      h('div', {}, h('div', { class: 'unit__n', text: `Тема ${t.n} · ${doneCount}/${topic.lessons.length} уроков` }), h('div', { class: 'unit__t', text: t.title }), h('div', { class: 'unit__s', text: t.subtitle })),
      h('button', { class: 'btn btn--ghost btn--small unit__btn', type: 'button', onclick: () => go(`#/words?topic=${t.id}`), html: `${icon('words').replace('<svg', '<svg style="width:20px;height:20px"')}` , 'aria-label': 'Слова темы' })));
    const path = h('div', { class: 'path' });
    const nodes = [
      ...topic.lessons.map((l, i) => ({ type: 'lesson', id: l.id, label: l.title, done: isLessonDone(l.id), href: `#/lesson/${t.id}/${i}`, icon: l.grammar ? 'grammar' : 'star' })),
      { type: 'story', id: `${t.id}:story`, label: 'История', done: isStoryDone(t.id), href: `#/story/${t.id}`, icon: 'book' },
      { type: 'test', id: `${t.id}:test`, label: 'Тест блока', done: (get().tests[t.id]?.best || 0) >= 60, href: `#/test/${t.id}`, icon: 'trophy' }
    ];
    const currentIdx = nodes.findIndex(n => !n.done);
    const offsets = [0, 52, 84, 52, 0, -52, -84, -52];
    nodes.forEach((n, i) => {
      const state = n.done ? 'done' : i === currentIdx ? 'current' : i < currentIdx ? 'done' : 'locked';
      const cls = ['node', n.type === 'story' && 'node--story', n.type === 'test' && 'node--test', state === 'done' && n.type === 'lesson' && 'node--done', state === 'current' && 'node--current', state === 'locked' && 'node--locked'].filter(Boolean).join(' ');
      const ic = state === 'locked' ? 'lock' : state === 'done' && n.type === 'lesson' ? 'check' : n.icon;
      const btn = h('button', { class: cls, type: 'button', 'aria-label': `${n.label}${state === 'locked' ? ' (закрыто)' : ''}`, html: icon(ic) });
      btn.addEventListener('click', () => {
        if (state === 'locked') { toast('Сначала пройдите предыдущие уроки'); return; }
        go(n.href);
      });
      const off = offsets[i % offsets.length];
      const wrap = h('div', { class: 'node-wrap' }, h('div', { style: { transform: `translateX(${off}px)`, position: 'relative' } },
        state === 'current' ? h('div', { class: 'node__label', text: i === 0 && !doneCount ? 'Старт' : n.type === 'lesson' ? n.label : n.label }) : null, btn));
      if (state === 'current' && !mascotPlaced) {
        mascotPlaced = true;
        const m = h('div', { class: 'node-mascot', html: mascotSVG('wave') });
        m.style.left = off >= 0 ? `calc(50% + ${off - 150}px)` : `calc(50% + ${off + 70}px)`;
        wrap.append(m);
      }
      path.append(wrap);
    });
    scr.append(path);
  }
  mount(scr, 'home');
  setTimeout(() => setMood(scr.querySelector('.node-mascot'), 'wave', 'idle', 2400), 300);
  scr.querySelector('.node--current')?.scrollIntoView({ block: 'center' });
}

// ---------- Урок ----------
export async function lessonScreen(topicId, index) {
  const topic = await loadTopic(topicId);
  if (!topic) return go('#/');
  const lesson = topic.lessons[index];
  if (!lesson) return go('#/');
  const lessonWordIds = new Set(lesson.newWords || []);
  preferWords([]); // разминка — только из уже знакомых слов
  const learned = learnedIds().filter(id => !lessonWordIds.has(id) && word(id));
  const due = dueIds().filter(id => !lessonWordIds.has(id) && word(id));
  const warmIds = [...due, ...shuffle(learned.filter(id => !due.includes(id)))].slice(0, 3);
  const warmup = warmIds.map(id => genForWord(word(id)));
  const interIds = shuffle(learned.filter(id => !warmIds.includes(id))).slice(0, 2);
  const interleave = interIds.map(id => genForWord(word(id)));
  const genNew = ws => {
    const out = [];
    const kinds = ['pickDe', 'listenImg', 'pickDe', 'pickRu'];
    ws.slice(0, 4).forEach((w, i) => out.push(genForWord({ ...word(w.id) }, w.img ? kinds[i] : 'pickRu')));
    if (ws.length >= 4) out.push(genPairs(ws.map(w => word(w.id))));
    return out;
  };
  preferWords(lessonWordIds);
  const nextIdx = index + 1;
  const nextLesson = nextIdx < topic.lessons.length ? () => go(`#/lesson/${topicId}/${nextIdx}`) : () => go(`#/story/${topicId}`);
  const steps = lessonSteps(lesson, topic, { warmup, interleave, genNew, nextLesson });
  const outro = steps[steps.length - 1];
  if (nextIdx >= topic.lessons.length) outro.nextLabel = 'К истории темы';
  runPlayer({
    steps, mode: 'lesson', lessonId: lesson.id,
    onExit: () => go('#/'),
    onFinish: sum => completeLesson(lesson.id, { xp: sum?.xp || 0, acc: sum?.acc || 0 })
  });
}

// ---------- Слова ----------
export async function wordsScreen(params) {
  preferWords([]);
  const topics = allTopics().filter(t => t.ready);
  const activeId = params.get('topic') || topics[0]?.id;
  const topic = await loadTopic(activeId);
  const scr = h('div', { class: 'screen' }, topbar('Слова'));
  scr.append(h('div', { class: 'topic-chips' }, topics.map(t => h('button', { type: 'button', class: t.id === activeId ? 'is-on' : '', onclick: () => go(`#/words?topic=${t.id}`) }, `${t.n}. ${t.title}`))));
  const words = topic.words.map(w => word(w.id));
  const learnedSet = new Set(learnedIds());
  const known = words.filter(w => learnedSet.has(w.id));
  scr.append(h('div', { class: 'muted small', style: { margin: '6px 0 12px' }, text: `Изучено ${known.length} из ${words.length}. Нажмите на карточку — услышите слово и пример.` }));

  const pool = (known.length >= 4 ? known : words).filter(w => w.img);
  const game = kind => {
    const set = shuffle(pool).slice(0, 8).map(w => genForWord(w, kind));
    runPlayer({
      steps: [{ kind: 'intro', kicker: 'Тренировка слов', title: kind === 'pickImg' ? 'Угадай по картинке' : 'Услышь и выбери', goal: 'Восемь быстрых заданий', button: 'Поехали' },
        ...set.map((ex, i) => ({ kind: 'ex', ex, key: `g${i}` })), { kind: 'outro', title: 'Тренировка окончена!', bonusXP: 3 }],
      mode: 'practice', onExit: () => go(`#/words?topic=${activeId}`)
    });
  };
  scr.append(h('div', { class: 'seg', style: { marginBottom: '14px' } },
    h('button', { type: 'button', class: 'is-on' }, 'Карточки'),
    h('button', { type: 'button', onclick: () => game('pickImg') }, 'Угадай по картинке'),
    h('button', { type: 'button', onclick: () => game('listenImg') }, 'Услышь и выбери')));

  const grid = h('div', { class: 'word-grid' });
  words.forEach(w => {
    const isKnown = learnedSet.has(w.id);
    const s = strength(w.id);
    const card = h('div', { class: `card wcard ${isKnown ? '' : 'wcard--new'}`, role: 'button', tabindex: '0' },
      h('div', { html: art(w.img) }),
      h('div', { class: 'wcard__de', html: deWord(w) }),
      h('div', { class: 'wcard__ru', text: w.ru }),
      w.ex ? h('div', { class: 'wcard__ex' }, h('div', { class: 'de', text: w.ex.de }), h('div', { text: w.ex.ru })) : null,
      isKnown ? h('div', { class: 'strength', title: 'Сила памяти' }, Array.from({ length: MAX_BOX }, (_, k) => h('i', { class: k < s ? 'on' : '' }))) : null);
    const act = async () => {
      card.classList.toggle('is-open');
      await say(deText(w));
      if (card.classList.contains('is-open') && w.ex) say(w.ex.de);
    };
    card.addEventListener('click', act);
    card.addEventListener('keydown', e => { if (e.key === 'Enter') act(); });
    grid.append(card);
  });
  scr.append(grid);
  mount(scr, 'words');
}

// ---------- Повторение ----------
export function reviewScreen() {
  preferWords([]);
  const due = dueIds();
  const scr = h('div', { class: 'screen' }, topbar('Повторение'));
  const start = (ids, title) => runPlayer({
    steps: [{ kind: 'intro', kicker: 'Интервальное повторение', title, goal: `${ids.length} ${ids.length < 5 ? 'слова' : 'слов'}: сложные чаще, лёгкие реже`, button: 'Начать' },
      ...practiceSet(ids, 12).map((ex, i) => ({ kind: 'ex', ex, key: `r${i}`, tag: 'review' })), { kind: 'outro', title: 'Повторение готово!', bonusXP: 5 }],
    mode: 'review', onExit: () => go('#/review')
  });
  if (due.length) {
    scr.append(h('div', { class: 'card stack center' },
      h('div', { style: { width: '120px', margin: '0 auto' }, html: mascotSVG('wave') }),
      h('h2', { text: `Пора повторить ${due.length} ${due.length < 5 ? 'слова' : 'слов'}` }),
      h('div', { class: 'muted', text: 'Повторение сейчас — лучший момент: слово ещё помнится, но уже ускользает.' }),
      h('button', { class: 'btn btn--sky', type: 'button', onclick: () => start(due, 'Повторение') }, 'Повторить')));
  } else {
    const learned = learnedIds();
    const nd = nextDueDay();
    scr.append(h('div', { class: 'card empty stack' },
      h('div', { html: mascotSVG('happy') }),
      h('h2', { text: learned.length ? 'Всё повторено!' : 'Пока нечего повторять' }),
      h('div', { class: 'muted', text: learned.length ? `Следующее повторение: ${nd === addDays(today(), 1) ? 'завтра' : nd || '—'}.` : 'Пройдите первый урок — слова появятся здесь.' }),
      learned.length >= 4 ? h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => start(shuffle(learned).slice(0, 10), 'Свободная тренировка') }, 'Тренировать всё равно') : h('button', { class: 'btn', type: 'button', onclick: () => go('#/') }, 'К урокам')));
  }
  const learned = learnedIds().map(word).filter(Boolean);
  if (learned.length) {
    scr.append(h('div', { class: 'section-title', text: 'Сила памяти' }));
    const byBox = Array.from({ length: MAX_BOX }, (_, k) => learned.filter(w => strength(w.id) === k + 1).length);
    scr.append(h('div', { class: 'card stack' }, byBox.map((n, k) => h('div', { class: 'score-bar' },
      h('div', { class: 'score-bar__top small' }, h('span', { text: ['Новые', 'Свежие', 'Знакомые', 'Крепкие', 'Надёжные', 'Навсегда'][k] }), h('span', { text: String(n) })),
      h('div', { class: 'score-bar__track' }, h('div', { class: 'score-bar__fill', style: { width: `${learned.length ? (n / learned.length) * 100 : 0}%`, background: ['var(--bad)', 'var(--brand)', 'var(--sky)', 'var(--sky-dark)', 'var(--ok)', 'var(--ok-dark)'][k] } }))))));
  }
  mount(scr, 'review');
}

// ---------- Тетрадь ошибок ----------
function describeEx(ex) {
  const t = { tiles: 'Собрать фразу', gap: 'Пропуск', reply: 'Диалог', write: 'Перевод', dictation: 'Диктант', speak: 'Говорение', listen: 'Аудирование', pick: 'Выбор', form: 'Анкета', tf: 'Верно/неверно', listenDialog: 'Аудирование' }[ex.type] || 'Задание';
  const text = ex.answer && typeof ex.answer === 'string' ? ex.answer : ex.de || ex.line || ex.text || ex.q || ex.ru || '';
  return { t, text: String(text).replace(/<[^>]+>/g, '').replace('___', '…') };
}

export function mistakesScreen() {
  preferWords([]);
  const list = mistakes();
  const scr = h('div', { class: 'screen' }, topbar('Ошибки'));
  if (!list.length) {
    scr.append(h('div', { class: 'card empty stack' }, h('div', { html: mascotSVG('happy') }), h('h2', { text: 'Тетрадь ошибок пуста' }),
      h('div', { class: 'muted', text: 'Сюда автоматически попадает каждое слово и задание, где была ошибка. Уходит после 3 верных ответов подряд в разные дни.' })));
    mount(scr, 'mistakes');
    return;
  }
  scr.append(h('div', { class: 'muted small', style: { marginBottom: '12px' }, text: `Элемент уходит из тетради после ${MISTAKE_DAYS} верных ответов подряд в разные дни. Точки — сколько дней уже засчитано.` }));
  const start = () => {
    const items = shuffle(list).slice(0, 12);
    const steps = items.map((m, i) => {
      if (m.kind === 'word') { const w = word(m.ref); return w ? { kind: 'ex', ex: genForWord(w), key: `m${i}`, mistakeKey: { kind: 'word', ref: m.ref } } : null; }
      return m.payload ? { kind: 'ex', ex: m.payload, key: `m${i}`, mistakeKey: { kind: 'ex', ref: m.ref } } : null;
    }).filter(Boolean);
    runPlayer({
      steps: [{ kind: 'intro', kicker: 'Тетрадь ошибок', title: 'Мои ошибки', goal: 'Верный ответ сегодня засчитывается как один день', button: 'Начать' }, ...steps, { kind: 'outro', title: 'Тренировка ошибок готова!', bonusXP: 5 }],
      mode: 'mistakes', onExit: () => go('#/mistakes')
    });
  };
  scr.append(h('button', { class: 'btn btn--bad', type: 'button', style: { marginBottom: '16px' }, onclick: start }, `Тренировать ошибки (${list.length})`));
  const box = h('div', { class: 'list' });
  list.forEach(m => {
    let main, sub, pic = '';
    if (m.kind === 'word') {
      const w = word(m.ref);
      if (!w) return;
      main = deText(w); sub = w.ru; pic = art(w.img);
    } else {
      const d = describeEx(m.payload || {});
      main = d.text; sub = d.t;
      pic = art('wrong');
    }
    box.append(h('div', { class: 'card row' }, h('div', { html: pic }),
      h('div', { class: 'row__main' }, h('div', { class: 'row__t', text: main }), h('div', { class: 'row__s', text: sub })),
      h('div', { class: 'hits', title: 'Верных ответов в разные дни' }, Array.from({ length: MISTAKE_DAYS }, (_, k) => h('i', { class: k < m.hits.length ? 'on' : '' })))));
  });
  scr.append(box);
  mount(scr, 'mistakes');
}

// ---------- Профиль ----------
export function profileScreen() {
  const st = get();
  const scr = h('div', { class: 'screen' }, topbar('Профиль'));
  const lessonsDone = Object.values(st.lessons).filter(l => l.done).length;
  const learned = learnedIds().length;
  const level = Math.floor(st.xp / 100) + 1;
  scr.append(h('div', { class: 'card hero', style: { marginBottom: '14px' } },
    h('div', { html: mascotSVG('happy') }),
    h('div', {}, h('div', { class: 'task-kicker', text: `Уровень ${level}` }), h('h2', { text: 'Ученик Брецеля' }),
      h('div', { class: 'small muted', text: `До уровня ${level + 1}: ${100 - (st.xp % 100)} опыта` }),
      h('div', { class: 'score-bar__track', style: { marginTop: '6px' } }, h('div', { class: 'score-bar__fill', style: { width: `${st.xp % 100}%`, background: 'var(--brand)' } })))));
  scr.append(h('div', { class: 'kpis', style: { marginBottom: '14px' } },
    h('div', { class: 'card kpi' }, h('div', { class: 'kpi__v', text: String(currentStreak()) }), h('div', { class: 'kpi__k', text: 'дней подряд' })),
    h('div', { class: 'card kpi' }, h('div', { class: 'kpi__v', text: String(st.xp) }), h('div', { class: 'kpi__k', text: 'опыта всего' })),
    h('div', { class: 'card kpi' }, h('div', { class: 'kpi__v', text: String(learned) }), h('div', { class: 'kpi__k', text: 'слов в памяти' })),
    h('div', { class: 'card kpi' }, h('div', { class: 'kpi__v', text: String(lessonsDone) }), h('div', { class: 'kpi__k', text: 'уроков пройдено' }))));
  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const week = h('div', { class: 'week' });
  for (let k = -6; k <= 0; k++) {
    const d = today(k);
    const dt = new Date(); dt.setDate(dt.getDate() + k);
    week.append(h('div', {}, days[(dt.getDay() + 6) % 7], h('i', { class: `${st.days[d] ? 'on' : ''} ${k === 0 ? 'today' : ''}`, title: `${st.days[d] || 0} опыта` })));
  }
  scr.append(h('div', { class: 'section-title', text: 'Последние 7 дней' }), h('div', { class: 'card' }, week));
  const sw = (key, label) => {
    const inp = h('input', { type: 'checkbox', 'aria-label': label });
    inp.checked = !!setting(key);
    inp.addEventListener('change', () => setSetting(key, inp.checked));
    return h('label', { class: 'setting' }, h('span', { text: label }), h('span', { class: 'switch' }, inp, h('span')));
  };
  scr.append(h('div', { class: 'section-title', text: 'Настройки' }), h('div', { class: 'card' },
    sw('sfx', 'Звуки ответов'), sw('speak', 'Задания на говорение'), sw('slow', 'Медленная озвучка всегда')));
  scr.append(h('div', { class: 'section-title', text: 'Об озвучке' }), h('div', { class: 'card small muted', html: 'Слова и диалоги озвучены живыми голосами: ElevenLabs и <b>OmniVoice</b> (k2-fsa, лицензия CC BY-NC, через VoiceStudio). Если для фразы нет записи, её читает голос браузера — лучше всего звучат Chrome и Edge.' }));
  const resetBtn = h('button', { class: 'btn btn--link', type: 'button', style: { margin: '18px auto 0', color: 'var(--bad-dark)' } }, 'Сбросить весь прогресс');
  resetBtn.addEventListener('click', () => { if (confirm('Удалить весь прогресс? Это нельзя отменить.')) { reset(); toast('Прогресс сброшен'); go('#/'); } });
  scr.append(resetBtn);
  mount(scr, 'profile');
}

// ---------- История ----------
export async function storyScreen(topicId) {
  const topic = await loadTopic(topicId);
  if (!topic?.story) return go('#/');
  const s = topic.story;
  const known = new Map(allWords().map(w => [norm(w.de), w]));
  const gloss = new Map(Object.entries(s.glossary || {}).map(([k, v]) => [norm(k), v]));
  const newSet = new Set((s.newWords || []).map(norm));
  const app = document.getElementById('app');
  app.innerHTML = '';
  const scr = h('div', { class: 'screen screen--bare' });
  scr.append(h('div', { class: 'lesson__head' }, h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Назад', html: icon('close'), onclick: () => go('#/') }), h('div', { class: 'task-kicker', text: `История · тема ${topic.meta.n}` })));
  if (s.art) scr.append(h('div', { class: 'scene-art', style: { margin: '6px 0 14px' }, html: sceneArt(s.art) }));
  scr.append(h('h1', { style: { fontSize: '28px', marginBottom: '6px' }, text: s.title }), h('div', { class: 'muted small', style: { marginBottom: '14px' }, text: 'Нажмите на слово — перевод и озвучка. Пунктиром отмечены новые слова.' }));
  const text = h('div', { class: 'story-text card' });
  const paras = s.sentences.map(sent => {
    const p = h('p');
    sent.de.split(/(\s+)/).forEach(tok => {
      if (/^\s+$/.test(tok)) { p.append(tok); return; }
      const core = tok.replace(/^[„“"«(]+|[.,!?;:„“"»)]+$/g, '');
      const key = norm(core);
      const w = known.get(key);
      const g = gloss.get(key);
      const span = h('span', { class: `w ${newSet.has(key) ? 'is-new' : ''}`, text: tok });
      span.addEventListener('click', () => {
        say(core);
        const tr = g || (w ? w.ru : null);
        popover(span, `<b>${esc(core)}</b> — ${esc(tr || 'перевод в предложении ниже')}<br><span style="opacity:.8">${esc(sent.ru)}</span>`);
      });
      p.append(span);
    });
    text.append(p);
    return p;
  });
  scr.append(text);
  const listenBtn = h('button', { class: 'btn btn--sky', type: 'button', style: { marginTop: '14px' }, html: `${icon('speaker').replace('<svg', '<svg style="width:22px;height:22px"')} Слушать всю историю` });
  listenBtn.addEventListener('click', async () => {
    listenBtn.disabled = true;
    await sayLines(s.sentences.map(x => ({ de: x.de, who: x.who || 'f' })), i => paras.forEach((p, k) => p.classList.toggle('is-reading', k === i)));
    listenBtn.disabled = false;
  });
  const qBtn = h('button', { class: 'btn btn--ok', type: 'button', style: { marginTop: '14px' } }, 'Ответить на вопросы');
  qBtn.addEventListener('click', () => runPlayer({
    steps: [...s.questions.map((ex, i) => ({ kind: 'ex', ex: { ...ex, text: ex.text }, key: `${topicId}:story:${i}` })), { kind: 'outro', title: 'История прочитана!', sub: s.title, teaser: s.teaser, bonusXP: 10, nextLabel: 'К тесту блока', onNext: () => go(`#/test/${topicId}`) }],
    mode: 'story', onExit: () => go('#/'), onFinish: () => completeStory(topicId)
  }));
  scr.append(listenBtn, qBtn);
  app.append(scr);
  window.scrollTo(0, 0);
}

// ---------- Тест блока в формате экзамена ----------
export async function testScreen(topicId) {
  const topic = await loadTopic(topicId);
  if (!topic?.test) return go('#/');
  const T = topic.test;
  const steps = [{ kind: 'intro', kicker: `Тест блока · тема ${topic.meta.n}`, title: T.title, goal: T.goal, note: 'Как на экзамене: ответы не показываются сразу. Результат — в конце. Для сдачи нужно 60 из 100.', button: 'Начать тест' }];
  T.parts.forEach(p => {
    steps.push({ kind: 'section', badge: p.badge, title: p.title, text: esc(p.intro), mood: 'idle', button: 'Начать' });
    p.items.forEach((ex, i) => steps.push({ kind: 'ex', ex, part: p.id, key: `${topicId}:test:${p.id}:${i}` }));
  });
  steps.push({ kind: 'outro', parts: T.parts.map(p => ({ id: p.id, title: p.title, max: p.max || 25 })) });
  runPlayer({
    steps, mode: 'test', exam: true, onExit: () => go('#/'),
    onFinish: sum => { if (sum) saveTest(topicId, sum.score); }
  });
}
