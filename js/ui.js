// Мелкие помощники интерфейса: создание элементов, иконки, тосты, всплывающие подсказки.
import { tx } from './i18n.js';

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];

const P = 'fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"';
export const ICONS = {
  speaker: `<svg viewBox="0 0 24 24"><path d="M4 9h3l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.8 6a8.5 8.5 0 0 1 0 12" ${P}/></svg>`,
  turtle: `<svg viewBox="0 0 24 24"><path d="M4 15c0-4 3.5-7 8-7s8 3 8 7z" fill="currentColor" opacity=".25"/><path d="M4 15c0-4 3.5-7 8-7s8 3 8 7H4zM6 15l-1 3M18 15l1 3M20 14l2-1M12 8v7M8 10l2 5M16 10l-2 5" ${P}/></svg>`,
  close: `<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" ${P} stroke-width="3"/></svg>`,
  fire: `<svg viewBox="0 0 24 24"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3-1-6 1-9z" fill="currentColor"/><path d="M12 13c1 1.5 3 2.5 3 5a3 3 0 0 1-6 0c0-1.5 1-2.5 1.5-3 .2 1 .8 1.5 1.5 1.5 0-1.5-.5-2.5 0-3.5z" fill="#FFD27A"/></svg>`,
  star: `<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6L2.5 9.3l6.6-.8z" fill="#F2B544" stroke="#C98A1C" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
  path: `<svg viewBox="0 0 24 24"><path d="M5 20c0-3 3-4 7-4s7-1 7-4-3-4-7-4-5-1-5-3" ${P}/><circle cx="7" cy="5" r="2.2" fill="currentColor"/><circle cx="19" cy="12" r="2.2" fill="currentColor"/><circle cx="5" cy="20" r="2.2" fill="currentColor"/></svg>`,
  bulb: `<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" ${P}/></svg>`,
  target: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" ${P}/><circle cx="12" cy="12" r="4.5" ${P}/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>`,
  sprout: `<svg viewBox="0 0 24 24"><path d="M12 21v-9M12 12c0-4 3-6 7-6 0 4-3 6-7 6zM12 14c0-3-2.5-5-6-5 0 3 2.5 5 6 5z" ${P}/></svg>`,
  read: `<svg viewBox="0 0 24 24"><path d="M2.5 19L7.5 5h1.2l5 14M4.6 14h7" ${P}/><path d="M21.5 11.5V19M21.5 15a3.3 3.3 0 1 1-6.6 0 3.3 3.3 0 0 1 6.6 0z" ${P}/></svg>`,
  words: `<svg viewBox="0 0 24 24"><rect x="3" y="5" width="13" height="15" rx="3" ${P}/><path d="M8 3h10a3 3 0 0 1 3 3v11" ${P}/><path d="M7 10h5M7 14h3" ${P}/></svg>`,
  review: `<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4" ${P}/><path d="M12 8v4l3 2" ${P}/></svg>`,
  mistakes: `<svg viewBox="0 0 24 24"><path d="M5 4h11l3 3v13H5z" ${P}/><path d="M9 11l6 6M15 11l-6 6" ${P}/></svg>`,
  profile: `<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" ${P}/><path d="M4 21c0-4 4-6 8-6s8 2 8 6" ${P}/></svg>`,
  mic: `<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" ${P}/></svg>`,
  check: `<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" ${P} stroke-width="3.4"/></svg>`,
  lock: `<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="3" fill="currentColor"/><path d="M8 10V8a4 4 0 0 1 8 0v2" ${P} stroke-width="3"/></svg>`,
  play: `<svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
  trophy: `<svg viewBox="0 0 24 24"><path d="M7 4h10v5a5 5 0 0 1-10 0z" fill="currentColor"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v3M8 20h8M9 17h6" ${P}/></svg>`,
  book: `<svg viewBox="0 0 24 24"><path d="M12 6C9.5 4.5 6 4.5 3 5.5v13c3-1 6.5-1 9 .5 2.5-1.5 6-1.5 9-.5v-13c-3-1-6.5-1-9 .5z" fill="currentColor" opacity=".3"/><path d="M12 6C9.5 4.5 6 4.5 3 5.5v13c3-1 6.5-1 9 .5 2.5-1.5 6-1.5 9-.5v-13c-3-1-6.5-1-9 .5zM12 6v13" ${P}/></svg>`,
  grammar: `<svg viewBox="0 0 24 24"><path d="M4 19L9 5h1l5 14M6 14h7" ${P}/><path d="M16 9h5M18.5 6.5v5" ${P}/></svg>`,
  arrow: `<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" ${P} stroke-width="3"/></svg>`,
  info: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" ${P}/><path d="M12 11v6M12 7.5v.5" ${P} stroke-width="3"/></svg>`,
  boss: `<svg viewBox="0 0 24 24"><path d="M3 9l4 3 5-7 5 7 4-3-2 10H5z" fill="currentColor"/></svg>`,
  keyboard: `<svg viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="12" rx="3" ${P}/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" ${P}/></svg>`
};
export const icon = (name, cls = '') => {
  const s = ICONS[name] || '';
  return cls ? s.replace('<svg ', `<svg class="${cls}" `) : s;
};

