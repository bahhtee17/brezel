// Иллюстрации. Основные — нарисованные картинки из img/ (см. js/img.js).
// Ниже — запасная библиотека SVG: рисуется, если картинки ещё нет.
import { mascotSVG } from './mascot.js';
import { hasImg, media } from './img.js';

const INK = '#3B2614', SKIN = '#F6C9A0', BRAND = '#D08A3A', BRAND_D = '#9A5A1A', OK = '#3DBE5B', BAD = '#FF6B5B',
  SKY = '#3AA6F0', SKY_L = '#DDF0FD', CREAM = '#FFF7E8', BACK = '#FDEFD6', GOLD = '#F2B544', WHITE = '#FFFFFF';
const FONT = 'font-family="Nunito, Segoe UI, sans-serif" font-weight="900"';
let uid = 0;

const wrap = (inner, vb = '0 0 120 120', cls = '') => `<svg class="art ${cls}" viewBox="${vb}" aria-hidden="true">${inner}</svg>`;
const back = (c = BACK) => `<circle cx="60" cy="60" r="56" fill="${c}"/>`;
const st = (w = 3) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

// Рука с контуром: от плеча до кисти.
function arm(x1, y1, x2, y2, color, skin = SKIN, cls = '') {
  return `<g class="${cls}"><path d="M${x1},${y1} L${x2},${y2}" stroke="${INK}" stroke-width="13" stroke-linecap="round"/>
  <path d="M${x1},${y1} L${x2},${y2}" stroke="${color}" stroke-width="7.5" stroke-linecap="round"/>
  <circle cx="${x2}" cy="${y2}" r="6.5" fill="${skin}" ${st(2.6)}/></g>`;
}

// Человечек анфас в рамке 120×120.
export function person(o = {}) {
  const { skin = SKIN, hair = '#6B3E1E', style = 'short', shirt = SKY, mood = 'smile', arm: pose = 'down', tie = false, glasses = false } = o;
  let backHair = '', frontHair = '';
  if (style === 'long') {
    backHair = `<path d="M35,52 C32,28 47,21 60,21 C74,21 88,29 85,52 L89,86 C81,91 74,87 71,80 L49,80 C46,87 39,91 31,86 Z" fill="${hair}" ${st()}/>`;
    frontHair = `<path d="M37,48 C38,31 50,26 61,27 C73,28 83,35 83,48 C72,39 58,37 45,42 Z" fill="${hair}" ${st()}/>`;
  } else if (style === 'bun') {
    backHair = `<circle cx="60" cy="22" r="10" fill="${hair}" ${st()}/>`;
    frontHair = `<path d="M37,50 C35,32 47,26 60,26 C73,26 85,32 83,50 C78,40 70,36 60,36 C50,36 42,40 37,50 Z" fill="${hair}" ${st()}/>`;
  } else if (style === 'curly') {
    frontHair = `<g fill="${hair}" ${st(2.5)}><circle cx="42" cy="40" r="8"/><circle cx="52" cy="31" r="9"/><circle cx="65" cy="30" r="9"/><circle cx="77" cy="37" r="8"/><circle cx="81" cy="47" r="6"/><circle cx="39" cy="49" r="6"/></g>`;
  } else if (style === 'cap') {
    frontHair = `<path d="M36,44 C36,28 48,24 60,24 C72,24 84,28 84,44 Z" fill="${shirt === SKY ? BAD : SKY}" ${st()}/><path d="M60,44 L96,44 C96,48 92,50 84,50 L60,50 Z" fill="${shirt === SKY ? BAD : SKY}" ${st()}/>`;
  } else if (style === 'hat') {
    frontHair = `<ellipse cx="60" cy="34" rx="30" ry="6" fill="${INK}"/><path d="M44,34 C44,20 50,15 60,15 C70,15 76,20 76,34 Z" fill="${INK}"/><rect x="44" y="28" width="32" height="4" fill="${BAD}"/>`;
  } else if (style === 'short') {
    frontHair = `<path d="M37,49 C35,30 48,24 60,24 C73,24 86,31 83,49 C77,40 67,36 57,38 C49,40 42,44 37,49 Z" fill="${hair}" ${st()}/>`;
  }
  const eyes = glasses
    ? `<circle cx="51" cy="53" r="7" fill="${WHITE}" fill-opacity=".5" ${st(2.5)}/><circle cx="69" cy="53" r="7" fill="${WHITE}" fill-opacity=".5" ${st(2.5)}/><path d="M58,53 L62,53" ${st(2.5)}/><circle cx="51" cy="53" r="2.4" fill="${INK}"/><circle cx="69" cy="53" r="2.4" fill="${INK}"/>`
    : `<circle cx="51" cy="53" r="3" fill="${INK}"/><circle cx="69" cy="53" r="3" fill="${INK}"/>`;
  const mouths = {
    smile: `<path d="M53,62 Q60,68 67,62" fill="none" ${st(2.6)}/>`,
    big: `<path d="M52,61 Q60,73 68,61 Z" fill="#7A2E1A" ${st(2.4)}/>`,
    sad: `<path d="M53,66 Q60,60 67,66" fill="none" ${st(2.6)}/>`,
    flat: `<path d="M54,64 L66,64" ${st(2.6)}/>`,
    talk: `<ellipse class="a-talk" cx="60" cy="63" rx="4.5" ry="4" fill="#7A2E1A" ${st(2.2)}/>`,
    oops: `<path d="M53,64 Q57,61 60,64 Q63,67 67,63" fill="none" ${st(2.6)}/>`
  };
  const arms = {
    down: '',
    wave: arm(86, 92, 102, 60, shirt, skin, 'a-wave'),
    self: arm(88, 98, 66, 102, shirt, skin),
    out: arm(86, 94, 110, 86, shirt, skin),
    thumbs: `${arm(86, 96, 98, 76, shirt, skin)}<rect x="95" y="62" width="6" height="12" rx="3" fill="${skin}" ${st(2.4)}/>`,
    cheer: arm(86, 92, 104, 64, shirt, skin) + arm(34, 92, 16, 64, shirt, skin),
    head: arm(86, 94, 80, 40, shirt, skin),
    mic: `${arm(86, 96, 98, 80, shirt, skin)}<rect x="94" y="62" width="9" height="16" rx="4.5" fill="${INK}"/><circle cx="98.5" cy="62" r="7" fill="#9AA0A6" ${st(2.4)}/>`
  };
  return `${backHair}
  <path d="M27,124 C27,94 40,79 60,79 C80,79 93,94 93,124 Z" fill="${shirt}" ${st()}/>
  ${tie ? `<path d="M57,80 L63,80 L65,100 L60,106 L55,100 Z" fill="${BAD}" ${st(2.4)}/>` : ''}
  <circle cx="60" cy="51" r="23" fill="${skin}" ${st()}/>
  ${frontHair}
  <ellipse cx="45" cy="60" rx="4.2" ry="2.6" fill="#FF8E7C" opacity=".55"/><ellipse cx="75" cy="60" rx="4.2" ry="2.6" fill="#FF8E7C" opacity=".55"/>
  ${eyes}${mouths[mood] || mouths.smile}${arms[pose] || ''}`;
}

