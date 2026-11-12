// Маскот — весёлый кренделёк Брецель. Настроения: idle, happy, sad, wave.
import { hasImg } from './img.js';
import { tx } from './i18n.js';
const NAME = tx('Брецель');
const ROPE = 'M70,142 C80,118 90,96 100,76 C115,48 150,22 167,44 C182,64 182,96 168,118 C150,150 125,168 100,168 C75,168 50,150 32,118 C18,96 18,64 33,44 C50,22 85,48 100,76 C110,96 120,118 130,142';
const BELLY = 'M168,118 C150,150 125,168 100,168 C75,168 50,150 32,118';
const OUT = '#8A4A12', BODY = '#D9923F', HI = '#F7C47E';

const salt = [
  [150, 30, -25], [176, 78, 75], [44, 32, 20], [22, 84, -75], [92, 58, 60], [112, 104, -55],
  [52, 132, 35], [148, 132, -35]
].map(([x, y, r]) => `<rect x="${x - 4}" y="${y - 2.5}" width="8" height="5" rx="2.4" fill="#FFFDF6" transform="rotate(${r} ${x} ${y})"/>`).join('');

const MOODS = ['idle', 'happy', 'sad', 'wave'];

// Нарисованный маскот: 4 картинки настроений, видна та, что совпадает с data-mood.
function mascotImg(mood, extraClass) {
  const src = m => `img/mascot/${hasImg('mascot', m) ? m : 'idle'}.webp`;
  return `<div class="mascot mascot--img ${extraClass}" data-mood="${mood}" role="img" aria-label="${NAME}">${MOODS.map(m => `<img class="mi mi-${m}" src="${src(m)}" alt="" decoding="async">`).join('')}</div>`;
}

// attrs — для вложения в другую SVG-картинку (x, y, width, height); тогда всегда SVG.
export function mascotSVG(mood = 'idle', extraClass = '', attrs = '') {
  if (!attrs && hasImg('mascot', 'idle')) return mascotImg(mood, extraClass);
  return `<svg class="mascot ${extraClass}" data-mood="${mood}" viewBox="0 0 200 210" ${attrs} role="img" aria-label="${NAME}">
  <g class="m-arm-l"><path d="M36,128 L16,150" stroke="${OUT}" stroke-width="9" stroke-linecap="round"/><path d="M36,128 L16,150" stroke="${BODY}" stroke-width="5" stroke-linecap="round"/><circle cx="14" cy="152" r="7" fill="${BODY}" stroke="${OUT}" stroke-width="3"/></g>
  <g class="m-arm-r"><path d="M164,128 L184,150" stroke="${OUT}" stroke-width="9" stroke-linecap="round"/><path d="M164,128 L184,150" stroke="${BODY}" stroke-width="5" stroke-linecap="round"/><circle cx="186" cy="152" r="7" fill="${BODY}" stroke="${OUT}" stroke-width="3"/></g>
  <g class="m-body">
    <ellipse cx="84" cy="198" rx="13" ry="6.5" fill="${OUT}"/>
    <ellipse cx="116" cy="198" rx="13" ry="6.5" fill="${OUT}"/>
    <path d="${ROPE}" fill="none" stroke="${OUT}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${BELLY}" fill="none" stroke="${OUT}" stroke-width="50" stroke-linecap="round"/>
    <path d="${ROPE}" fill="none" stroke="${BODY}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${BELLY}" fill="none" stroke="${BODY}" stroke-width="42" stroke-linecap="round"/>
    <path d="${ROPE}" fill="none" stroke="${HI}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" transform="translate(-2 -4)" opacity=".85"/>
    <path d="M158,126 C150,140 140,150 128,156" fill="none" stroke="${HI}" stroke-width="5" stroke-linecap="round" opacity=".85"/>
    <path d="M42,126 C50,140 60,150 72,156" fill="none" stroke="${HI}" stroke-width="5" stroke-linecap="round" opacity=".85"/>
    ${salt}
    <ellipse cx="72" cy="175" rx="7.5" ry="4.5" fill="#FF8E7C" opacity=".6"/>
    <ellipse cx="128" cy="175" rx="7.5" ry="4.5" fill="#FF8E7C" opacity=".6"/>
    <g class="m-eyes-normal"><g class="m-blink">
      <circle cx="86" cy="164" r="6.5" fill="#3B2614"/><circle cx="114" cy="164" r="6.5" fill="#3B2614"/>
      <circle cx="88.2" cy="161.6" r="2.2" fill="#fff"/><circle cx="116.2" cy="161.6" r="2.2" fill="#fff"/>
    </g></g>
    <g class="m-eyes-happy" fill="none" stroke="#3B2614" stroke-width="4" stroke-linecap="round">
      <path d="M79,166 Q86,157 93,166"/><path d="M107,166 Q114,157 121,166"/>
    </g>
    <g class="m-brows-sad" fill="none" stroke="#3B2614" stroke-width="3.5" stroke-linecap="round">
      <path d="M78,155 L92,151"/><path d="M122,155 L108,151"/>
    </g>
    <path class="m-mouth-normal" d="M92,175 Q100,183 108,175" fill="none" stroke="#3B2614" stroke-width="4" stroke-linecap="round"/>
    <g class="m-mouth-happy"><path d="M89,173 Q100,190 111,173 Z" fill="#7A2E1A" stroke="#3B2614" stroke-width="3" stroke-linejoin="round"/><path d="M95,182 Q100,186 105,182 Q100,179 95,182Z" fill="#FF8E7C"/></g>
    <path class="m-mouth-sad" d="M92,182 Q100,174 108,182" fill="none" stroke="#3B2614" stroke-width="4" stroke-linecap="round"/>
  </g>
</svg>`;
}

// Меняет настроение маскота внутри контейнера. Анимация перезапускается.
export function setMood(root, mood, backTo = 'idle', ms = 1400) {
  const svg = root && (root.matches?.('.mascot') ? root : root.querySelector('.mascot'));
  if (!svg) return;
  svg.setAttribute('data-mood', 'reset');
  void svg.getBoundingClientRect();
  svg.setAttribute('data-mood', mood);
  clearTimeout(svg._moodT);
  if (backTo && mood !== backTo && mood !== 'sad') {
    svg._moodT = setTimeout(() => svg.setAttribute('data-mood', backTo), ms);
  }
}
