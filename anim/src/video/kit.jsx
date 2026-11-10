// Общие детали всех роликов: палитра, шрифт, подгонка размеров и «кирпичики» сцен.
import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Nunito';

export const { fontFamily } = loadFont('normal', { weights: ['700', '800', '900'], subsets: ['cyrillic', 'latin', 'latin-ext'] });

export const C = {
  bg: '#FFF7E8', bg2: '#FDEFD6', card: '#FFFFFF', ink: '#3B2614', ink2: '#7A5B3E', ink3: '#B39577', line: '#EFDDBF',
  brand: '#D08A3A', brandDark: '#9A5A1A', brandLight: '#F8E1BC', ok: '#3DBE5B', okDark: '#2A9145', okLight: '#DDF6E2',
  bad: '#FF6B5B', badDark: '#D6473A', badLight: '#FFE3DF', sky: '#3AA6F0', skyDark: '#1E84CC', skyLight: '#DDF0FD', marker: '#FFD98A'
};
const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
export const clamp = (f, a, b, x = 0, y = 1) => interpolate(f, [a, b], [x, y], CLAMP);

// «Дрожание» рисованной линии и пружинка появления.
export const boil = f => [-0.5, 0.35, 0, 0.45][Math.floor(f / 4) % 4];
export const usePop = (delay = 0, cfg = { damping: 12, mass: 0.7 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - delay, fps, config: cfg });
};

// Оценка ширины текста в «эмах» (Nunito Black) — чтобы подобрать кегль без замеров в браузере.
export const em = text => {
  let w = 0;
  for (const ch of String(text ?? '')) {
    if (ch === ' ') w += 0.3;
    else if ('·-–—[]():.,!?\'’«»…'.includes(ch)) w += 0.38;
    else if ('iljtfrI1'.includes(ch)) w += 0.42;
    else if ('MWШЩЖЮЫФ'.includes(ch)) w += 0.98;
    else if ('mwшщжмюыф'.includes(ch)) w += 0.9;
    else if (ch !== ch.toLowerCase()) w += 0.72;
    else w += 0.62;
  }
  return w;
};
export const fitSize = (text, limit, sizes) => sizes.find(s => em(text) * s <= limit) ?? sizes[sizes.length - 1];
export const isLatin = t => /[A-Za-zÄÖÜäöüß]/.test(String(t));

// Кадр (от начала сцены), на котором начинается реплика k.
export const at = (s, k) => (s.segs[k] ? s.segs[k].rf : 9999);
export const parts = s => s.seg.split('|').map((x, i) => ({ de: x.replace(/^\*/, ''), focus: x.startsWith('*'), snd: s.snd.split('|')[i] }));
export const hasPic = it => Boolean(it.img || it.scene || it.flag || it.bubble || it.sym);

