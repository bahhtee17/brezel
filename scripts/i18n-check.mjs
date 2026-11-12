// Проверка узбекского перевода уроков: что осталось на русском и нет ли одинаковых вариантов в заданиях «Чтения».
//   node scripts/i18n-check.mjs
import fs from 'node:fs';

// Запускаем модуль перевода вне браузера в режиме узбекского.
globalThis.localStorage = { getItem: () => 'uz', setItem() {} };
globalThis.document = { documentElement: {} };
globalThis.location = { reload() {} };
const dict = JSON.parse(fs.readFileSync('content/uz.json', 'utf8'));
globalThis.fetch = async () => ({ ok: true, json: async () => dict });
const { loadDict, localize, latin } = await import('../js/i18n.js');
await loadDict();

const CYR = /[а-яё]/i;
const left = new Set();
const scan = (o, path) => {
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'string') { if (CYR.test(v) && !v.startsWith('bubble:')) left.add(`${path}.${k}: ${v}`); }
    else if (v && typeof v === 'object') scan(v, `${path}.${k}`);
  }
};

const course = JSON.parse(fs.readFileSync('content/course.json', 'utf8'));
scan(localize(course), 'course');
for (const t of course.levels.flatMap(l => l.topics).filter(t => t.file)) {
  scan(localize(JSON.parse(fs.readFileSync(`content/${t.file}`, 'utf8'))), t.id);
}

const reading = JSON.parse(fs.readFileSync('content/reading.json', 'utf8'));
delete reading._format;
let clash = 0;
for (const c of reading.chapters) for (const rule of c.rules) {
  rule.snd = latin(rule.snd);
  for (const w of rule.words || []) {
    w.snd = latin(w.snd); w.tr = latin(w.tr); w.alt = (w.alt || []).map(latin);
    const opts = [w.tr, ...w.alt];
    if (new Set(opts).size !== opts.length) { clash++; console.log('одинаковые варианты:', w.de, opts.join(' | ')); }
    if (w.snd.split('|').length !== w.seg.split('|').length) console.log('части не совпали:', w.de, w.seg, w.snd);
  }
}
scan(localize(reading), 'reading');

console.log(left.size ? [...left].join('\n') : 'русских строк не осталось');
console.log(`не переведено: ${left.size}, одинаковых вариантов: ${clash}`);
if (process.argv.includes('--show')) {
  for (const c of reading.chapters) for (const rule of c.rules) {
    console.log(`\n${rule.big} = [${rule.snd}]`);
    for (const w of rule.words || []) console.log(`  ${w.de}: ${w.snd} | [${w.tr}] | ${w.alt.join(', ')}`);
  }
}