// Сквозные герои курса.
export const CHARS = {
  lena: { name: 'Лена', hair: '#E0703A', style: 'long', shirt: OK },
  tom: { name: 'Том', hair: '#6B3E1E', style: 'short', shirt: SKY },
  wagner: { name: 'Фрау Вагнер', hair: '#A8A39A', style: 'bun', glasses: true, shirt: '#8A6A4A' },
  marco: { name: 'Марко', hair: '#2B2018', style: 'curly', shirt: BRAND, skin: '#EDBB8F' },
  aigerim: { name: 'Айгерим', hair: '#2B2018', style: 'long', shirt: BAD, skin: '#F2C49B' },
  you: { name: 'Вы', hair: '#8A5A2B', style: 'short', shirt: GOLD },
  driver: { name: 'Таксист', hair: '#4A3424', style: 'cap', shirt: SKY },
  passenger: { name: 'Пассажир', hair: '#C9A06A', style: 'short', shirt: OK, glasses: true },
  man: { name: 'Тимур', hair: '#2B2018', style: 'short', shirt: OK, skin: '#EDBB8F' },
  woman: { name: 'Анна', hair: '#8A4A12', style: 'long', shirt: SKY },
  f: { name: 'Женщина', hair: '#8A4A12', style: 'long', shirt: SKY },
  m: { name: 'Мужчина', hair: '#5A3A22', style: 'short', shirt: '#8A6A4A' },
  becker: { name: 'Херр Беккер', hair: '#5A3A22', style: 'hat', shirt: '#8A6A4A', tie: true, glasses: true },
  brezel: { name: 'Брецель' }
};

export function charName(who) { return (CHARS[who] && CHARS[who].name) || who; }

export function avatar(who, mood = 'smile') {
  if (hasImg('avatars', who)) return `<div class="avatar avatar--img">${media('avatars', who)}</div>`;
  if (who === 'brezel' && hasImg('mascot', 'idle')) return `<div class="avatar avatar--img avatar--mascot">${media('mascot', 'idle')}</div>`;
  if (who === 'brezel') return `<div class="avatar">${mascotSVG('idle').replace('viewBox="0 0 200 210"', 'viewBox="10 20 180 190"')}</div>`;
  const c = CHARS[who] || CHARS.man;
  return `<div class="avatar">${wrap(`<rect x="0" y="0" width="120" height="120" fill="${who === 'you' ? '#FFF1CC' : SKY_L}"/>${person({ ...c, mood })}`, '22 16 76 76')}</div>`;
}

function charAt(who, x, y, s = 1, extra = {}) {
  const c = CHARS[who] || CHARS.man;
  return `<g transform="translate(${x} ${y}) scale(${s})">${person({ ...c, ...extra })}</g>`;
}

// ---------- Мелкие элементы ----------
function qBadge(x = 90, y = 28, c = BAD) {
  return `<circle cx="${x}" cy="${y}" r="17" fill="${c}" ${st()}/><text x="${x}" y="${y + 9}" text-anchor="middle" font-size="26" fill="#fff" ${FONT}>?</text>`;
}
function sunRays(cx, cy, r1, r2, n = 8, color = GOLD) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n;
    s += `<path d="M${(cx + Math.cos(a) * r1).toFixed(1)},${(cy + Math.sin(a) * r1).toFixed(1)} L${(cx + Math.cos(a) * r2).toFixed(1)},${(cy + Math.sin(a) * r2).toFixed(1)}" stroke="${color}" stroke-width="6" stroke-linecap="round"/>`;
  }
  return s;
}
function face(cx, cy, r, mouth, color = GOLD) {
  const m = {
    smile: `<path d="M${cx - 12},${cy + 6} Q${cx},${cy + 18} ${cx + 12},${cy + 6}" fill="none" ${st(3.5)}/>`,
    flat: `<path d="M${cx - 11},${cy + 10} Q${cx - 4},${cy + 6} ${cx},${cy + 10} Q${cx + 5},${cy + 14} ${cx + 11},${cy + 9}" fill="none" ${st(3.5)}/>`,
    sad: `<path d="M${cx - 12},${cy + 14} Q${cx},${cy + 4} ${cx + 12},${cy + 14}" fill="none" ${st(3.5)}/>`
  }[mouth];
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" ${st()}/><circle cx="${cx - 9}" cy="${cy - 6}" r="3.6" fill="${INK}"/><circle cx="${cx + 9}" cy="${cy - 6}" r="3.6" fill="${INK}"/>${m}`;
}
function heart(x, y, s, color = BAD, cls = '') {
  return `<g class="${cls}" transform="translate(${x} ${y}) scale(${s})"><path d="M0,10 C-12,-2 -26,6 -20,20 C-16,30 -4,36 0,42 C4,36 16,30 20,20 C26,6 12,-2 0,10 Z" fill="${color}" ${st(3 / s)}/></g>`;
}
function speech(x, y, w, h, text, size = 22, fill = WHITE, color = INK) {
  return `<path d="M${x + 10},${y} H${x + w - 10} Q${x + w},${y} ${x + w},${y + 10} V${y + h - 10} Q${x + w},${y + h} ${x + w - 10},${y + h} H${x + 26} L${x + 12},${y + h + 12} L${x + 16},${y + h} H${x + 10} Q${x},${y + h} ${x},${y + h - 10} V${y + 10} Q${x},${y} ${x + 10},${y} Z" fill="${fill}" ${st()}/>
  <text x="${x + w / 2}" y="${y + h / 2 + size * 0.36}" text-anchor="middle" font-size="${size}" fill="${color}" ${FONT}>${text}</text>`;
}
function badge(name, hl) {
  // hl: '' | 'first' | 'last'
  const first = 'Lena', last = 'Schulz';
  return `<rect x="16" y="26" width="88" height="70" rx="10" fill="${WHITE}" ${st()}/>
  <path d="M16,36 Q16,26 26,26 H94 Q104,26 104,36 V48 H16 Z" fill="${BAD}" ${st()}/>
  <text x="60" y="44" text-anchor="middle" font-size="15" fill="#fff" ${FONT}>HALLO</text>
  ${hl === 'first' ? `<rect x="22" y="58" width="46" height="24" rx="6" fill="#FFE09A"/>` : ''}
  ${hl === 'last' ? `<rect x="58" y="58" width="44" height="24" rx="6" fill="#FFE09A"/>` : ''}
  <text x="${name ? 60 : 60}" y="77" text-anchor="middle" font-size="${hl ? 16 : 19}" fill="${INK}" ${FONT}>${hl ? `${first} ${last}` : name}</text>`;
}