// Немецкие слова и [звуки] в русской строке подсвечиваются.
export const rich = text => String(text).split(/(\[[^\]]+\]|[A-Za-zÄÖÜäöüß]+(?:[-'][A-Za-zÄÖÜäöüß]+)*)/).map((x, i) => {
  if (!x) return null;
  if (x.startsWith('[')) return <span key={i} style={{ color: C.skyDark, fontWeight: 900 }}>{x}</span>;
  if (isLatin(x)) return <span key={i} style={{ color: C.brandDark, fontWeight: 900 }}>{x}</span>;
  return <span key={i}>{x}</span>;
});

export const Stage = ({ top = 200, children, style }) => (
  <AbsoluteFill style={{ alignItems: 'center', paddingTop: top, fontFamily, color: C.ink, ...style }}>{children}</AbsoluteFill>
);

export const Fade = ({ from = 0, children, dy = 30, style }) => {
  const o = clamp(useCurrentFrame(), from, from + 10);
  return <div style={{ opacity: o, transform: `translateY(${(1 - o) * dy}px)`, ...style }}>{children}</div>;
};
export const Pop = ({ from = 0, children, style, cfg }) => {
  const p = usePop(from, cfg);
  return <div style={{ transform: `scale(${p})`, opacity: Math.min(1, p * 3), ...style }}>{children}</div>;
};

const TONES = {
  brand: [C.brandLight, C.brandDark, '#EBC48E'], sky: [C.skyLight, C.skyDark, '#A9D6F7'],
  ok: [C.okLight, C.okDark, '#BDE6C7'], bad: [C.badLight, C.badDark, '#F7B8AF']
};
export const Tile = ({ children, tone = 'brand', size = 200, style }) => {
  const [bg, fg, bd] = TONES[tone];
  return (
    <div style={{ minWidth: size * 1.25, minHeight: size * 1.25, padding: `${size * 0.12}px ${size * 0.2}px`, borderRadius: size * 0.32,
      background: bg, color: fg, border: `7px solid ${bd}`, borderBottomWidth: 16, fontSize: size, fontWeight: 900, lineHeight: 1,
      display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', boxSizing: 'border-box', ...style }}>{children}</div>
  );
};
export const Pill = ({ children, tone = 'sky', style }) => (
  <div style={{ padding: '14px 34px', borderRadius: 999, fontSize: 40, fontWeight: 900, letterSpacing: 1, whiteSpace: 'nowrap',
    background: tone === 'sky' ? C.skyLight : C.brandLight, color: tone === 'sky' ? C.skyDark : C.brandDark, ...style }}>{children}</div>
);

// Флаги рисуем сами — как в приложении (js/art.js).
const FLAGS = {
  de: <><rect width="60" height="40" fill="#1A1A1A" /><rect y="13.3" width="60" height="13.4" fill="#DD0000" /><rect y="26.7" width="60" height="13.3" fill="#FFCE00" /></>,
  at: <><rect width="60" height="40" fill="#C8102E" /><rect y="13.3" width="60" height="13.4" fill="#fff" /></>,
  ch: <><rect width="60" height="40" fill="#DA291C" /><rect x="18" y="16.4" width="24" height="7.2" fill="#fff" /><rect x="26.4" y="8" width="7.2" height="24" fill="#fff" /></>,
  ru: <><rect width="60" height="40" fill="#fff" /><rect y="13.3" width="60" height="13.4" fill="#0039A6" /><rect y="26.7" width="60" height="13.3" fill="#D52B1E" /></>,
  it: <><rect width="60" height="40" fill="#fff" /><rect width="20" height="40" fill="#009246" /><rect x="40" width="20" height="40" fill="#CE2B37" /></>,
  kz: <><rect width="60" height="40" fill="#00AFCA" /><rect x="4" y="4" width="3" height="32" fill="#FEC50C" /><circle cx="32" cy="17" r="6" fill="#FEC50C" />
    {[...Array(12)].map((_, i) => <rect key={i} x="31.4" y="7.4" width="1.2" height="2.6" fill="#FEC50C" transform={`rotate(${i * 30} 32 17)`} />)}
    <path d="M20 27 Q32 34 44 27" fill="none" stroke="#FEC50C" strokeWidth="2.2" strokeLinecap="round" /></>,
  uz: <><rect width="60" height="40" fill="#0099B5" /><rect y="13" width="60" height="14" fill="#fff" /><rect y="27" width="60" height="13" fill="#1EB53A" />
    <rect y="12.4" width="60" height="1.2" fill="#CE1126" /><rect y="26.4" width="60" height="1.2" fill="#CE1126" />
    <circle cx="10" cy="6.5" r="4" fill="#fff" /><circle cx="11.6" cy="6.5" r="3.4" fill="#0099B5" />
    {[[17, 4], [21, 4], [25, 4], [19, 8], [23, 8]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="0.9" fill="#fff" />)}</>
};
export const Flag = ({ code, w = 140, style }) => (
  <div style={{ width: w, height: w * 2 / 3, borderRadius: w * 0.12, overflow: 'hidden', boxShadow: `0 0 0 ${Math.max(2, w * 0.03)}px ${C.line}`, flexShrink: 0, ...style }}>
    <svg viewBox="0 0 60 40" width={w} height={w * 2 / 3} style={{ display: 'block' }}>{FLAGS[code]}</svg>
  </div>
);

// Квадратная картинка: рисунок слова, сцена, флаг, «облачко» с репликой или символ.
export const Thumb = ({ it, size = 140, style }) => {
  const box = { width: size, height: size, borderRadius: size * 0.2, overflow: 'hidden', background: C.card, flexShrink: 0, position: 'relative',
    display: 'flex', alignItems: 'center', justifyContent: 'center', ...style };
  if (it.img || it.scene) {
    return <div style={box}><Img src={staticFile(it.img ? `img/${it.img}.jpg` : `scene/${it.scene}.jpg`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>;
  }
  if (it.flag) return <div style={{ ...box, background: C.skyLight }}><Flag code={it.flag} w={size * 0.74} /></div>;
  if (it.bubble) {
    const [text, code] = it.bubble.split(':');
    const fs = Math.min(size * 0.24, (size * 0.6) / em(text));
    return (
      <div style={{ ...box, background: C.skyLight }}>
        <div style={{ position: 'relative', background: C.card, borderRadius: size * 0.14, padding: `${size * 0.07}px ${size * 0.09}px`, marginBottom: size * 0.12,
          fontSize: fs, fontWeight: 900, color: C.brandDark, whiteSpace: 'nowrap', boxShadow: `0 ${size * 0.025}px 0 #A9D6F7` }}>
          {text}
          <div style={{ position: 'absolute', left: size * 0.1, bottom: -size * 0.08, width: 0, height: 0, borderLeft: `${size * 0.05}px solid transparent`,
            borderRight: `${size * 0.05}px solid transparent`, borderTop: `${size * 0.09}px solid ${C.card}` }} />
        </div>
        {code && <Flag code={code} w={size * 0.27} style={{ position: 'absolute', right: size * 0.09, bottom: size * 0.09 }} />}
      </div>
    );
  }
  if (it.sym) return <div style={{ ...box, background: C.brandLight, fontSize: size * 0.5, fontWeight: 900, color: C.brandDark }}>{it.sym}</div>;
  return null;
};

// Большая картинка в белой рамке — чуть наклонена и «дышит».
export const Pic = ({ it, size = 560, delay = 0 }) => {
  const f = useCurrentFrame();
  const p = usePop(delay);
  return (
    <div style={{ transform: `scale(${p}) rotate(${-2 + boil(f)}deg)`, borderRadius: size * 0.1, border: `8px solid ${C.card}`, overflow: 'hidden',
      boxShadow: `0 14px 0 ${C.line}, 0 0 0 4px ${C.line}`, flexShrink: 0 }}>
      <Thumb it={it} size={size} style={{ borderRadius: 0 }} />
    </div>
  );
};

// Слово распадается на карточки «буквы — звук».
const partW = (p, s) => Math.max(s * 0.55, em(p.de) * s * 0.72, em(p.snd) * s * 0.48) + 48;
export const splitSize = (ps, limit = 950) => [150, 140, 130, 118, 106, 96, 86, 76, 66].find(s =>
  ps.reduce((a, p) => a + partW(p, s), 0) + (ps.length - 1) * 14 <= limit && em(ps.map(p => p.de).join('')) * s <= limit) ?? 60;
export const SplitWord = ({ parts: ps, splitAt, size }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const whole = clamp(f, splitAt - 4, splitAt + 4, 1, 0);
  return (
    <div style={{ position: 'relative', minHeight: size * 1.9, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', opacity: whole, fontSize: size, fontWeight: 900, color: C.ink, whiteSpace: 'nowrap' }}>
        {ps.map((p, i) => <span key={i} style={p.focus ? { color: C.brandDark, background: `linear-gradient(transparent 62%, ${C.marker} 62%)` } : null}>{p.de}</span>)}
      </div>
      <div style={{ display: 'flex', gap: 14, opacity: 1 - whole }}>
        {ps.map((p, i) => {
          const k = spring({ frame: f - splitAt - i * 4, fps, config: { damping: 11, mass: 0.6 } });
          return (
            <div key={i} style={{ transform: `translateY(${(1 - k) * 60}px) scale(${0.7 + 0.3 * k})`, minWidth: size * 0.55, padding: '14px 18px 12px', borderRadius: 30,
              textAlign: 'center', background: p.focus ? C.brandLight : C.card, border: `6px solid ${p.focus ? C.brand : C.line}`, whiteSpace: 'nowrap' }}>
              <div style={{ fontSize: size * 0.72, fontWeight: 900, color: p.focus ? C.brandDark : C.ink, lineHeight: 1.1 }}>{p.de}</div>
              <div style={{ fontSize: size * 0.48, fontWeight: 800, color: C.skyDark, lineHeight: 1.2 }}>{p.snd}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Обратный отсчёт, пока ученик думает.
export const Countdown = ({ from, dur, top = 520 }) => {
  const f = useCurrentFrame();
  if (f < from || f >= from + dur) return null;
  const t = (f - from) / dur;
  const R = 70;
  const L = 2 * Math.PI * R;
  return (
    <div style={{ position: 'absolute', right: 60, top, width: 180, height: 180 }}>
      <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="90" cy="90" r={R} fill={C.card} stroke={C.line} strokeWidth="16" />
        <circle cx="90" cy="90" r={R} fill="none" stroke={C.brand} strokeWidth="16" strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * t} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 92, fontWeight: 900, color: C.brandDark }}>
        {Math.max(1, Math.ceil((dur - (f - from)) / 30))}
      </div>
    </div>
  );
};
