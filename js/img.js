// Нарисованные картинки (img/…/*.webp) и анимации (img/anim/*.mp4).
// Список готовых файлов — в img/index.json (его пишет scripts/process-art.py).
// Если картинки нет, art.js рисует запасной SVG-вариант.
const IMG = { words: new Set(), avatars: new Set(), scenes: new Set(), mascot: new Set(), anim: new Set() };

export async function loadImages() {
  try {
    const r = await fetch('img/index.json', { cache: 'no-cache' });
    if (!r.ok) return;
    const d = await r.json();
    for (const k of Object.keys(IMG)) IMG[k] = new Set(d[k] || []);
  } catch { /* картинок пока нет — работаем на SVG */ }
}

export const hasImg = (group, key) => !!key && IMG[group].has(key);
export const imgSrc = (group, key) => `img/${group}/${encodeURIComponent(key)}.webp`;
export const hasAnim = key => !!key && IMG.anim.has(key);
export const animSrc = key => `img/anim/${encodeURIComponent(key)}.mp4`;

// Видео, вставленные через innerHTML, не всегда стартуют сами (особенно на iPhone) — запускаем явно.
export function autoplayVideos(root = document.body) {
  const play = v => { v.muted = true; v.play?.().catch(() => { /* браузер запретил — останется постер */ }); };
  root.querySelectorAll('video[autoplay]').forEach(play);
  new MutationObserver(list => {
    for (const m of list) {
      for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.matches('video[autoplay]')) play(n);
        n.querySelectorAll?.('video[autoplay]').forEach(play);
      }
    }
  }).observe(root, { childList: true, subtree: true });
}

// <img> или зацикленное видео без звука (на iPhone нужны muted + playsinline).
export function media(group, key, { anim = false, cls = '', lazy = true } = {}) {
  const src = imgSrc(group, key);
  const animKey = group === 'words' ? key : `${group}-${key}`;
  if (anim && hasAnim(animKey)) {
    return `<video class="${cls}" src="${animSrc(animKey)}" poster="${src}" muted loop playsinline autoplay preload="auto" disablepictureinpicture aria-hidden="true"></video>`;
  }
  return `<img class="${cls}" src="${src}" alt="" decoding="async"${lazy ? ' loading="lazy"' : ''}>`;
}