// ---------- Флаги ----------
const FLAGS = {
  de: (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h / 3}" fill="#1A1A1A"/><rect x="${x}" y="${y + h / 3}" width="${w}" height="${h / 3}" fill="#DD0000"/><rect x="${x}" y="${y + (2 * h) / 3}" width="${w}" height="${h / 3}" fill="#FFCE00"/>`,
  at: (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#C8102E"/><rect x="${x}" y="${y + h / 3}" width="${w}" height="${h / 3}" fill="#fff"/>`,
  ch: (x, y, w, h) => { const cx = x + w / 2, cy = y + h / 2, a = h * 0.18, b = h * 0.6; return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#DA291C"/><rect x="${cx - a / 2}" y="${cy - b / 2}" width="${a}" height="${b}" fill="#fff"/><rect x="${cx - b / 2}" y="${cy - a / 2}" width="${b}" height="${a}" fill="#fff"/>`; },
  ru: (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h / 3}" fill="#fff"/><rect x="${x}" y="${y + h / 3}" width="${w}" height="${h / 3}" fill="#0039A6"/><rect x="${x}" y="${y + (2 * h) / 3}" width="${w}" height="${h / 3}" fill="#D52B1E"/>`,
  it: (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w / 3}" height="${h}" fill="#009246"/><rect x="${x + w / 3}" y="${y}" width="${w / 3}" height="${h}" fill="#fff"/><rect x="${x + (2 * w) / 3}" y="${y}" width="${w / 3}" height="${h}" fill="#CE2B37"/>`,
  kz: (x, y, w, h) => { const cx = x + w / 2, cy = y + h * 0.45; return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#00AFCA"/>${sunRays(cx, cy, h * 0.2, h * 0.3, 16, '#FEC50C').replace(/stroke-width="6"/g, 'stroke-width="2.4"')}<circle cx="${cx}" cy="${cy}" r="${h * 0.16}" fill="#FEC50C"/><path d="M${cx - h * 0.28},${cy + h * 0.3} Q${cx},${cy + h * 0.18} ${cx + h * 0.28},${cy + h * 0.3}" stroke="#FEC50C" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="${x + w * 0.06}" y="${y}" width="${w * 0.05}" height="${h}" fill="#FEC50C" opacity=".85"/>`; },
  uz: (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h / 3}" fill="#0099B5"/><rect x="${x}" y="${y + h / 3}" width="${w}" height="${h / 3}" fill="#fff"/><rect x="${x}" y="${y + (2 * h) / 3}" width="${w}" height="${h / 3}" fill="#1EB53A"/><rect x="${x}" y="${y + h / 3 - 1.5}" width="${w}" height="3" fill="#CE1126"/><rect x="${x}" y="${y + (2 * h) / 3 - 1.5}" width="${w}" height="3" fill="#CE1126"/><circle cx="${x + w * 0.16}" cy="${y + h * 0.17}" r="${h * 0.11}" fill="#fff"/><circle cx="${x + w * 0.19}" cy="${y + h * 0.15}" r="${h * 0.1}" fill="#0099B5"/><circle cx="${x + w * 0.32}" cy="${y + h * 0.1}" r="1.8" fill="#fff"/><circle cx="${x + w * 0.4}" cy="${y + h * 0.1}" r="1.8" fill="#fff"/><circle cx="${x + w * 0.36}" cy="${y + h * 0.22}" r="1.8" fill="#fff"/>`
};
function flag(code, x = 12, y = 30, w = 96, h = 64) {
  const id = `fc${++uid}`;
  const draw = FLAGS[code] || FLAGS.de;
  return `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10"/></clipPath>
  <g clip-path="url(#${id})">${draw(x, y, w, h)}<rect x="${x}" y="${y}" width="${w}" height="${h * 0.16}" fill="#fff" opacity=".18"/></g>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="none" ${st()}/>`;
}

// ---------- Иллюстрации слов ----------
const ART = {
  wave: () => back(SKY_L) + person({ ...CHARS.lena, arm: 'wave', mood: 'big' }),
  bye: () => back(SKY_L) + `<g class="a-slide">${person({ ...CHARS.tom, arm: 'wave', mood: 'big' })}</g><path d="M8,70 h12 M4,82 h14 M10,94 h10" ${st(3.5)} opacity=".5"/>`,
  byeformal: () => back(SKY_L) + person({ ...CHARS.becker, arm: 'wave', mood: 'smile' }),
  morning: () => back(SKY_L) + `<g class="a-rise">${sunRays(60, 74, 26, 36, 9)}<circle cx="60" cy="74" r="20" fill="${GOLD}" ${st()}/></g><path d="M8,84 Q30,70 60,80 Q90,90 112,78 Q108,100 92,108 Q60,124 28,108 Q12,98 8,84 Z" fill="${OK}" ${st()}/>`,
  day: () => back(SKY_L) + `<g class="a-spin" style="transform-origin:60px 54px">${sunRays(60, 54, 30, 42, 10)}</g><circle cx="60" cy="54" r="24" fill="${GOLD}" ${st()}/><path d="M66,90 a10,10 0 0 1 18,-6 a12,12 0 0 1 22,6 a8,8 0 0 1 -2,14 h-36 a8,8 0 0 1 -2,-14 z" fill="#fff" ${st()}/>`,
  evening: () => back('#FFD9B8') + `<circle cx="60" cy="80" r="24" fill="${BAD}" ${st()}/><path d="M4,82 L116,82 L116,116 L4,116 Z" fill="${BRAND_D}"/><path d="M4,82 L116,82" ${st()}/><path class="a-twinkle" d="M90,30 l3,7 7,3 -7,3 -3,7 -3,-7 -7,-3 7,-3 z" fill="#fff" ${st(2)}/>`,
  night: () => `<circle cx="60" cy="60" r="56" fill="#33407A"/><path d="M70,28 a30,30 0 1 0 22,48 a24,24 0 1 1 -22,-48 z" fill="#FFE7A8" ${st()}/><path class="a-twinkle" d="M30,34 l2.5,6 6,2.5 -6,2.5 -2.5,6 -2.5,-6 -6,-2.5 6,-2.5 z" fill="#fff"/><path class="a-twinkle2" d="M38,80 l2,5 5,2 -5,2 -2,5 -2,-5 -5,-2 5,-2 z" fill="#fff"/><circle class="a-twinkle2" cx="96" cy="30" r="2.5" fill="#fff"/>`,
  handshake: () => back() + `<g class="a-shake"><path d="M2,58 L40,52 L46,78 L6,84 Z" fill="${SKY}" ${st()}/><path d="M118,58 L80,52 L74,78 L114,84 Z" fill="${BAD}" ${st()}/><path d="M40,54 C50,48 62,50 70,56 L82,54 C86,62 84,74 78,78 C68,84 54,84 46,78 Z" fill="${SKIN}" ${st()}/><path d="M56,62 L70,72 M52,68 L64,78" ${st(2.5)}/></g>${heart(60, 18, 0.55, BAD, 'a-pulse')}`,
  me: () => back(SKY_L) + person({ ...CHARS.you, arm: 'self', mood: 'big' }),
  you: () => back(SKY_L) + person({ ...CHARS.marco, arm: 'out', mood: 'smile' }),
  youFormal: () => back(SKY_L) + person({ ...CHARS.becker, mood: 'smile' }),
  he: () => back(SKY_L) + person({ ...CHARS.tom, mood: 'smile' }) + `<path d="M8,30 L24,40 M24,40 L22,30 M24,40 L14,42" ${st(3.5)}/>`,
  she: () => back(SKY_L) + person({ ...CHARS.aigerim, mood: 'smile' }) + `<path d="M8,30 L24,40 M24,40 L22,30 M24,40 L14,42" ${st(3.5)}/>`,
  we: () => back(SKY_L) + `<g transform="translate(-22 14) scale(.82)">${person({ ...CHARS.lena, arm: 'self', mood: 'big' })}</g><g transform="translate(40 14) scale(.82)">${person({ ...CHARS.tom, mood: 'big' })}</g>`,
  youpl: () => back(SKY_L) + `<g transform="translate(-14 24) scale(.75)">${person({ ...CHARS.marco })}</g><g transform="translate(44 24) scale(.75)">${person({ ...CHARS.aigerim })}</g><path d="M60,6 L60,26 M52,18 L60,26 L68,18" ${st(4)}/>`,
  mister: () => back(SKY_L) + person({ ...CHARS.becker, mood: 'smile' }),
  woman: () => back(SKY_L) + person({ ...CHARS.woman, mood: 'smile' }),
  teacher: () => back(SKY_L) + `<rect x="8" y="14" width="104" height="54" rx="6" fill="#2F5D50" ${st()}/><text x="60" y="48" text-anchor="middle" font-size="22" fill="#fff" ${FONT}>ABC</text><g transform="translate(18 30) scale(.75)">${person({ ...CHARS.wagner, arm: 'head', mood: 'smile' })}</g>`,
  friend: () => back(SKY_L) + `<g transform="translate(-20 18) scale(.8)">${person({ ...CHARS.marco, mood: 'big' })}</g><g transform="translate(42 18) scale(.8)">${person({ ...CHARS.aigerim, mood: 'big' })}</g>${heart(60, 8, 0.5, BAD, 'a-pulse')}`,
  nametag: () => back() + badge('Lena', ''),
  nametagFirst: () => back() + badge('', 'first'),
  nametagLast: () => back() + badge('', 'last'),
  iam: () => back(SKY_L) + `<g transform="translate(-16 10) scale(.86)">${person({ ...CHARS.you, arm: 'self', mood: 'big' })}</g><rect x="78" y="44" width="30" height="8" rx="4" fill="${BRAND}" ${st(2.5)}/><rect x="78" y="60" width="30" height="8" rx="4" fill="${BRAND}" ${st(2.5)}/>`,
  this: () => back() + `<rect x="40" y="16" width="70" height="80" rx="8" fill="${WHITE}" ${st()}/><g transform="translate(45 20) scale(.5)">${person({ ...CHARS.lena })}</g><rect x="40" y="16" width="70" height="80" rx="8" fill="none" ${st()}/><path d="M6,70 L30,62 M30,62 C34,60 36,66 32,68 L22,72" fill="${SKIN}" ${st(3.5)}/><circle cx="34" cy="62" r="7" fill="${SKIN}" ${st(2.6)}/>`,
  // Вопросительные слова
  qhow: () => back() + `<g class="a-spin" style="transform-origin:52px 66px"><circle cx="52" cy="66" r="22" fill="${SKY}" ${st()}/>${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<rect x="48" y="36" width="8" height="12" rx="2" fill="${SKY}" ${st(2.5)} transform="rotate(${a} 52 66)"/>`).join('')}<circle cx="52" cy="66" r="8" fill="${WHITE}" ${st()}/></g>${qBadge()}`,
  qfeel: () => back() + face(52, 66, 28, 'smile') + qBadge(),
  qfrom: () => back() + `<circle cx="50" cy="68" r="28" fill="${SKY}" ${st()}/><path d="M34,56 q8,-8 16,0 q4,8 -4,12 q-8,2 -12,-12z M56,76 q8,-4 14,4 q-2,10 -12,8z" fill="${OK}" ${st(2.5)}/><path d="M70,48 L96,22 M84,22 L96,22 L96,34" ${st(4.5)} stroke="${BAD}"/>${''}`,
  qwhere: () => back() + `<path d="M50,104 C30,78 24,66 24,54 a26,26 0 0 1 52,0 c0,12 -6,24 -26,50z" fill="${BAD}" ${st()}/><circle cx="50" cy="54" r="10" fill="${WHITE}" ${st()}/>${qBadge(92, 28, SKY)}`,
  qwho: () => back() + `<circle cx="50" cy="50" r="18" fill="#C8B6A0" ${st()}/><path d="M18,108 C18,82 32,72 50,72 C68,72 82,82 82,108 Z" fill="#C8B6A0" ${st()}/>${qBadge()}`,
  qwhat: () => back() + `<rect x="22" y="56" width="58" height="44" rx="4" fill="${BRAND}" ${st()}/><rect x="16" y="44" width="70" height="16" rx="4" fill="${GOLD}" ${st()}/><rect x="46" y="44" width="10" height="56" fill="${BAD}" ${st(2.5)}/>${qBadge()}`,
  qyou: () => back(SKY_L) + `<g transform="translate(-8 8) scale(.9)">${person({ ...CHARS.marco, arm: 'out' })}</g>${qBadge(96, 26)}`,
  qyouFormal: () => back(SKY_L) + `<g transform="translate(-8 8) scale(.9)">${person({ ...CHARS.becker })}</g>${qBadge(96, 26)}`,
  // Как дела
  thumbsup: () => back() + `<g class="a-thumb"><rect x="34" y="54" width="44" height="46" rx="12" fill="${SKIN}" ${st()}/><path d="M48,56 L52,24 C53,16 64,16 64,26 L62,54" fill="${SKIN}" ${st()}/><path d="M34,68 h18 M34,80 h18 M36,92 h16" ${st(2.5)}/><rect x="74" y="56" width="20" height="46" rx="4" fill="${SKY}" ${st()}/></g>`,
  star: () => back() + `<path class="a-pulse" d="M60,14 L72,44 L104,46 L79,66 L88,98 L60,80 L32,98 L41,66 L16,46 L48,44 Z" fill="${GOLD}" ${st()}/><path class="a-twinkle" d="M100,14 l2,6 6,2 -6,2 -2,6 -2,-6 -6,-2 6,-2z" fill="${BRAND}"/><path class="a-twinkle2" d="M18,92 l2,5 5,2 -5,2 -2,5 -2,-5 -5,-2 5,-2z" fill="${BRAND}"/>`,
  meh: () => back() + face(60, 60, 32, 'flat'),
  sad: () => back() + face(60, 68, 30, 'sad') + `<path d="M76,26 a10,10 0 0 1 18,-4 a10,10 0 0 1 16,8 a7,7 0 0 1 -4,12 h-28 a8,8 0 0 1 -2,-16z" fill="#C9D3DE" ${st(2.5)}/><path class="a-twinkle" d="M84,48 l-3,8 M96,48 l-3,8" stroke="${SKY}" stroke-width="3.5" stroke-linecap="round"/>`,
  heart: () => back() + heart(60, 26, 1.7, BAD, 'a-pulse'),
  heart2: () => back() + heart(60, 30, 1.4, BAD, 'a-pulse') + heart(22, 20, 0.5, BAD, 'a-twinkle') + heart(98, 74, 0.55, BAD, 'a-twinkle2'),
  please: () => back() + `<path d="M14,92 C30,96 48,94 62,88 L96,74 C104,70 100,60 92,62 L70,68" fill="${SKIN}" ${st()}/><path d="M14,92 L14,72 C30,66 44,66 56,70 L70,68" fill="${SKIN}" ${st()}/><g class="a-bob"><path d="M46,36 h30 l-3,26 h-24 z" fill="${WHITE}" ${st()}/><path d="M76,42 q10,0 8,10 q-2,6 -10,4" fill="none" ${st()}/><path d="M54,30 q-4,-6 0,-12 M64,30 q-4,-6 0,-12" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".5"/></g>`,
  sorry: () => back(SKY_L) + person({ ...CHARS.tom, arm: 'head', mood: 'oops' }) + `<path d="M88,36 q4,8 0,12 q-4,-4 0,-12z" fill="${SKY}" ${st(2)}/>`,
  yes: () => back() + `<circle cx="60" cy="60" r="38" fill="${OK}" ${st()}/><path d="M42,62 L54,74 L80,46" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`,
  no: () => back() + `<circle cx="60" cy="60" r="38" fill="${BAD}" ${st()}/><path d="M46,46 L74,74 M74,46 L46,74" stroke="#fff" stroke-width="10" stroke-linecap="round"/>`,
  right: () => back() + `<rect x="26" y="16" width="62" height="84" rx="6" fill="${WHITE}" ${st()}/><path d="M36,34 h40 M36,46 h30" ${st(3)} opacity=".35"/><circle cx="80" cy="82" r="20" fill="${OK}" ${st()}/><path d="M70,82 L77,89 L90,75" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
  wrong: () => back() + `<rect x="26" y="16" width="62" height="84" rx="6" fill="${WHITE}" ${st()}/><path d="M36,34 h40 M36,46 h30" ${st(3)} opacity=".35"/><circle cx="80" cy="82" r="20" fill="${BAD}" ${st()}/><path d="M72,74 L88,90 M88,74 L72,90" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`,
  ear: () => back() + `<path d="M40,28 C62,10 92,24 88,52 C86,66 74,70 72,82 C70,98 54,104 46,94" fill="${SKIN}" ${st()}/><path d="M54,44 C60,34 76,38 74,50 C72,58 64,58 64,66" fill="none" ${st()}/>${qBadge(30, 74, SKY)}`,
  snail: () => back() + `<g class="a-slide"><path d="M14,92 C14,84 22,82 30,82 L84,82 C92,82 100,86 102,92 Z" fill="#F2C6A0" ${st()}/><circle cx="58" cy="62" r="24" fill="${BRAND}" ${st()}/><path d="M58,62 m0,-14 a14,14 0 1 1 -14,14 a9,9 0 1 1 9,-9 a4,4 0 1 1 -4,4" fill="none" ${st(3)}/><path d="M24,82 L18,62 M30,82 L28,62" ${st(3)}/><circle cx="18" cy="60" r="3" fill="${INK}"/><circle cx="28" cy="60" r="3" fill="${INK}"/></g>`,
  again: () => back() + `<g class="a-spin" style="transform-origin:60px 60px"><path d="M60,26 a34,34 0 0 1 32,46" fill="none" stroke="${SKY}" stroke-width="10" stroke-linecap="round"/><path d="M60,94 a34,34 0 0 1 -32,-46" fill="none" stroke="${BRAND}" stroke-width="10" stroke-linecap="round"/><path d="M96,58 L92,76 L78,66 Z" fill="${SKY}" ${st(2.5)}/><path d="M24,62 L28,44 L42,54 Z" fill="${BRAND}" ${st(2.5)}/></g>`,
  noproblem: () => back() + face(46, 70, 28, 'smile') + speech(62, 12, 50, 34, 'OK', 20, OK, '#fff'),
  walk: () => back(SKY_L) + `<g class="a-walk"><rect class="a-leg1" x="50" y="76" width="9" height="28" rx="4.5" fill="${INK}"/><rect class="a-leg2" x="61" y="76" width="9" height="28" rx="4.5" fill="#5A3A22"/><rect x="42" y="44" width="36" height="38" rx="14" fill="${GOLD}" ${st()}/><circle cx="62" cy="30" r="15" fill="${SKIN}" ${st()}/><path d="M48,26 C50,14 64,12 72,18 C74,22 76,26 76,30 C70,24 60,22 48,26 Z" fill="#8A5A2B" ${st(2.5)}/><circle cx="68" cy="30" r="2.4" fill="${INK}"/><rect x="80" y="60" width="22" height="26" rx="4" fill="${BAD}" ${st()}/><path d="M86,60 v-6 h10 v6" fill="none" ${st()}/></g><path d="M8,52 h16 M4,64 h18 M10,76 h12" ${st(3.5)} opacity=".45"/>`,
  house: () => back(SKY_L) + `<circle class="a-smoke" cx="82" cy="18" r="6" fill="#fff" ${st(2)}/><circle class="a-smoke2" cx="82" cy="18" r="6" fill="#fff" ${st(2)}/><rect x="76" y="24" width="12" height="20" fill="${BRAND_D}" ${st()}/><path d="M16,58 L60,22 L104,58 Z" fill="${BAD}" ${st()}/><rect x="26" y="56" width="68" height="48" fill="${CREAM}" ${st()}/><rect x="52" y="74" width="18" height="30" rx="2" fill="${BRAND}" ${st()}/><rect x="32" y="66" width="14" height="14" fill="${SKY_L}" ${st(2.5)}/><rect x="76" y="66" width="14" height="14" fill="${SKY_L}" ${st(2.5)}/>`,
  homepin: () => back(SKY_L) + `<path d="M16,64 L52,36 L88,64 Z" fill="${BAD}" ${st()}/><rect x="24" y="62" width="56" height="40" fill="${CREAM}" ${st()}/><rect x="44" y="76" width="16" height="26" fill="${BRAND}" ${st()}/><g class="a-bob"><path d="M92,60 C80,44 76,38 76,30 a16,16 0 0 1 32,0 c0,8 -4,14 -16,30z" fill="${SKY}" ${st()}/><circle cx="92" cy="30" r="6" fill="#fff" ${st(2.5)}/></g>`,
  globe: () => back() + `<g class="a-bob"><circle cx="60" cy="58" r="38" fill="${SKY}" ${st()}/><path d="M34,38 q12,-10 24,0 q6,12 -6,18 q-12,4 -18,-18z M64,66 q14,-6 22,6 q-2,16 -18,12z M76,32 q8,-2 10,6 q-6,4 -10,-6z" fill="${OK}" ${st(2.5)}/><path d="M22,58 h76 M60,20 c-16,20 -16,56 0,76 c16,-20 16,-56 0,-76" fill="none" stroke="${INK}" stroke-width="2" opacity=".25"/></g><rect x="40" y="98" width="40" height="8" rx="4" fill="${BRAND}" ${st(2.5)}/>`,
  city: () => back(SKY_L) + `<rect x="14" y="54" width="24" height="52" fill="${GOLD}" ${st()}/><rect x="38" y="30" width="26" height="76" fill="${BRAND}" ${st()}/><rect x="64" y="46" width="22" height="60" fill="${SKY}" ${st()}/><rect x="86" y="62" width="20" height="44" fill="${BAD}" ${st()}/>${[[20, 62], [28, 62], [20, 76], [28, 76], [44, 40], [54, 40], [44, 54], [54, 54], [44, 68], [54, 68], [70, 54], [78, 54], [70, 68], [78, 68], [92, 70], [92, 84]].map(([x, y]) => `<rect x="${x}" y="${y}" width="5" height="7" fill="#fff" opacity=".85"/>`).join('')}<path d="M8,106 h104" ${st()}/>`,
  berlin: () => back(SKY_L) + `<rect x="56" y="18" width="8" height="88" fill="#C9CED6" ${st()}/><circle cx="60" cy="44" r="13" fill="#C9CED6" ${st()}/><path d="M48,44 h24" ${st(2.5)}/><rect x="58" y="6" width="4" height="12" fill="${BAD}" ${st(2)}/><rect x="12" y="76" width="22" height="30" fill="${GOLD}" ${st()}/><rect x="30" y="66" width="18" height="40" fill="${BRAND}" ${st()}/><rect x="74" y="70" width="20" height="36" fill="${SKY}" ${st()}/><rect x="92" y="80" width="18" height="26" fill="${BAD}" ${st()}/><path d="M8,106 h104" ${st()}/>`,
  hamburg: () => back(SKY_L) + `<path d="M92,26 L92,70 M92,30 L70,30 L70,40" ${st(4)} stroke="${BAD}"/><g class="a-bob"><path d="M20,74 L100,74 L90,92 L28,92 Z" fill="${BAD}" ${st()}/><rect x="36" y="56" width="40" height="18" fill="${WHITE}" ${st()}/><rect x="56" y="40" width="10" height="16" fill="${INK}"/><circle cx="46" cy="65" r="3" fill="${SKY}"/><circle cx="58" cy="65" r="3" fill="${SKY}"/><circle cx="70" cy="65" r="3" fill="${SKY}"/></g><path d="M6,98 q10,-6 20,0 t20,0 t20,0 t20,0 t20,0 t20,0 V116 H6Z" fill="${SKY}" ${st()}/>`,
  muenchen: () => back(SKY_L) + `<rect x="30" y="44" width="22" height="62" fill="#C0583B" ${st()}/><rect x="68" y="44" width="22" height="62" fill="#C0583B" ${st()}/><path d="M28,46 C28,28 54,28 54,46 Z" fill="${OK}" ${st()}/><path d="M66,46 C66,28 92,28 92,46 Z" fill="${OK}" ${st()}/><circle cx="41" cy="26" r="4" fill="${GOLD}" ${st(2)}/><circle cx="79" cy="26" r="4" fill="${GOLD}" ${st(2)}/><rect x="52" y="70" width="16" height="36" fill="#D9785A" ${st()}/><rect x="36" y="58" width="10" height="14" rx="5" fill="${INK}" opacity=".6"/><rect x="74" y="58" width="10" height="14" rx="5" fill="${INK}" opacity=".6"/><path d="M8,106 h104" ${st()}/>`,
  wien: () => back(SKY_L) + `<path d="M60,58 L36,106 M60,58 L84,106" ${st(4)}/><g class="a-spin" style="transform-origin:60px 58px"><circle cx="60" cy="58" r="40" fill="none" stroke="${BAD}" stroke-width="5"/>${[0, 45, 90, 135].map(a => `<path d="M20,58 L100,58" stroke="${INK}" stroke-width="2.5" transform="rotate(${a} 60 58)"/>`).join('')}${[0, 60, 120, 180, 240, 300].map(a => { const r = (a * Math.PI) / 180; return `<rect x="${(60 + Math.cos(r) * 40 - 6).toFixed(1)}" y="${(58 + Math.sin(r) * 40 - 5).toFixed(1)}" width="12" height="10" rx="3" fill="${GOLD}" ${st(2.2)}/>`; }).join('')}</g><circle cx="60" cy="58" r="6" fill="${GOLD}" ${st()}/>`,
  clock: () => back() + `<circle cx="60" cy="60" r="40" fill="${WHITE}" ${st()}/>${[0, 90, 180, 270].map(a => `<rect x="58" y="24" width="4" height="8" fill="${INK}" transform="rotate(${a} 60 60)"/>`).join('')}<path d="M60,60 L60,40" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><g class="a-spin" style="transform-origin:60px 60px"><path d="M60,60 L84,60" stroke="${BAD}" stroke-width="4" stroke-linecap="round"/></g><circle cx="60" cy="60" r="5" fill="${INK}"/>`,
  book: () => back() + `<path d="M60,34 C48,26 26,26 14,32 L14,96 C26,90 48,90 60,98 Z" fill="${WHITE}" ${st()}/><path d="M60,34 C72,26 94,26 106,32 L106,96 C94,90 72,90 60,98 Z" fill="${WHITE}" ${st()}/><text x="37" y="70" text-anchor="middle" font-size="18" fill="${BAD}" ${FONT}>A</text><text x="83" y="70" text-anchor="middle" font-size="18" fill="${SKY}" ${FONT}>Ä</text><path class="a-twinkle" d="M96,12 l2,6 6,2 -6,2 -2,6 -2,-6 -6,-2 6,-2z" fill="${GOLD}"/>`,
  talk: () => back(SKY_L) + `<path d="M24,108 C24,80 34,70 50,70 L50,62 C36,60 28,48 30,36 C32,20 46,12 60,14 C76,16 84,30 82,44 L88,54 L82,56 L82,64 C82,70 76,72 70,70 L70,108 Z" fill="${SKIN}" ${st()}/><path d="M30,36 C32,20 46,12 60,14 C72,16 80,24 82,34 C70,30 52,32 40,40 Z" fill="#6B3E1E" ${st(2.5)}/><circle cx="70" cy="40" r="3" fill="${INK}"/><ellipse class="a-talk" cx="78" cy="58" rx="4" ry="4" fill="#7A2E1A" ${st(2)}/><path class="a-twinkle" d="M92,48 q6,8 0,16" fill="none" stroke="${SKY}" stroke-width="4" stroke-linecap="round"/><path class="a-twinkle2" d="M100,42 q10,14 0,28" fill="none" stroke="${SKY}" stroke-width="4" stroke-linecap="round"/>`,
  language: () => back() + speech(8, 14, 62, 40, 'Aa', 24, SKY, '#fff') + speech(50, 58, 62, 40, 'Яя', 24, BRAND, '#fff'),
  little: () => back() + `<path d="M24,104 C22,80 30,64 44,58 L52,44 C56,38 64,42 62,50 L58,60 C70,62 80,72 80,88 L80,104 Z" fill="${SKIN}" ${st()}/><path d="M52,44 L60,22 C62,16 70,18 68,24 L62,44" fill="${SKIN}" ${st()}/><path d="M64,38 L84,26 C90,22 94,30 88,34 L70,46" fill="${SKIN}" ${st()}/><circle class="a-pulse" cx="78" cy="36" r="3" fill="${BRAND}"/><path class="a-twinkle" d="M96,18 l2,5 5,2 -5,2 -2,5 -2,-5 -5,-2 5,-2z" fill="${GOLD}"/>`,
  plus: () => back() + `<circle cx="28" cy="60" r="18" fill="${SKY}" ${st()}/><circle cx="92" cy="60" r="18" fill="${BAD}" ${st()}/><rect x="54" y="44" width="12" height="32" rx="4" fill="${BRAND}" ${st(2.5)}/><rect x="44" y="54" width="32" height="12" rx="4" fill="${BRAND}" ${st(2.5)}/><rect x="56" y="46" width="8" height="28" rx="3" fill="${BRAND}"/>`,
  also: () => back(SKY_L) + `<g transform="translate(-20 18) scale(.8)">${person({ ...CHARS.lena, arm: 'wave', mood: 'big' })}</g><g transform="translate(42 18) scale(.8)">${person({ ...CHARS.marco, arm: 'wave', mood: 'big' })}</g>`,
  question: () => back() + speech(14, 18, 92, 66, '?', 54, SKY, '#fff'),
  answer: () => back() + speech(14, 18, 92, 66, '!', 54, OK, '#fff'),
  form: () => back() + `<rect x="24" y="16" width="72" height="92" rx="8" fill="${WHITE}" ${st()}/><rect x="44" y="10" width="32" height="14" rx="5" fill="${BRAND}" ${st()}/>${[36, 54, 72, 90].map(y => `<rect x="32" y="${y}" width="16" height="8" rx="2" fill="${SKY_L}" ${st(2)}/><path d="M54,${y + 7} h32" ${st(2.5)} opacity=".45"/>`).join('')}`,
  pen: () => back() + `<rect x="18" y="58" width="84" height="46" rx="6" fill="${WHITE}" ${st()}/><path class="a-slide" d="M28,84 q8,-10 14,0 t14,0 t14,0" fill="none" stroke="${SKY}" stroke-width="4" stroke-linecap="round"/><g class="a-slide"><path d="M76,74 L102,22 L112,28 L86,80 Z" fill="${GOLD}" ${st()}/><path d="M76,74 L86,80 L74,88 Z" fill="${SKIN}" ${st(2.5)}/><path d="M102,22 L112,28 L115,22 C116,18 108,14 106,18 Z" fill="${BAD}" ${st(2.5)}/></g>`,
  welcome: () => back(SKY_L) + `<rect x="30" y="28" width="60" height="80" rx="4" fill="${BRAND_D}" ${st()}/><path d="M34,32 L70,40 L70,106 L34,104 Z" fill="${BRAND}" ${st()}/><circle cx="64" cy="72" r="3.5" fill="${GOLD}" ${st(2)}/><rect x="8" y="10" width="104" height="22" rx="8" fill="${OK}" ${st()}/><text x="60" y="26" text-anchor="middle" font-size="12.5" fill="#fff" ${FONT}>WILLKOMMEN</text>`,
  inside: () => back() + `<path d="M22,46 L60,30 L98,46 L98,94 L60,110 L22,94 Z" fill="${SKY_L}" ${st()}/><path d="M22,46 L60,62 L98,46 M60,62 L60,110" fill="none" ${st()}/><circle class="a-bob" cx="60" cy="84" r="12" fill="${BAD}" ${st()}/>`,
  outof: () => back() + `<path d="M14,62 L44,50 L74,62 L74,100 L44,112 L14,100 Z" fill="${SKY_L}" ${st()}/><path d="M14,62 L44,74 L74,62 M44,74 L44,112" fill="none" ${st()}/><circle class="a-bob" cx="88" cy="30" r="12" fill="${BAD}" ${st()}/><path d="M50,58 L74,38" stroke="${BRAND}" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 9"/>`,
  brezel: () => back() + mascotSVG('idle', '', 'x="14" y="10" width="92" height="97"')
};

// Флаги как отдельные ключи.
for (const c of Object.keys(FLAGS)) ART[`flag:${c}`] = () => back() + flag(c);

// anim: true — для крупной картинки показать анимацию (если она есть).
export function art(key, cls = '', { anim = false } = {}) {
  if (!key) return wrap(back());
  if (hasImg('words', key)) return `<span class="art art--img ${cls}">${media('words', key, { anim })}</span>`;
  if (key === 'brezel' && hasImg('mascot', 'idle')) return `<span class="art art--img art--mascot ${cls}">${media('mascot', 'idle')}</span>`;
  if (key.startsWith('bubble:')) {
    const [, text, code] = key.split(':');
    const size = text.length > 6 ? 18 : 22;
    const f = code ? flag(code, 70, 82, 36, 24) : '';
    return wrap(back() + speech(10, 26, 100, 52, text, size, WHITE, INK) + f, '0 0 120 120', cls);
  }
  const fn = ART[key];
  return wrap(fn ? fn() : back() + `<text x="60" y="72" text-anchor="middle" font-size="30" fill="${BRAND_D}" ${FONT}>?</text>`, '0 0 120 120', cls);
}

export function hasArt(key) { return !!key && (key.startsWith('bubble:') || !!ART[key] || hasImg('words', key)); }

// ---------- Сцены для уроков (320×170) ----------
const SCENES = {
  hostel: () => `<rect width="320" height="170" fill="${SKY_L}"/><circle cx="270" cy="34" r="16" fill="${GOLD}" ${st()}/>
    <rect x="30" y="40" width="200" height="130" fill="${CREAM}" ${st()}/><rect x="60" y="18" width="140" height="30" rx="10" fill="${BRAND}" ${st()}/>
    <text x="130" y="39" text-anchor="middle" font-size="18" fill="#fff" ${FONT}>Brezelhaus</text>
    <rect x="44" y="64" width="34" height="30" fill="${SKY_L}" ${st()}/><rect x="182" y="64" width="34" height="30" fill="${SKY_L}" ${st()}/>
    <rect x="100" y="70" width="62" height="20" rx="4" fill="${WHITE}" ${st(2.5)}/>
    <text x="131" y="85" text-anchor="middle" font-size="11" fill="${INK}" ${FONT}>Rezeption</text>
    <rect x="96" y="100" width="70" height="70" fill="${BRAND_D}" ${st()}/>
    ${charAt('lena', 94, 102, .6, { arm: 'wave', mood: 'big' })}
    ${charAt('you', 196, 78, .78, { mood: 'smile' })}<rect x="282" y="132" width="28" height="36" rx="5" fill="${BAD}" ${st()}/><path d="M289,132 v-8 h14 v8" fill="none" ${st()}/>`,
  breakfast: () => `<rect width="320" height="170" fill="#FFF1D6"/><rect x="0" y="0" width="320" height="16" fill="${BRAND_D}"/>
    <rect x="236" y="30" width="56" height="44" rx="4" fill="${SKY_L}" ${st()}/><path d="M264,30 v44 M236,52 h56" ${st(2.5)}/>
    ${charAt('lena', 40, 44, .9, { mood: 'big' })}${charAt('tom', 150, 44, .9, { arm: 'wave', mood: 'big' })}
    <rect x="10" y="130" width="300" height="40" fill="${BRAND}" ${st()}/>
    <path d="M60,112 h22 l-3,20 h-16 z" fill="${WHITE}" ${st()}/><path d="M170,112 h22 l-3,20 h-16 z" fill="${WHITE}" ${st()}/>
    <ellipse cx="128" cy="126" rx="28" ry="8" fill="${BRAND_D}" ${st()}/>${mascotSVG('idle', '', 'x="110" y="92" width="38" height="40"')}`,
  school: () => `<rect width="320" height="170" fill="#FFF1D6"/><rect x="70" y="14" width="180" height="70" rx="6" fill="#2F5D50" ${st()}/>
    <text x="160" y="46" text-anchor="middle" font-size="20" fill="#fff" ${FONT}>Deutsch A1</text><text x="160" y="70" text-anchor="middle" font-size="14" fill="#FFE09A" ${FONT}>Hallo! Wie heißt du?</text>
    ${charAt('wagner', 4, 56, .95, { arm: 'head', mood: 'smile' })}${charAt('marco', 120, 74, .8, { arm: 'wave', mood: 'big' })}${charAt('aigerim', 214, 74, .8, { mood: 'smile' })}
    <rect x="100" y="150" width="210" height="20" fill="${BRAND}" ${st()}/>`,
  taxi: () => `<rect width="320" height="170" fill="${SKY_L}"/><rect x="0" y="130" width="320" height="40" fill="#8E98A6"/><path d="M0,150 h40 M70,150 h40 M140,150 h40 M210,150 h40 M280,150 h40" stroke="#fff" stroke-width="4"/>
    <g transform="translate(232 28) scale(.6)"><rect x="56" y="18" width="8" height="88" fill="#C9CED6" ${st()}/><circle cx="60" cy="44" r="13" fill="#C9CED6" ${st()}/></g>
    <path d="M40,128 L48,96 C52,84 62,78 76,78 L196,78 C210,78 220,86 226,96 L250,104 C262,108 268,116 268,128 Z" fill="#F4E7C3" ${st()}/>
    <rect x="128" y="64" width="44" height="16" rx="4" fill="${GOLD}" ${st()}/><text x="150" y="77" text-anchor="middle" font-size="11" fill="${INK}" ${FONT}>TAXI</text>
    <clipPath id="taxiwin"><path d="M64,104 L70,90 C72,86 76,84 80,84 L140,84 L140,104 Z"/></clipPath><path d="M64,104 L70,90 C72,86 76,84 80,84 L140,84 L140,104 Z" fill="${SKY_L}" ${st(2.5)}/>
    <g clip-path="url(#taxiwin)">${charAt('passenger', 76, 72, .5)}</g>
    <path d="M148,104 L148,84 L192,84 C200,84 206,90 210,104 Z" fill="${SKY_L}" ${st(2.5)}/>
    <clipPath id="taxiwin2"><path d="M148,104 L148,84 L192,84 C200,84 206,90 210,104 Z"/></clipPath><g clip-path="url(#taxiwin2)">${charAt('you', 150, 72, .5, { style: 'cap' })}</g>
    <circle cx="86" cy="130" r="16" fill="${INK}"/><circle cx="86" cy="130" r="6" fill="#C9CED6"/><circle cx="222" cy="130" r="16" fill="${INK}"/><circle cx="222" cy="130" r="6" fill="#C9CED6"/>`,
  lab: () => `<rect width="320" height="170" fill="#EAF6EE"/><rect x="0" y="134" width="320" height="36" fill="${BRAND}" ${st()}/>
    ${mascotSVG('idle', '', 'x="105" y="16" width="110" height="116"')}
    <path d="M30,134 L42,96 L42,76 L58,76 L58,96 L70,134 Z" fill="${SKY_L}" ${st()}/><path d="M36,120 L64,120 L70,134 L30,134 Z" fill="${SKY}"/>
    <path d="M250,134 L262,96 L262,76 L278,76 L278,96 L290,134 Z" fill="${SKY_L}" ${st()}/><path d="M256,120 L284,120 L290,134 L250,134 Z" fill="${BAD}"/>
    ${speech(14, 20, 64, 36, '-e', 20, WHITE, BAD_TXT())}${speech(236, 20, 70, 36, '-st', 20, WHITE, BAD_TXT())}<text x="160" y="158" text-anchor="middle" font-size="16" fill="#fff" ${FONT}>ich -e · du -st · er -t</text>`,
  party: () => `<rect width="320" height="170" fill="#FDEBD3"/><path d="M0,14 Q160,52 320,14" fill="none" ${st(2.5)}/>
    ${[20, 60, 100, 140, 180, 220, 260, 300].map((x, i) => `<path d="M${x - 12},${18 + Math.sin(i / 7 * Math.PI) * 22} L${x + 12},${18 + Math.sin(i / 7 * Math.PI) * 22} L${x},${42 + Math.sin(i / 7 * Math.PI) * 22} Z" fill="${[BAD, SKY, GOLD, OK][i % 4]}" ${st(2)}/>`).join('')}
    ${charAt('marco', 4, 58, .9, { arm: 'cheer', mood: 'big' })}${charAt('lena', 110, 58, .9, { mood: 'talk' })}${charAt('aigerim', 214, 58, .9, { arm: 'wave', mood: 'big' })}
    <path class="a-bob" d="M112,50 v-18 l14,-4 v18" fill="none" ${st(3)}/><circle cx="108" cy="50" r="5" fill="${INK}"/><circle cx="122" cy="46" r="5" fill="${INK}"/>`,
  album: () => `<rect width="320" height="170" fill="#FFF1D6"/><rect x="24" y="12" width="272" height="148" rx="10" fill="${BRAND_D}" ${st()}/><rect x="34" y="20" width="124" height="132" rx="4" fill="${WHITE}" ${st(2.5)}/><rect x="162" y="20" width="124" height="132" rx="4" fill="${WHITE}" ${st(2.5)}/>
    ${[['lena', 44, 26], ['tom', 100, 26], ['wagner', 172, 26], ['marco', 228, 26]].map(([w, x, y]) => `<rect x="${x}" y="${y}" width="50" height="56" fill="${SKY_L}" ${st(2)}/><g transform="translate(${x - 5} ${y - 4}) scale(.5)">${person({ ...CHARS[w] })}</g><rect x="${x}" y="${y}" width="50" height="56" fill="none" ${st(2)}/>`).join('')}
    ${[['aigerim', 44, 90], ['you', 100, 90], ['becker', 172, 90]].map(([w, x, y]) => `<rect x="${x}" y="${y}" width="50" height="56" fill="${SKY_L}" ${st(2)}/><g transform="translate(${x - 5} ${y - 4}) scale(.5)">${person({ ...CHARS[w] })}</g><rect x="${x}" y="${y}" width="50" height="56" fill="none" ${st(2)}/>`).join('')}
    <text x="253" y="124" text-anchor="middle" font-size="30" fill="${BRAND}" ${FONT}>?</text>`,
  street: () => `<rect width="320" height="170" fill="${SKY_L}"/>
    <g transform="translate(200 0) scale(1)">${'<rect x="56" y="18" width="8" height="120" fill="#C9CED6" stroke="#3B2614" stroke-width="3"/><circle cx="60" cy="50" r="15" fill="#C9CED6" stroke="#3B2614" stroke-width="3"/>'}</g>
    <rect x="0" y="80" width="60" height="70" fill="${GOLD}" ${st()}/><rect x="60" y="64" width="50" height="86" fill="${BRAND}" ${st()}/><rect x="270" y="90" width="50" height="60" fill="${BAD}" ${st()}/>
    <rect x="0" y="146" width="320" height="24" fill="#C9CED6" ${st()}/>
    ${charAt('you', 30, 50, 1, { arm: 'mic', mood: 'talk' })}${charAt('woman', 170, 50, 1, { mood: 'smile' })}`,
  ubahn: () => `<rect width="320" height="170" fill="#E9EEF3"/><rect x="10" y="22" width="300" height="118" rx="18" fill="#F2C230" ${st()}/>
    <rect x="28" y="40" width="70" height="56" rx="8" fill="${SKY_L}" ${st()}/><rect x="222" y="40" width="70" height="56" rx="8" fill="${SKY_L}" ${st()}/>
    <rect x="118" y="36" width="84" height="104" fill="#E5B21E" ${st()}/><path d="M160,36 v104" ${st()}/>
    <rect x="270" y="4" width="30" height="30" rx="4" fill="#1E5AA8" ${st()}/><text x="285" y="27" text-anchor="middle" font-size="22" fill="#fff" ${FONT}>U</text>
    <g><clipPath id="ub1"><rect x="28" y="40" width="70" height="56" rx="8"/></clipPath><g clip-path="url(#ub1)">${charAt('tom', 26, 34, .62, { mood: 'oops', arm: 'head' })}</g></g>
    <g><clipPath id="ub2"><rect x="222" y="40" width="70" height="56" rx="8"/></clipPath><g clip-path="url(#ub2)">${charAt('becker', 222, 34, .62, { mood: 'smile' })}</g></g>
    <circle cx="70" cy="150" r="12" fill="${INK}"/><circle cx="250" cy="150" r="12" fill="${INK}"/><rect x="0" y="158" width="320" height="12" fill="#8E98A6"/>`,
  office: () => `<rect width="320" height="170" fill="#FFF1D6"/><rect x="96" y="10" width="128" height="26" rx="8" fill="${SKY}" ${st()}/><text x="160" y="29" text-anchor="middle" font-size="15" fill="#fff" ${FONT}>Anmeldung</text>
    ${charAt('wagner', 100, 40, .95, { mood: 'smile' })}<rect x="20" y="120" width="280" height="50" fill="${BRAND}" ${st()}/>
    <g transform="rotate(-8 70 120)"><rect x="40" y="98" width="62" height="40" rx="4" fill="${WHITE}" ${st()}/><path d="M48,110 h40 M48,120 h30 M48,130 h36" ${st(2.5)} opacity=".4"/></g>
    <g transform="translate(206 134) rotate(-10)"><rect x="0" y="0" width="56" height="9" rx="3" fill="${GOLD}" ${st(2.5)}/><path d="M56,0 L66,4.5 L56,9 Z" fill="${SKIN}" ${st(2)}/></g>`
};
function BAD_TXT() { return '#D6473A'; }

export function scene(key) {
  if (hasImg('scenes', key)) return media('scenes', key, { anim: true, cls: 'scene-img', lazy: false });
  const fn = SCENES[key];
  return fn ? `<svg viewBox="0 0 320 170" aria-hidden="true">${fn()}</svg>` : '';
}
