// Живой маскот: короткие анимации (img/moves/*.webp, прозрачный фон) и конфетти.
// Анимации подгружаются по мере надобности; если файла нет или сеть недоступна — остаётся обычная картинка.
import { h } from './ui.js';

// Длительность одного проигрывания, секунд. idle крутится по кругу, остальные замирают на последнем кадре.
const LEN = { idle: 0, wave: 3.2, cheer: 3, thumbs: 3, dance: 4.5, hero: 3.5, trophy: 3.7, grad: 4.5, flame: 4, comfort: 3.5, think: 4 };
const blobs = new Map();
const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function load(name) {
  if (!blobs.has(name)) {
    const p = fetch(`img/moves/${name}.webp`).then(r => (r.ok ? r.blob() : Promise.reject(new Error(r.status))));
    p.catch(() => blobs.delete(name));
    blobs.set(name, p);
  }
  return blobs.get(name);
}

// Заранее скачать анимации, которые скоро понадобятся.
export function preloadMoves(...names) {
  if (!calm()) names.forEach(n => load(n).catch(() => {}));
}

// Картинка с анимацией. Каждый раз новый адрес — так анимация всегда начинается с первого кадра.
async function moveImg(name) {
  const url = URL.createObjectURL(await load(name));
  const img = h('img', { class: 'move', alt: '', draggable: 'false' });
  await new Promise((ok, fail) => { img.onload = ok; img.onerror = fail; img.src = url; });
  setTimeout(() => URL.revokeObjectURL(url), 15000);
  return img;
}

// Заменяет маскота внутри host на анимацию. then — что показать после неё (например, 'idle').
export async function playMove(host, name, { then } = {}) {
  if (!host || calm() || !(name in LEN)) return;
  const token = (host._move = {});
  try {
    const img = await moveImg(name);
    if (host._move !== token || !host.isConnected) return;
    host.innerHTML = '';
    host.classList.add('move-host');
    host.append(img);
    if (then && LEN[name]) setTimeout(() => { if (host._move === token) playMove(host, then); }, LEN[name] * 1000);
  } catch { /* остаётся обычная картинка */ }
}

// ---------- Конфетти ----------
const COLORS = ['#D08A3A', '#3DBE5B', '#FF6B5B', '#3AA6F0', '#FFC83D', '#B57BEE'];

export function confetti({ count = 90, ms = 2600 } = {}) {
  if (calm()) return;
  const cv = h('canvas', { class: 'confetti', 'aria-hidden': 'true' });
  document.body.append(cv);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = window.innerWidth, H = window.innerHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext('2d');
  g.scale(dpr, dpr);
  const rnd = (a, b) => a + Math.random() * (b - a);
  // Два залпа из нижних углов навстречу друг другу.
  const bits = Array.from({ length: count }, (_, i) => {
    const left = i % 2 === 0;
    const ang = (left ? rnd(-80, -50) : rnd(-130, -100)) * Math.PI / 180;
    const v = rnd(0.55, 1.15) * Math.min(1100, H * 1.25);
    return {
      x: left ? -10 : W + 10, y: H * 0.8, vx: Math.cos(ang) * v * (W / 420 > 1 ? 1.25 : 1), vy: Math.sin(ang) * v,
      w: rnd(7, 12), hgt: rnd(5, 9), rot: rnd(0, 6.3), vr: rnd(-9, 9), tilt: rnd(0, 6.3),
      color: COLORS[i % COLORS.length], round: i % 5 === 0
    };
  });
  const t0 = performance.now();
  let last = t0;
  (function frame(now) {
    const dt = Math.min(0.04, (now - last) / 1000), age = now - t0;
    last = now;
    g.clearRect(0, 0, W, H);
    g.globalAlpha = Math.min(1, (ms - age) / 500);
    for (const b of bits) {
      b.vy += 1500 * dt; b.vx *= 1 - 1.1 * dt; b.vy *= 1 - 0.9 * dt;
      b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt; b.tilt += 7 * dt;
      g.save();
      g.translate(b.x, b.y); g.rotate(b.rot); g.scale(1, Math.cos(b.tilt));
      g.fillStyle = b.color;
      if (b.round) { g.beginPath(); g.arc(0, 0, b.hgt / 1.6, 0, 6.3); g.fill(); }
      else g.fillRect(-b.w / 2, -b.hgt / 2, b.w, b.hgt);
      g.restore();
    }
    if (age < ms && cv.isConnected) requestAnimationFrame(frame);
    else cv.remove();
  })(t0);
}

// ---------- Праздник поверх экрана: маскот выпрыгивает с подписью и конфетти ----------
let party = null;

export function closeParty() {
  if (!party) return;
  const el = party;
  party = null;
  el.classList.add('is-out');
  setTimeout(() => el.remove(), 260);
}

export async function celebrate(name, { text = '', count = 90 } = {}) {
  if (calm()) return;
  closeParty();
  confetti({ count });
  try {
    const img = await moveImg(name);
    const el = h('div', { class: 'party', 'aria-hidden': 'true' }, h('div', { class: 'party__m' }, img), text ? h('div', { class: 'party__t', text }) : null);
    party = el;
    document.body.append(el);
    setTimeout(() => { if (party === el) closeParty(); }, LEN[name] * 1000 - 200);
  } catch { /* без анимации останется конфетти */ }
}
