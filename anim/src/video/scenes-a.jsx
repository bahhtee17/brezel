// Сцены роликов, часть 1: заставка, картинка, правило, слово / «ваша очередь», фраза,
// мнемоника, повторение, финал. Все размеры подгоняются под текст (см. kit.jsx).
import React from 'react';
import { Img, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, clamp, boil, usePop, em, fitSize, at, parts, hasPic, rich, Stage, Fade, Pop, Tile, Pill, Pic, splitSize, SplitWord, Countdown } from './kit.jsx';

export const txt = (size, color = C.ink, more) => ({ fontSize: size, fontWeight: 900, color, lineHeight: 1.1, textAlign: 'center', ...more });
const FRAME = { overflow: 'hidden', border: `8px solid ${C.card}`, boxShadow: `0 14px 0 ${C.line}, 0 0 0 4px ${C.line}` };

export const TitleScene = ({ s, tl }) => {
  const f = useCurrentFrame();
  const m = usePop(0, { damping: 9, mass: 0.8 });
  const chips = tl.chips || [];
  const size = Math.min(124, 960 / Math.max(...tl.title.split(/\s+/).map(w => em(w))));
  const n = chips.join('').length;
  return (
    <Stage top={230}>
      <Img src={staticFile('cut/mascot-wave.png')} style={{ width: 560, transform: `scale(${m}) rotate(${Math.sin(f / 9) * 4 + boil(f)}deg)`, transformOrigin: '50% 90%' }} />
      <Fade from={6}><div style={txt(46, C.skyDark, { letterSpacing: 6, textTransform: 'uppercase', marginTop: 30 })}>{tl.kicker}</div></Fade>
      <Fade from={10}><div style={txt(size, C.ink, { lineHeight: 1.04, padding: '10px 60px 0' })}>{tl.title}</div></Fade>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 24, marginTop: 50, maxWidth: 960 }}>
        {chips.map((c, i) => <Pop key={i} from={at(s, 1) + i * 6}><Tile size={n <= 10 ? 80 : n <= 16 ? 64 : 52}>{c}</Tile></Pop>)}
      </div>
    </Stage>
  );
};

