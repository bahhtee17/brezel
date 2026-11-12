// Находит в js/*.js русские строки интерфейса.
//   node scripts/i18n-extract.cjs          — печатает список строк по файлам (JSON)
//   node scripts/i18n-extract.cjs --wrap   — оборачивает ещё не обёрнутые строки в t(...) / t`...`
//   node scripts/i18n-extract.cjs --check  — показывает строки, для которых нет перевода в js/uz.js
const fs = require('fs');
const path = require('path');
const acorn = require(path.join(__dirname, '..', 'anim', 'node_modules', 'acorn'));

const CYR = /[а-яА-ЯёЁ]/;
const wrap = process.argv.includes('--wrap');
const check = process.argv.includes('--check');
const skip = new Set(['i18n.js', 'uz.js', 'mascot.js']);   // в mascot.js русское только имя в aria-label
const root = path.join(__dirname, '..');
const out = {};

for (const f of fs.readdirSync(path.join(root, 'js')).filter(x => x.endsWith('.js') && !skip.has(x))) {
  const p = path.join(root, 'js', f);
  const src = fs.readFileSync(p, 'utf8');
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module' });
  const ins = [];
  const keys = [];
  (function walk(n, parent, pkey) {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'Literal' && typeof n.value === 'string' && CYR.test(n.value)) {
      const isKey = parent && parent.type === 'Property' && pkey === 'key' && !parent.computed;
      const tagged = parent && parent.type === 'CallExpression' && parent.callee.name === 'tx';
      if (!isKey) keys.push(n.value);
      if (!isKey && !tagged) ins.push([n.end, ')'], [n.start, 'tx(']);
    }
    if (n.type === 'TemplateLiteral' && n.quasis.some(q => CYR.test(q.value.cooked))) {
      const tagged = parent && parent.type === 'TaggedTemplateExpression';
      keys.push(n.quasis.map(q => q.value.cooked).join('{}'));
      if (!tagged) ins.push([n.start, 'tx']);
    }
    for (const k of Object.keys(n)) {
      const v = n[k];
      if (Array.isArray(v)) v.forEach(c => walk(c, n, k));
      else if (v && typeof v.type === 'string') walk(v, n, k);
    }
  })(ast, null, null);
  out[f] = keys;
  if (wrap && ins.length) {
    let s = src;
    ins.sort((a, b) => b[0] - a[0] || (a[1] === ')' ? -1 : 1));
    for (const [pos, txt] of ins) s = s.slice(0, pos) + txt + s.slice(pos);
    if (!/from '\.\/i18n\.js'/.test(s)) s = s.replace(/^((?:\/\/.*\r?\n)*)/, "$1import { tx } from './i18n.js';\n");
    fs.writeFileSync(p, s);
  }
}

if (check) {
  const uzSrc = fs.readFileSync(path.join(root, 'js', 'uz.js'), 'utf8').replace(/^export default/m, 'module.exports =');
  const m = { exports: {} };
  new Function('module', uzSrc)(m);
  const missing = [...new Set(Object.values(out).flat())].filter(k => !(k in m.exports));
  console.log(missing.length ? JSON.stringify(missing, null, 1) : 'all translated');
} else if (wrap) {
  console.error('strings:', Object.values(out).reduce((a, b) => a + b.length, 0));
} else {
  console.log(JSON.stringify(out, null, 1));
}
