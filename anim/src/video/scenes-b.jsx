// Сцены роликов, часть 2 (уроки): список слов, диалог, таблица, порядок слов, анкета,
// подсказка, сравнение, «ответьте сами».
import React from 'react';
import { Img, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, clamp, usePop, em, fitSize, at, hasPic, isLatin, rich, Stage, Fade, Pop, Tile, Pill, Thumb, Pic, Countdown } from './kit.jsx';
import { txt } from './scenes-a.jsx';

// Какой пункт сейчас «звучит»: последний, чья реплика уже началась.
const activeOf = (s, items, f) => {
  let k = -1;
  items.forEach((it, i) => { if (it.at != null && f >= at(s, it.at)) k = i; });
  return k;
};
const Head = ({ s, top }) => (
  <>
    {s.pill ? <Fade from={0}><Pill>{s.pill}</Pill></Fade> : null}
    {s.title ? <Fade from={0}><div style={txt(fitSize(s.title, 940, [80, 72, 64, 56]), C.ink, { marginTop: s.pill ? 26 : 0, padding: '0 60px' })}>{s.title}</div></Fade> : null}
    <div style={{ height: top }} />
  </>
);

export const ListScene = ({ s }) => {
  const f = useCurrentFrame();
  const compact = s.rows.length >= 5;
  const h = compact ? 150 : 176, th = compact ? 116 : 140;
  const k = activeOf(s, s.rows, f);
  return (
    <Stage top={s.title || s.pill ? 200 : 230}>
      <Head s={s} top={compact ? 30 : 46} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 16 : 22 }}>
        {s.rows.map((r, i) => {
          const on = i === k;
          const pic = hasPic(r);
          const lim = 900 - (pic ? th + 40 : 0) - 60;
          return (
            <Pop key={i} from={r.at != null ? at(s, r.at) : 4 + i * 6}>
              <div style={{ width: 940, height: h, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 34, padding: `0 ${compact ? 22 : 26}px`,
                background: on ? C.brandLight : C.card, border: `6px solid ${on ? C.brand : C.line}`, borderBottomWidth: 14, borderRadius: 44,
                transform: `scale(${on ? 1.03 : 1})` }}>
                {pic ? <Thumb it={r} size={th} /> : null}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <div style={txt(fitSize(r.de, lim, compact ? [58, 52, 46, 40] : [66, 58, 52, 46, 40]), C.brandDark, { textAlign: 'left', whiteSpace: 'nowrap' })}>{r.de}</div>
                  <div style={txt(fitSize(r.ru, lim, compact ? [40, 36] : [44, 40, 36]), C.ink2, { textAlign: 'left', fontWeight: 800, whiteSpace: 'nowrap' })}>{r.ru}</div>
                </div>
              </div>
            </Pop>
          );
        })}
      </div>
    </Stage>
  );
};

// Высота реплики при масштабе 1: подпись, строки немецкого текста, перевод.
const lineH = l => 30 + 40 + Math.ceil(em(l.de) * 54 / 600) * 66 + (l.ru ? Math.ceil(em(l.ru) * 38 / 600) * 50 : 0) + 40;
export const DialogScene = ({ s }) => {
  const f = useCurrentFrame();
  const total = s.lines.reduce((a, l) => a + Math.max(150, lineH(l)) + 26, 0);
  const k = [1, 0.9, 0.8, 0.7].find(z => total * z <= 1380) ?? 0.65;
  const seg = s.segs.find(x => f >= x.rf && f < x.rf + x.dur);
  return (
    <Stage top={s.pill === false ? 200 : 190}>
      {s.pill !== false ? <Fade from={0}><Pill>{s.pill || 'Диалог'}</Pill></Fade> : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 * k, marginTop: 40, width: 980 }}>
        {s.lines.map((l, i) => {
          const t0 = at(s, l.at);
          const speaking = seg && seg.rf === t0;
          const right = l.side === 'r';
          return (
            <Pop key={i} from={t0} style={{ alignSelf: right ? 'flex-end' : 'flex-start', transformOrigin: right ? '100% 50%' : '0% 50%' }}>
              <div style={{ display: 'flex', flexDirection: right ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 20 * k }}>
                <div style={{ width: 130 * k, height: 130 * k, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: `6px solid ${speaking ? C.sky : C.line}`, background: C.card }}>
                  <Img src={staticFile(`ava/${l.who}.jpg`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ maxWidth: 720 * k, padding: `${18 * k}px ${30 * k}px`, borderRadius: 40 * k, background: right ? C.brandLight : C.card,
                  border: `6px solid ${speaking ? C.sky : C.line}`, borderBottomWidth: 12 }}>
                  <div style={{ fontSize: 30 * k, fontWeight: 900, color: C.ink3 }}>{l.name || ''}</div>
                  <div style={{ fontSize: 54 * k, fontWeight: 900, color: C.ink, lineHeight: 1.2 }}>{l.de}</div>
                  {l.ru ? <div style={{ fontSize: 38 * k, fontWeight: 800, color: C.ink2, lineHeight: 1.3, marginTop: 4 }}>{l.ru}</div> : null}
                </div>
              </div>
            </Pop>
          );
        })}
      </div>
    </Stage>
  );
};

