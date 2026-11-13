// Service worker: приложение и уроки работают без интернета.
// При изменении файлов увеличьте VERSION — старый кэш удалится.
const VERSION = 'brezel-v17';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/main.js', 'js/ui.js', 'js/store.js', 'js/srs.js', 'js/speech.js', 'js/content.js',
  'js/art.js', 'js/img.js', 'js/mascot.js', 'js/exercises.js', 'js/comic.js', 'js/intro.js', 'js/player.js', 'js/screens.js',
  'js/reading.js', 'js/readkit.js', 'js/mastery.js', 'js/placement.js', 'js/video.js', 'js/moves.js', 'js/i18n.js', 'js/config.js', 'js/sync.js', 'js/syncui.js', 'js/uz.js',
  'content/course.json', 'content/a1/01-hallo.json', 'content/a1/02-zahlen.json', 'content/reading.json', 'content/uz.json', 'audio/manifest.json', 'img/index.json',
  'img/splash.webp', 'icons/favicon.png', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'
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
  // Видео-объяснения большие и грузятся кусками (Range): их отдаёт сеть напрямую, без кэша.
  if (/\/video\/.+\.mp4$/.test(url.pathname)) return;
  const cacheFirst = isFont || /\/(audio|img)\/.+\.(mp3|webp|mp4)$/.test(url.pathname);
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
    // Картинки и анимации из img/index.json — тоже сразу, чтобы уроки работали без интернета.
    try {
      const idx = await (await fetch('img/index.json', { cache: 'no-cache' })).json();
      const files = [];
      for (const [group, keys] of Object.entries(idx)) {
        for (const k of keys) files.push(group === 'anim' ? `img/anim/${k}.mp4` : `img/${group}/${k}.webp`);
      }
      await Promise.all(files.map(f => cache.add(f).catch(() => {})));
    } catch { /* картинок пока нет */ }
  }));
});
