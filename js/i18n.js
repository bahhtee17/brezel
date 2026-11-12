// Язык объяснений: русский (основной) или узбекский.
// Русский текст — ключ. Интерфейс переводится словарём js/uz.js, уроки — словарём content/uz.json.
// Немецкая часть уроков общая для обоих языков.
import UZ from './uz.js';

const KEY = 'brezel.lang';
export const LANGS = [{ id: 'ru', name: 'Русский' }, { id: 'uz', name: "O'zbekcha" }];

function detect() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'ru' || saved === 'uz') return saved;
  } catch { /* без хранилища — по языку телефона */ }
  return /^uz/i.test(navigator.language || '') ? 'uz' : 'ru';
}

const current = detect();
const on = current === 'uz';
document.documentElement.lang = current;

export const lang = () => current;

// Смена языка: сохраняем выбор и перезапускаем приложение.
export function setLang(id) {
  if (id === current) return;
  try { localStorage.setItem(KEY, id); } catch { /* ignore */ }
  location.reload();
}

// Всё, что показано на языке объяснений (не по-немецки). По этому признаку решаем, озвучивать ли текст.
const native = new Set();
export const isNative = s => /[а-яё]/i.test(s) || native.has(s);
const keep = s => { if (on) native.add(s); return s; };

// Перевод строки интерфейса. Два вида вызова: tx('Текст') и tx`Текст ${значение}`.
// Для шаблона ключ — текст с {} на месте значений; в переводе {} идут по порядку, {0}, {1} — по номеру.
export function tx(s, ...vals) {
  if (typeof s === 'string') return on ? keep(UZ[s] ?? s) : s;
  const tpl = on ? UZ[s.join('{}')] : null;
  if (tpl == null) return keep(s.reduce((a, x, i) => a + x + (i < vals.length ? vals[i] : ''), ''));
  let k = 0;
  return keep(tpl.replace(/\{(\d*)\}/g, (_, n) => vals[n === '' ? k++ : +n]));
}

// ---------- Транскрипция ----------
// В разделе «Чтение» звучание записано русскими буквами. Для узбекского переводим его в латиницу:
// [х] в начале слова — немецкий выдох h, в остальных местах — твёрдое x; мягкое [хь] — x'; ö и ü остаются как есть.
const LAT = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'ö', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'ü', я: 'ya' };
const LAT_WORD = { 'долго · коротко': "cho'ziq · qisqa", '1-й слог': "1-bo'g'in", 'х · —': 'h · —', х: 'x', ю: 'ü',
  вохнен: 'vohnen', уохнен: 'uohnen', зехр: 'zehr', сехр: 'sehr', зехн: 'zehn' };

export function latin(s) {
  if (!on || typeof s !== 'string') return s;
  if (s in LAT_WORD) return keep(LAT_WORD[s]);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i], low = c.toLowerCase(), next = (s[i + 1] || '').toLowerCase();
    let r;
    if (low === 'д' && next === 'ж') { r = 'j'; i++; }
    else if (low === 'х' && next === 'ь') { r = "x'"; i++; }
    else if (low === 'х' && i === 0) r = 'h';
    else if (low === 'ю' && i === 0) r = 'yu';
    else r = LAT[low] ?? c;
    out += c !== low ? r.toUpperCase() : r;
  }
  return keep(out);
}

// ---------- Уроки ----------
let dict = null;

// Словарь уроков нужен только для узбекского. Без него (нет сети при первом запуске) уроки останутся на русском.
export async function loadDict() {
  if (!on || dict) return;
  try {
    const r = await fetch('content/uz.json');
    dict = r.ok ? await r.json() : {};
  } catch { dict = {}; }
}

// Заменяет в данных урока русские строки на перевод. Данные меняются на месте.
export function localize(data) {
  if (!on || !dict) return data;
  const walk = o => {
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (typeof v === 'string') { const tr = dict[v]; if (tr != null) o[k] = keep(tr); }
      else if (v && typeof v === 'object') walk(v);
    }
  };
  if (data && typeof data === 'object') walk(data);
  return data;
}
