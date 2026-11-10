// Видео-объяснения (как у Khan Academy, по-русски): карточка с постером и плеер поверх экрана.
// Используются в разделе «Чтение» и на первом экране урока.
import { h, icon } from './ui.js';
import { say } from './speech.js';

export function videoCard(v, title) {
  return h('button', { class: 'vcard', type: 'button', onclick: () => playVideo(v, title) },
    h('span', { class: 'vcard__poster' }, h('img', { src: v.poster, alt: '', loading: 'lazy' }), h('span', { class: 'vcard__play', html: icon('play') })),
    h('span', { class: 'vcard__main' },
      h('span', { class: 'vcard__k', text: 'Видео-объяснение' }),
      h('span', { class: 'vcard__t', text: title }),
      h('span', { class: 'vcard__s', text: `${v.len} · объясняет Брецель` })));
}

// Видео поверх экрана: вертикальное, со стандартными кнопками плеера.
export function playVideo(v, title) {
  say('');
  const vid = h('video', { src: v.src, poster: v.poster, controls: true, autoplay: true, playsinline: true, preload: 'auto' });
  const box = h('div', { class: 'vplayer', role: 'dialog', 'aria-label': `Видео: ${title}` },
    h('div', { class: 'vplayer__box' }, vid,
      h('button', { class: 'icon-btn vplayer__close', type: 'button', 'aria-label': 'Закрыть видео', html: icon('close') })));
  const close = () => { vid.pause(); box.remove(); window.removeEventListener('hashchange', close); };
  box.addEventListener('click', e => { if (e.target === box || e.target.closest('.vplayer__close')) close(); });
  window.addEventListener('hashchange', close);
  document.body.append(box);
}
