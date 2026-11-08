// Service worker: приложение и уроки работают без интернета.
// При изменении файлов увеличьте VERSION — старый кэш удалится.
const VERSION = 'brezel-v1';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/main.js', 'js/ui.js', 'js/store.js', 'js/srs.js', 'js/speech.js', 'js/content.js',
  'js/art.js', 'js/mascot.js', 'js/exercises.js', 'js/player.js', 'js/screens.js',
  'content/course.json', 'content/a1/01-hallo.json', 'audio/manifest.json',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Свои файлы: сначала сеть (свежие уроки), без сети или при долгом ответе — кэш.
// Аудио и шрифты: сначала кэш — они не меняются.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !isFont) return;
  const cacheFirst = isFont || url.pathname.includes('/audio/') && url.pathname.endsWith('.mp3');
  e.respondWith(caches.open(VERSION).then(async cache => {
    const cached = await cache.match(req, { ignoreSearch: sameOrigin });
    const fromNet = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    });
    if (cacheFirst && cached) return cached;
    if (!cached) return fromNet;
    const timeout = new Promise(r => setTimeout(() => r(cached), 3000));
    return Promise.race([fromNet.catch(() => cached), timeout]);
  }));
});

// Живая озвучка из audio/manifest.json тоже кэшируется при установке, чтобы работать офлайн.
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(async cache => {
    try {
      const map = await (await fetch('audio/manifest.json', { cache: 'no-cache' })).json();
      await cache.addAll([...new Set(Object.values(map))].map(f => `audio/${f}`));
    } catch { /* озвучки пока нет */ }
  }));
});
