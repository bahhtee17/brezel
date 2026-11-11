// Точка входа: загрузка курса, маршрутизация по #хешу, регистрация service worker.
import { loadCourse, loadReadyTopics } from './content.js';
import { initSpeech, stop } from './speech.js';
import { homeScreen, lessonScreen, wordsScreen, reviewScreen, mistakesScreen, profileScreen, storyScreen, testScreen } from './screens.js';
import { h, go } from './ui.js';
import { mascotSVG } from './mascot.js';
import { loadImages, autoplayVideos } from './img.js';
import { readingScreen, ruleScreen } from './reading.js';
import { welcomeScreen, placementTest, needsOnboarding } from './placement.js';
import { runMasteryCheck } from './mastery.js';

const app = document.getElementById('app');

async function route() {
  stop();
  document.querySelector('.pop')?.remove();
  document.querySelector('.feedback')?.remove();
  document.querySelector('.sheet')?.remove();
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, query = ''] = raw.split('?');
  const params = new URLSearchParams(query);
  const parts = path.split('/').filter(Boolean);
  try {
    const [name, a, b] = parts;
    // Первый запуск: сначала выбор «с нуля» или входной тест.
    if (name !== 'welcome' && name !== 'placement' && needsOnboarding()) { location.replace('#/welcome'); return; }
    if (name === 'welcome') return welcomeScreen();
    if (name === 'placement') return await placementTest();
    if (name === 'check') return await runMasteryCheck(() => go('#/'));
    if (!parts.length) return await homeScreen();
    if (name === 'lesson') return await lessonScreen(a, Number(b) || 0);
    if (name === 'words') return await wordsScreen(params);
    if (name === 'read') return a ? await ruleScreen(a) : await readingScreen();
    if (name === 'review') return reviewScreen();
    if (name === 'mistakes') return mistakesScreen();
    if (name === 'profile') return profileScreen();
    if (name === 'story') return await storyScreen(a);
    if (name === 'test') return await testScreen(a);
    location.hash = '#/';
  } catch (err) {
    console.error(err);
    app.innerHTML = '';
    app.append(h('div', { class: 'screen screen--bare empty stack' },
      h('div', { html: mascotSVG('sad') }),
      h('h2', { text: 'Что-то пошло не так' }),
      h('div', { class: 'muted', text: 'Проверьте интернет при первом запуске или обновите страницу.' }),
      h('button', { class: 'btn', type: 'button', onclick: () => { location.hash = '#/'; location.reload(); } }, 'Обновить')));
  }
}

// Заставка из index.html: держим её не меньше секунды с запуска, чтобы она не мелькала, потом плавно убираем.
function hideSplash() {
  const el = document.getElementById('splash');
  if (!el) return;
  setTimeout(() => {
    el.classList.add('is-out');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#FFF7E8');
    setTimeout(() => el.remove(), 450);
  }, Math.max(0, 1100 - performance.now()));
}

async function boot() {
  await loadImages();
  autoplayVideos(app);
  app.append(h('div', { class: 'screen screen--bare empty' }, h('div', { html: mascotSVG('wave') }), h('div', { class: 'muted', text: 'Загружаю уроки…' })));
  await Promise.all([loadCourse(), initSpeech()]);
  await loadReadyTopics();
  window.addEventListener('hashchange', route);
  await route();
}

boot().finally(hideSplash);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* офлайн-режим недоступен */ }));
}