let toastT;
export function toast(msg, ms = 2200) {
  document.querySelector('.toast')?.remove();
  const t = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(t);
  clearTimeout(toastT);
  toastT = setTimeout(() => t.remove(), ms);
}

// Всплывающая подсказка у элемента (перевод слова в истории).
export function popover(anchor, html) {
  document.querySelector('.pop')?.remove();
  const p = h('div', { class: 'pop', html });
  document.body.append(p);
  // z > 1, когда страница увеличена через CSS zoom (режим «Версия для ПК» на Android, см. index.html):
  // координаты экрана тогда в z раз больше, чем пиксели в стилях.
  const z = p.currentCSSZoom || 1;
  const r = anchor.getBoundingClientRect();
  const pw = p.offsetWidth * z, ph = p.offsetHeight * z, gap = 8 * z;
  const left = Math.min(Math.max(gap, r.left + r.width / 2 - pw / 2), window.innerWidth - pw - gap);
  let top = r.top - ph - gap;
  if (top < gap) top = r.bottom + gap;
  p.style.left = `${left / z}px`;
  p.style.top = `${top / z}px`;
  const close = e => { if (!p.contains(e.target) && e.target !== anchor) { p.remove(); document.removeEventListener('pointerdown', close, true); } };
  setTimeout(() => document.addEventListener('pointerdown', close, true), 0);
  setTimeout(() => p.remove(), 4000);
  return p;
}

export function soundBtn(onPlay, { big = false, slow = false, mini = false, label } = {}) {
  const cls = ['sound-btn', big && 'sound-btn--big', slow && 'sound-btn--slow', mini && 'sound-btn--mini'].filter(Boolean).join(' ');
  const b = h('button', { class: cls, type: 'button', 'aria-label': label || (slow ? tx('Медленно') : tx('Послушать')), html: icon(slow ? 'turtle' : 'speaker') });
  b.addEventListener('click', async e => {
    e.stopPropagation();
    b.classList.add('is-playing');
    try { await onPlay(); } finally { b.classList.remove('is-playing'); }
  });
  return b;
}

// Немецкое слово с артиклем, раскрашенным по роду.
export function deWord(w) {
  if (!w) return '';
  const a = w.art ? `<span class="art-${w.art}">${w.art}</span> ` : '';
  return `${a}${esc(w.de)}`;
}
export const deText = w => (w.art ? `${w.art} ${w.de}` : w.de);

// Переход по #адресу. Если адрес тот же (тренировка открыта поверх своего же экрана),
// браузер не сообщает о переходе — тогда запускаем перерисовку экрана сами.
export function go(hash) {
  const cur = location.hash || '#/';
  if (cur === hash) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = hash;
}
