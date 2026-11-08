// Точка входа: загрузка курса, маршрутизация по #хешу, регистрация service worker.
import { loadCourse, loadReadyTopics } from './content.js';
import { initSpeech, stop } from './speech.js';
import { homeScreen, lessonScreen, wordsScreen, reviewScreen, mistakesScreen, profileScreen, storyScreen, testScreen } from './screens.js';
import { h } from './ui.js';
import { mascotSVG } from './mascot.js';
import { loadImages, autoplayVideos } from './img.js';

const app = document.getElementById('app');

async function route() {
  stop();
  document.querySelector('.pop')?.remove();
  document.querySelector('.feedback')?.remove();
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, query = ''] = raw.split('?');
  const params = new URLSearchParams(query);
  const parts = path.split('/').filter(Boolean);
  try {
    if (!parts.length) return await homeScreen();
    const [name, a, b] = parts;
    if (name === 'lesson') return await lessonScreen(a, Number(b) || 0);
    if (name === 'words') return await wordsScreen(params);
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

async function boot() {
  await loadImages();
  autoplayVideos(app);
  app.append(h('div', { class: 'screen screen--bare empty' }, h('div', { html: mascotSVG('wave') }), h('div', { class: 'muted', text: 'Загружаю уроки…' })));
  await Promise.all([loadCourse(), initSpeech()]);
  await loadReadyTopics();
  window.addEventListener('hashchange', route);
  await route();
}

boot();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* офлайн-режим недоступен */ }));
}