export const ImageScene = ({ s }) => {
  const f = useCurrentFrame();
  const p = usePop(4, { damping: 10, mass: 0.9 });
  const sw = s.sub ? 880 : 940;
  return (
    <Stage top={220}>
      <Fade from={0}><div style={txt(em(s.caption) * 96 > 1800 ? 80 : 96, C.ink, { lineHeight: 1.05, padding: '0 70px' })}>{s.caption}</div></Fade>
      {s.art ? <Img src={staticFile(`cut/${s.art}.png`)} style={{ maxWidth: 800, maxHeight: 700, marginTop: 40,
        transform: `scale(${p}) translateY(${Math.sin(f / 12) * 14}px) rotate(${boil(f)}deg)` }} /> : null}
      {s.scene ? (
        <div style={{ ...FRAME, width: sw, height: sw * 2 / 3, marginTop: 50, borderRadius: 48, transform: `scale(${p}) rotate(${boil(f) * 0.4}deg)` }}>
          <Img src={staticFile(`scene/${s.scene}.jpg`)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1 + 0.06 * f / s.dur})` }} />
        </div>
      ) : null}
      {s.img ? <div style={{ marginTop: 50 }}><Pic it={{ img: s.img }} size={620} delay={4} /></div> : null}
      {s.sub ? (
        <Fade from={at(s, s.subAt ?? Math.min(1, s.segs.length - 1))}>
          <div style={txt(56, C.ink2, { fontWeight: 800, lineHeight: 1.2, padding: '0 70px', marginTop: 40 })}>{rich(s.sub)}</div>
        </Fade>
      ) : null}
    </Stage>
  );
};

const tileW = (t, z) => Math.max(z * 1.25, em(t) * z + z * 0.4 + 14);
export const RuleScene = ({ s }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const l = usePop(at(s, 0) + 2);
  const r = usePop(s.segs[1] ? at(s, 1) + 2 : at(s, 0) + 24);
  const trapAt = s.trap ? at(s, s.trap.at) : 9999;
  const pulse = f > trapAt ? 1 + 0.06 * Math.max(0, Math.sin((f - trapAt) / 4)) * clamp(f, trapAt, trapAt + 40, 1, 0) : 1;
  const right = s.plain ? s.snd : `[${s.snd}]`;
  // В ряд, если обе плитки и стрелка помещаются по ширине; иначе — столбиком, стрелка вниз.
  const row = [200, 180, 160, 140, 120].find(z => tileW(s.big, z) + tileW(right, z) + 170 <= 980);
  const size = row || ([150, 130, 110, 96].find(z => Math.max(tileW(s.big, z), tileW(right, z)) <= 900) ?? 84);
  const pill = s.pill || (s.n ? `Пара ${s.n} из 4` : null);
  return (
    <Stage top={s.trap ? 330 : row ? 420 : 340}>
      {pill ? <Fade from={0}><Pill>{pill}</Pill></Fade> : null}
      <div style={{ display: 'flex', flexDirection: row ? 'row' : 'column', alignItems: 'center', gap: row ? 34 : 10, marginTop: row ? 90 : 60 }}>
        <div style={{ transform: `scale(${l})` }}><Tile size={size}>{s.big}</Tile></div>
        <div style={{ fontSize: 110, lineHeight: 1, color: C.ink3, fontWeight: 900, opacity: r }}>{row ? '→' : '↓'}</div>
        <div style={{ transform: `scale(${r * pulse})` }}><Tile size={size} tone="sky">{right}</Tile></div>
      </div>
      {s.trap ? (
        <div style={{ display: 'flex', gap: 30, marginTop: row ? 110 : 70 }}>
          {s.trap.wrong.map((w, i) => {
            const p = spring({ frame: f - trapAt - i * 8, fps, config: { damping: 12 } });
            return (
              <div key={i} style={{ position: 'relative', transform: `scale(${p})` }}>
                <Tile size={90} tone="bad">[{w}]</Tile>
                <div style={{ position: 'absolute', left: '8%', top: '48%', height: 14, borderRadius: 7, background: C.badDark,
                  width: `${84 * clamp(f, trapAt + 12 + i * 8, trapAt + 24 + i * 8)}%`, transform: 'rotate(-12deg)' }} />
              </div>
            );
          })}
        </div>
      ) : null}
      {s.note ? (
        <Fade from={at(s, s.noteAt ?? s.segs.length - 1)}>
          <div style={txt(52, C.ink2, { fontWeight: 800, lineHeight: 1.2, marginTop: 70, padding: '0 80px' })}>{rich(s.note)}</div>
        </Fade>
      ) : null}
    </Stage>
  );
};

export const WordScene = ({ s, quiz = false }) => {
  const deIdx = s.segs.findIndex(x => x.kind === 'de');
  const pauseIdx = s.segs.findIndex(x => x.kind === 'pause');
  const splitAt = at(s, deIdx);
  const ps = parts(s);
  const pic = hasPic(s);
  const pill = quiz ? 'Ваша очередь!' : s.pill || (s.rule ? `${s.rule} = [${s.ruleSnd}]` : null);
  // С картинкой транскрипция и перевод опускаются ниже головы учителя, поэтому уходят в поле справа от него.
  const side = pic && s.teacher;
  const lim = side ? 660 : 940;
  const tr = s.tr ? `[${s.tr}]` : null;
  const ru = s.ru ? `«${s.ru}»` : null;
  return (
    <Stage top={pic ? (quiz ? 200 : 210) : 420}>
      {pill ? <Fade from={0}><Pill tone={quiz ? 'brand' : 'sky'}>{pill}</Pill></Fade> : null}
      {pic ? <div style={{ marginTop: 50 }}><Pic it={s} size={quiz ? 500 : 560} delay={2} /></div> : null}
      <div style={{ marginTop: 60, width: '100%' }}><SplitWord parts={ps} splitAt={splitAt} size={Math.min(splitSize(ps), quiz ? 140 : 150)} /></div>
      {quiz && pauseIdx >= 0 ? <Countdown from={at(s, pauseIdx)} dur={s.segs[pauseIdx].dur} /> : null}
      <div style={{ alignSelf: 'stretch', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingLeft: side ? 360 : 0, paddingRight: side ? 40 : 0 }}>
        {tr ? <Fade from={splitAt + 14}><div style={txt(fitSize(tr, lim, [100, 88, 76, 66, 58, 50]), C.skyDark, { marginTop: 10, whiteSpace: 'nowrap' })}>{tr}</div></Fade> : null}
        {ru ? <Fade from={at(s, s.segs.length - 1)}><div style={txt(fitSize(ru, lim, [66, 58, 50, 44]), C.ink2, { fontWeight: 800, marginTop: 8 })}>{ru}</div></Fade> : null}
      </div>
    </Stage>
  );
};
export const QuizScene = p => <WordScene {...p} quiz />;

export const PhraseScene = ({ s }) => {
  const f = useCurrentFrame();
  const k = s.segs.findIndex(x => x.kind === 'de');
  const seg = s.segs[k];
  const t0 = seg ? seg.rf : 9999;
  const sweep = seg ? clamp(f, t0, t0 + Math.max(12, seg.dur - 6)) : 0;
  const n = s.de.length;
  const i = s.mark ? s.de.indexOf(s.mark) : -1;
  const body = i < 0 ? s.de : <>{s.de.slice(0, i)}<span style={{ color: C.brandDark }}>{s.mark}</span>{s.de.slice(i + s.mark.length)}</>;
  const tr = s.tr ? `[${s.tr}]` : null;
  const ru = s.ru ? `«${s.ru}»` : null;
  return (
    <Stage top={s.img ? 210 : 400}>
      {s.pill ? <Fade from={0}><Pill>{s.pill}</Pill></Fade> : null}
      {s.img ? <div style={{ marginTop: 40 }}><Pic it={{ img: s.img }} size={440} delay={2} /></div> : null}
      <Fade from={2} style={{ marginTop: 50, maxWidth: 940 }}>
        <div style={txt(n <= 12 ? 120 : n <= 20 ? 100 : n <= 32 ? 84 : 70, C.ink, { lineHeight: 1.2 })}>
          <span style={{ backgroundImage: `linear-gradient(transparent 62%, ${C.marker} 62%)`, backgroundRepeat: 'no-repeat', backgroundSize: `${sweep * 100}% 100%` }}>{body}</span>
        </div>
      </Fade>
      {tr ? <Fade from={t0 + 14}><div style={txt(fitSize(tr, 940, [72, 64, 56, 48]), C.skyDark, { marginTop: 18 })}>{tr}</div></Fade> : null}
      {ru ? <Fade from={s.segs[k + 1] ? at(s, k + 1) : t0 + 24}><div style={txt(fitSize(ru, 940, [64, 56, 48, 42]), C.ink2, { fontWeight: 800, marginTop: 12 })}>{ru}</div></Fade> : null}
      {s.note ? (
        <Fade from={at(s, s.segs.length - 1)}>
          <div style={txt(48, C.ink2, { fontWeight: 800, lineHeight: 1.25, marginTop: 36, padding: '0 80px' })}>{rich(s.note)}</div>
        </Fade>
      ) : null}
    </Stage>
  );
};

const PAIRS = [{ big: 'ei', hi: 1, pill: 'i = «ай»', snd: 'ай', at: 1 }, { big: 'ie', hi: 1, pill: 'e = «и»', snd: 'и:', at: 2 }];
export const MnemonicScene = ({ s }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Stage top={230}>
      <Fade from={0}><div style={txt(84, C.ink, { lineHeight: 1.08, padding: '0 60px' })}>{s.title || 'Смотрим на вторую букву'}</div></Fade>
      <div style={{ display: 'flex', gap: 30, marginTop: 90 }}>
        {(s.cols || PAIRS).map((c, n) => {
          const t0 = at(s, c.at);
          const g = spring({ frame: f - t0, fps, config: { damping: 10 } });
          return (
            <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30, width: 440 }}>
              <div style={txt(210, C.ink, { lineHeight: 1 })}>
                {c.big.split('').map((ch, i) => (
                  <span key={i} style={{ display: 'inline-block', ...(i === c.hi && f >= t0 ? { color: C.skyDark, transform: `scale(${1 + 0.3 * g}) translateY(${-14 * g}px)` } : null) }}>{ch}</span>
                ))}
              </div>
              <div style={{ opacity: g, transform: `scale(${0.6 + 0.4 * g})` }}><Pill style={{ fontSize: 46 }}>{c.pill}</Pill></div>
              <div style={{ opacity: clamp(f, t0 + 30, t0 + 40) }}><Tile size={90} tone="sky">[{c.snd}]</Tile></div>
            </div>
          );
        })}
      </div>
    </Stage>
  );
};

export const RecapScene = ({ s }) => {
  const n = s.tiles.length;
  const cols = s.cols || (n <= 6 ? 2 : n <= 9 ? 3 : 4);
  const row = cols === 1;
  const big = cols === 2 && n <= 4;
  const gap = big ? 40 : 26;
  const w = row ? 900 : big ? 472 : cols === 2 ? 440 : Math.floor((960 - gap * (cols - 1)) / cols);
  const [fa, fb] = row ? [84, 64] : big ? [130, 80] : cols === 2 ? [100, 62] : cols === 3 ? [96, 58] : [84, 50];
  const when = s.tiles.map((t, i) => t[2] ?? i + 1);
  const fit = (t, z, lim) => fitSize(t, lim, [z, z * 0.86, z * 0.72, z * 0.6, z * 0.5]);
  return (
    <Stage top={230}>
      <Fade from={0}><div style={txt(100)}>{s.title || 'Повторим'}</div></Fade>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap, marginTop: big ? 70 : 56, width: cols * w + (cols - 1) * gap + 4 }}>
        {s.tiles.map(([a, b], i) => {
          const snd = s.brackets === false ? b : `[${b}]`;
          return (
            <Pop key={i} from={at(s, when[i]) + when.slice(0, i).filter(k => k === when[i]).length * 5}>
              <div style={{ width: w, boxSizing: 'border-box', display: 'flex', flexDirection: row ? 'row' : 'column', alignItems: 'center',
                justifyContent: row ? 'space-between' : 'center', gap: big ? 18 : 10, padding: row ? '22px 48px' : big ? '34px 30px' : '22px 14px',
                background: C.card, borderRadius: big ? 48 : 38, border: `6px solid ${C.line}`, borderBottomWidth: big ? 16 : 12 }}>
                <div style={txt(fit(a, fa, row ? 440 : w - 44), C.brandDark, { lineHeight: 1, whiteSpace: 'nowrap' })}>{a}</div>
                <div style={txt(fit(snd, fb, row ? 320 : w - 44), C.skyDark, { lineHeight: 1, whiteSpace: 'nowrap' })}>{snd}</div>
              </div>
            </Pop>
          );
        })}
      </div>
    </Stage>
  );
};

export const OutroScene = ({ s }) => {
  const f = useCurrentFrame();
  const m = usePop(0, { damping: 8 });
  const bye = usePop(at(s, s.segs.findIndex(x => x.kind === 'de')), { damping: 9 });
  return (
    <Stage top={240}>
      <div style={{ position: 'relative' }}>
        <Img src={staticFile('cut/mascot-happy.png')} style={{ width: 560, transform: `scale(${m}) translateY(${-Math.abs(Math.sin(f / 7)) * 30}px) rotate(${boil(f)}deg)` }} />
        <div style={{ position: 'absolute', right: -150, top: 20, transform: `scale(${bye})`, background: C.card, border: `6px solid ${C.line}`, borderRadius: 40,
          padding: '22px 36px', fontSize: fitSize(s.bubble || 'Tschüs!', 400, [76, 64, 56, 50]), fontWeight: 900, color: C.brandDark, whiteSpace: 'nowrap' }}>{s.bubble || 'Tschüs!'}</div>
      </div>
      <Fade from={6}><div style={txt(88, C.ink, { marginTop: 40, padding: '0 60px' })}>{s.text || 'Теперь — практика!'}</div></Fade>
      <Fade from={14}>
        <div style={{ marginTop: 60, transform: `scale(${1 + 0.04 * Math.sin(f / 5)})`, background: C.ok, color: '#fff', borderRadius: 40, padding: '38px 80px',
          fontSize: 64, fontWeight: 900, letterSpacing: 2, boxShadow: `0 16px 0 ${C.okDark}`, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{s.button || 'Проверить себя'}</div>
      </Fade>
    </Stage>
  );
};