// «wohn{e}» — окончание в фигурных скобках подсвечивается.
const cell = (t, size) => String(t).split(/(\{[^}]+\})/).map((x, i) => x.startsWith('{')
  ? <span key={i} style={{ color: C.skyDark, backgroundImage: `linear-gradient(transparent 60%, ${C.marker} 60%)` }}>{x.slice(1, -1)}</span>
  : <span key={i}>{x}</span>);
const plain = t => String(t).replace(/[{}]/g, '');
export const TableScene = ({ s }) => {
  const f = useCurrentFrame();
  const n = (s.head || s.rows[0].cells).length;
  const ws = s.widths || Array(n).fill(1);
  const sum = ws.reduce((a, b) => a + b, 0);
  const W = 980 - 28;
  const colW = ws.map(w => W * w / sum - 16);
  const size = [72, 64, 58, 52, 46, 42, 38].find(z => s.rows.every(r => r.cells.every((c, j) => em(plain(c)) * z * 0.94 <= colW[j]))) ?? 34;
  const rowH = s.rows.length <= 4 ? 130 : 108;
  const k = activeOf(s, s.rows, f);
  return (
    <Stage top={200}>
      <Head s={s} top={40} />
      <div style={{ width: 980, background: C.card, borderRadius: 44, border: `6px solid ${C.line}`, borderBottomWidth: 14, padding: '16px 8px', boxSizing: 'border-box' }}>
        {s.head ? (
          <div style={{ display: 'flex', height: 80, alignItems: 'center', borderBottom: `4px dashed ${C.line}` }}>
            {s.head.map((h, j) => <div key={j} style={{ width: colW[j] + 16, ...txt(40, C.ink3) }}>{h}</div>)}
          </div>
        ) : null}
        {s.rows.map((r, i) => {
          const t0 = r.at != null ? at(s, r.at) : 4 + i * 6;
          const o = clamp(f, t0, t0 + 10);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', minHeight: rowH, marginTop: 12, borderRadius: 30, opacity: o,
              transform: `translateX(${(1 - o) * 60}px)`, background: i === k ? C.skyLight : 'transparent' }}>
              {r.cells.map((c, j) => (
                <div key={j} style={{ width: colW[j] + 16, ...txt(size, isLatin(c) ? C.brandDark : C.ink2, { fontWeight: isLatin(c) ? 900 : 800, whiteSpace: 'nowrap' }) }}>{cell(c)}</div>
              ))}
            </div>
          );
        })}
      </div>
      {s.note ? (
        <Fade from={at(s, s.noteAt ?? s.segs.length - 1)}>
          <div style={txt(50, C.ink2, { fontWeight: 800, lineHeight: 1.25, marginTop: 40, padding: '0 80px' })}>{rich(s.note)}</div>
        </Fade>
      ) : null}
    </Stage>
  );
};

