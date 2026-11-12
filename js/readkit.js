// Общие помощники раздела «Чтение»: данные правил, разбор слова на части, картинка к слову.
// Используются экраном чтения (reading.js) и заданием «Как читается слово?» (exercises.js).
import { esc } from './ui.js';
import { loadDict, localize, latin } from './i18n.js';
import { art } from './art.js';
import { hasImg, media } from './img.js';

let data = null;
let rules = [];

export async function loadReading() {
  if (data) return data;
  const [r] = await Promise.all([fetch('content/reading.json'), loadDict()]);
  data = await r.json();
  // Звучание (snd, tr, alt) записано русскими буквами: для узбекского — латиницей. Делается до перевода текстов.
  for (const c of data.chapters) for (const rule of c.rules) {
    rule.snd = latin(rule.snd);
    for (const w of rule.words || []) { w.snd = latin(w.snd); w.tr = latin(w.tr); w.alt = (w.alt || []).map(latin); }
  }
  delete data._format;
  localize(data);
  rules = data.chapters.flatMap((c, ci) => c.rules.map(rule => ({ ...rule, chapter: { ...c, n: ci + 1 } })));
  rules.forEach((rule, i) => { rule.n = i + 1; });
  return data;
}

export const readingRules = () => rules;
export const readingRule = id => rules.find(r => r.id === id);

// seg: "n|*ei|n", snd: "н|ай|н" → [{ de: 'n', snd: 'н' }, { de: 'ei', snd: 'ай', focus: true }, …]
export function wordParts(w) {
  const s = String(w.seg || w.de).split('|');
  const t = String(w.snd || '').split('|');
  return s.map((x, i) => ({ de: x.replace(/^\*/, ''), focus: x.startsWith('*'), snd: t[i] ?? '' }));
}

// Слово с выделенными буквами, о которых правило.
export const readWordHtml = w => wordParts(w).map(p => (p.focus ? `<span class="rd-f">${esc(p.de)}</span>` : esc(p.de))).join('');

// Разбор: под каждой частью слова — как она звучит.
export const readSegsHtml = w => `<div class="segs">${wordParts(w).map((p, i) =>
  `<span class="sg${p.focus ? ' is-focus' : ''}" style="--i:${i}"><b>${esc(p.de)}</b><i>${esc(p.snd || '·')}</i></span>`).join('')}</div>`;

// Задание «Как читается слово?» для тренировок, проверок освоения и входного теста.
export const readExercise = (w, rule) => ({
  type: 'readWord', de: w.de, seg: w.seg, snd: w.snd, ru: w.ru, img: w.img, scene: w.scene, glyph: w.glyph,
  stress: !!rule.stress, rule: { id: rule.id, big: rule.big, snd: rule.snd, title: rule.title },
  options: [w.tr, ...w.alt], answer: 0
});

// Картинка: нарисованная картинка курса, сцена или кубик с буквой/цифрой, если картинки нет.
export function readPicHtml(w) {
  if (w.scene && hasImg('scenes', w.scene)) return `<span class="art art--img">${media('scenes', w.scene)}</span>`;
  if (w.img) return art(w.img);
  const g = w.glyph || w.de.charAt(0).toUpperCase();
  const tone = [...w.de].reduce((a, c) => a + c.charCodeAt(0), 0) % 4;
  return `<span class="art rd-block rd-block--${tone}"><b class="${g.length > 1 ? 'is-long' : ''}">${esc(g)}</b></span>`;
}