export const OrderScene = ({ s }) => {
  const f = useCurrentFrame();
  const n = Math.max(...s.rows.map(r => r.tiles.length));
  // Ширина колонки — по самой длинной плитке в ней, остаток делим поровну.
  const colEm = Array.from({ length: n }, (_, j) => Math.max(1.4, ...s.rows.map(r => em((r.tiles[j] || '').replace(/^\*/, '')) + 0.9)));
  const room = 980 - (n - 1) * 20;
  const size = [80, 72, 64, 56, 48, 42].find(z => colEm.reduce((a, e) => a + e * z, 0) <= room) ?? 38;
  const spare = (room - colEm.reduce((a, e) => a + e * size, 0)) / n;
  const colWs = colEm.map(e => Math.floor(e * size + spare));
  return (
    <Stage top={200}>
      <Head s={s} top={40} />
      <div style={{ display: 'flex', gap: 20 }}>
        {Array.from({ length: n }, (_, j) => (
          <div key={j} style={{ width: colWs[j], display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 76, height: 76, borderRadius: '50%', background: C.brand, color: '#fff', ...txt(46, '#fff'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{j + 1}</div>
            {s.head?.[j] ? <div style={txt(34, C.ink3)}>{s.head[j]}</div> : null}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 30, marginTop: 34 }}>
        {s.rows.map((r, i) => {
          const t0 = r.at != null ? at(s, r.at) : 4 + i * 10;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 20 }}>
                {r.tiles.map((t, j) => {
                  const verb = t.startsWith('*');
                  const pulse = verb && f > t0 + 20 ? 1 + 0.05 * Math.max(0, Math.sin((f - t0) / 5)) : 1;
                  return (
                    <Pop key={j} from={t0 + j * 5}>
                      <div style={{ transform: `scale(${pulse})` }}>
                        <Tile size={size} tone={verb ? 'sky' : 'brand'} style={{ width: colWs[j], minWidth: 0 }}>{t.replace(/^\*/, '')}</Tile>
                      </div>
                    </Pop>
                  );
                })}
              </div>
              {r.ru ? <Fade from={t0 + 16}><div style={txt(42, C.ink2, { fontWeight: 800 })}>{r.ru}</div></Fade> : null}
            </div>
          );
        })}
      </div>
    </Stage>
  );
};

export const FormScene = ({ s }) => {
  const f = useCurrentFrame();
  return (
    <Stage top={220}>
      <Pop from={0}>
        <div style={{ width: 880, background: C.card, borderRadius: 40, border: `6px solid ${C.line}`, borderBottomWidth: 16, overflow: 'hidden', transform: 'rotate(-1deg)' }}>
          <div style={{ background: C.brand, padding: '22px 40px', ...txt(54, '#fff', { textAlign: 'left', letterSpacing: 2 }) }}>{s.title || 'Formular'}</div>
          <div style={{ padding: '20px 44px 36px', display: 'flex', flexDirection: 'column', gap: 26 }}>
            {s.fields.map((x, i) => {
              const t0 = x.at != null ? at(s, x.at) : 10 + i * 20;
              const typed = Math.floor(clamp(f, t0 + 6, t0 + 6 + x.val.length * 2, 0, x.val.length));
              const cursor = f >= t0 && typed < x.val.length && Math.floor(f / 8) % 2 === 0;
              return (
                <div key={i}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
                    <span style={txt(44, C.ink, { textAlign: 'left' })}>{x.de}</span>
                    <span style={txt(34, C.ink3, { textAlign: 'left', fontWeight: 800 })}>{x.ru}</span>
                  </div>
                  <div style={{ height: 84, borderBottom: `5px dotted ${C.ink3}`, display: 'flex', alignItems: 'flex-end', paddingBottom: 6 }}>
                    <span style={txt(fitSize(x.val, 760, [64, 56, 48]), C.brandDark, { textAlign: 'left' })}>{x.val.slice(0, typed)}</span>
                    {cursor ? <span style={{ width: 6, height: 64, background: C.sky, marginLeft: 4 }} /> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Pop>
    </Stage>
  );
};

const Bulb = () => (
  <svg width="96" height="96" viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" fill="#FFD447" stroke={C.ink} strokeWidth="1.4" />
    <rect x="8.5" y="18" width="7" height="2.2" rx="1" fill={C.ink3} /><rect x="9.5" y="20.8" width="5" height="1.6" rx="0.8" fill={C.ink3} /></svg>
);
export const TipScene = ({ s }) => {
  const f = useCurrentFrame();
  return (
    <Stage top={300}>
      <Pop from={0}>
        <div style={{ width: 900, boxSizing: 'border-box', background: '#FFF4C7', borderRadius: 48, border: '6px solid #F1D98A', borderBottomWidth: 16, padding: '40px 50px 50px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26, transform: `rotate(${Math.sin(f / 30) * 0.6}deg)` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}><Bulb /><span style={txt(fitSize(s.label || 'Подсказка', 640, [50, 44, 40]), C.brandDark)}>{s.label || 'Подсказка'}</span></div>
          {s.big ? <div style={txt(fitSize(s.big, 780, [110, 96, 84, 72, 62, 54]), C.ink, { whiteSpace: 'nowrap' })}>{rich(s.big)}</div> : null}
          {s.text ? <Fade from={at(s, Math.min(1, s.segs.length - 1))}><div style={txt(52, C.ink2, { fontWeight: 800, lineHeight: 1.3 })}>{rich(s.text)}</div></Fade> : null}
          {(s.lines || []).map((l, i) => (
            <Fade key={i} from={l.at != null ? at(s, l.at) : 6 + i * 10}><div style={txt(52, C.ink2, { fontWeight: 800, lineHeight: 1.3 })}>{rich(l.text)}</div></Fade>
          ))}
        </div>
      </Pop>
    </Stage>
  );
};

export const CompareScene = ({ s }) => {
  const f = useCurrentFrame();
  const k = activeOf(s, s.cards, f);
  return (
    <Stage top={220}>
      <Head s={s} top={60} />
      <div style={{ display: 'flex', gap: 40 }}>
        {s.cards.map((c, i) => {
          const on = i === k;
          return (
            <Pop key={i} from={c.at != null ? at(s, c.at) : 4 + i * 8}>
              <div style={{ width: 450, boxSizing: 'border-box', padding: '34px 24px 40px', borderRadius: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
                background: on ? C.brandLight : C.card, border: `6px solid ${on ? C.brand : C.line}`, borderBottomWidth: 16, transform: `scale(${on ? 1.03 : 1})` }}>
                {hasPic(c) ? <Thumb it={c} size={260} /> : null}
                <div style={txt(Math.min(...c.big.split(' ').map(w => fitSize(w, 390, [120, 100, 84, 70, 58, 50]))), C.brandDark)}>{c.big}</div>
                {c.snd ? <div style={txt(fitSize(`[${c.snd}]`, 390, [70, 60, 50]), C.skyDark)}>[{c.snd}]</div> : null}
                {c.text ? <div style={txt(42, C.ink2, { fontWeight: 800, lineHeight: 1.25 })}>{rich(c.text)}</div> : null}
              </div>
            </Pop>
          );
        })}
      </div>
    </Stage>
  );
};

export const AskScene = ({ s }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const deIdx = s.segs.findIndex(x => x.kind === 'de');
  const pIdx = s.segs.findIndex(x => x.kind === 'pause');
  const t0 = at(s, deIdx);
  const g = spring({ frame: f - t0, fps, config: { damping: 11 } });
  const pic = hasPic(s);
  return (
    <Stage top={200}>
      <Fade from={0}><Pill tone="brand">Ваша очередь!</Pill></Fade>
      {pic ? <div style={{ marginTop: 40 }}><Pic it={s} size={400} delay={2} /></div> : null}
      <Fade from={4}><div style={txt(fitSize(s.q, 1800, [76, 68, 60]), C.ink, { marginTop: 40, padding: '0 70px', lineHeight: 1.15 })}>{rich(s.q)}</div></Fade>
      {pIdx >= 0 ? <Countdown from={at(s, pIdx)} dur={s.segs[pIdx].dur} top={pic ? 300 : 520} /> : null}
      <div style={{ position: 'relative', marginTop: 50, minHeight: 170, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {f < t0 ? (
          <div style={{ width: 600, height: 150, borderRadius: 40, border: `6px dashed ${C.ink3}`, ...txt(96, C.ink3), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>?</div>
        ) : (
          <div style={{ transform: `scale(${g})` }}><Tile tone="ok" size={fitSize(s.de, 820, [84, 74, 64, 56, 48])}>{s.de}</Tile></div>
        )}
      </div>
      {s.tr ? <Fade from={t0 + 14}><div style={txt(fitSize(`[${s.tr}]`, 940, [64, 56, 48]), C.skyDark, { marginTop: 16 })}>[{s.tr}]</div></Fade> : null}
    </Stage>
  );
};
