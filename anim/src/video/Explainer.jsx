// Шаблон видео-объяснения. Один стиль для всех роликов: кремовая «бумага», шрифт Nunito,
// цвета приложения, учитель Брецель внизу слева, субтитры внизу, сцены из готовых блоков
// (scenes-a.jsx — чтение, scenes-b.jsx — уроки, kit.jsx — общие детали).
// Данные приходят из anim/render-video.mjs: timeline = { duration, kicker, title, chips, scenes[] },
// у сцены — from/dur (кадры) и реплики segs[] с from/dur, звуком и субтитром.
import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { C, fontFamily, boil, rich } from './kit.jsx';
import { TitleScene, ImageScene, RuleScene, WordScene, QuizScene, PhraseScene, MnemonicScene, RecapScene, OutroScene } from './scenes-a.jsx';
import { ListScene, DialogScene, TableScene, OrderScene, FormScene, TipScene, CompareScene, AskScene } from './scenes-b.jsx';

const SCENES = {
  title: TitleScene, image: ImageScene, rule: RuleScene, word: WordScene, quiz: QuizScene, phrase: PhraseScene, mnemonic: MnemonicScene,
  recap: RecapScene, outro: OutroScene, list: ListScene, dialog: DialogScene, table: TableScene, order: OrderScene, form: FormScene,
  tip: TipScene, compare: CompareScene, ask: AskScene
};

// Бумага — готовая картинка (раньше фильтр SVG считался на каждом кадре и тормозил рендер).
const Paper = () => <AbsoluteFill><Img src={staticFile('paper.jpg')} style={{ width: '100%', height: '100%' }} /></AbsoluteFill>;

// Вход и выход сцены: всплывает снизу, уходит вверх.
const SceneWrap = ({ dur, children }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inn = spring({ frame: f, fps, config: { damping: 14, mass: 0.8 } });
  const out = interpolate(f, [dur - 9, dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic) });
  return <AbsoluteFill style={{ opacity: Math.min(inn * 1.3, 1) * (1 - out), transform: `translateY(${(1 - inn) * 70 - out * 50}px)` }}>{children}</AbsoluteFill>;
};

const TopBar = ({ tl }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: 'absolute', left: 60, right: 60, top: 70 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 34, fontWeight: 900, color: C.ink3, marginBottom: 16 }}>
        <span style={{ letterSpacing: 3, textTransform: 'uppercase' }}>Брецель · {tl.kicker}</span>
      </div>
      <div style={{ height: 16, borderRadius: 8, background: C.line, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(f / tl.duration) * 100}%`, background: C.ok, borderRadius: 8 }} />
      </div>
    </div>
  );
};

const segAt = (tl, f) => {
  const sc = tl.scenes.find(x => f >= x.from && f < x.from + x.dur);
  if (!sc) return { sc: null, seg: null };
  let seg = null;
  for (const x of sc.segs) if (f >= x.from) seg = x;
  return { sc, seg };
};

const Teacher = ({ tl }) => {
  const f = useCurrentFrame();
  const { sc, seg } = segAt(tl, f);
  if (!sc || !sc.teacher) return null;
  const t = f - sc.from;
  const i = tl.scenes.indexOf(sc);
  const prev = tl.scenes[i - 1], next = tl.scenes[i + 1];
  const inn = prev?.teacher ? 1 : spring({ frame: t, fps: 30, config: { damping: 12 } });
  const out = next?.teacher ? 0 : interpolate(t, [sc.dur - 10, sc.dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const speaking = seg && seg.kind === 'ru' && f < seg.from + seg.dur;
  const env = speaking && seg.env ? seg.env[Math.min(seg.env.length - 1, f - seg.from)] || 0 : 0;
  const pose = speaking ? 'teacher-talk' : 'teacher-point';
  return (
    <div style={{ position: 'absolute', left: 20, bottom: 300, width: 330, transform: `translateY(${(1 - inn) * 420 + out * 420}px)` }}>
      <Img src={staticFile(`cut/${pose}.png`)} style={{ width: '100%', transformOrigin: '50% 100%',
        transform: `scale(${1 + env * 0.05}, ${1 - env * 0.03 + 0.02 * Math.sin(f / 10)}) rotate(${boil(f) + (speaking ? Math.sin(f / 6) * 1.5 : 0)}deg)` }} />
    </div>
  );
};

const Captions = ({ tl }) => {
  const f = useCurrentFrame();
  const { sc, seg } = segAt(tl, f);
  if (!seg || seg.kind === 'pause' || !seg.cap) return null;
  if (sc.type === 'dialog' && seg.kind === 'de') return null; // реплика уже видна в пузыре
  const t = f - seg.from;
  const o = interpolate(t, [0, 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const de = seg.kind === 'de';
  return (
    <div style={{ position: 'absolute', left: 60, right: 60, bottom: 90, display: 'flex', justifyContent: 'center', opacity: o, transform: `translateY(${(1 - o) * 16}px)` }}>
      <div style={{ background: 'rgba(255,255,255,0.94)', border: `5px solid ${C.line}`, borderRadius: 40, padding: '26px 40px', textAlign: 'center',
        fontSize: de ? (seg.cap.length > 26 ? 50 : 64) : 46, fontWeight: 800, color: C.ink, lineHeight: 1.3, boxShadow: `0 8px 0 ${C.line}` }}>
        {de ? (
          <span style={{ color: C.brandDark, fontWeight: 900, display: 'inline-flex', alignItems: 'center', gap: 18 }}>
            <svg width="60" height="60" viewBox="0 0 24 24"><path d="M4 9h3l5-4v14l-5-4H4z" fill={C.skyDark} /><path d="M16 8.5a5 5 0 0 1 0 7M18.8 6a8.5 8.5 0 0 1 0 12" fill="none" stroke={C.skyDark} strokeWidth="2.4" strokeLinecap="round" /></svg>
            {seg.cap}
          </span>
        ) : rich(seg.cap)}
      </div>
    </div>
  );
};

export const Explainer = ({ timeline: tl }) => {
  if (!tl) return <AbsoluteFill style={{ background: C.bg }} />;
  return (
    <AbsoluteFill style={{ fontFamily, background: C.bg }}>
      <Paper />
      {tl.scenes.map((s, i) => {
        const Comp = SCENES[s.type];
        return (
          <Sequence key={i} from={s.from} durationInFrames={s.dur}>
            <SceneWrap dur={s.dur}>{Comp ? <Comp s={s} tl={tl} /> : null}</SceneWrap>
          </Sequence>
        );
      })}
      {tl.scenes.flatMap(s => s.segs.filter(x => x.src).map((x, k) => (
        <Sequence key={`${s.from}-${k}`} from={x.from} durationInFrames={x.dur + 2}>
          <Audio src={staticFile(x.src)} />
        </Sequence>
      )))}
      <TopBar tl={tl} />
      <Teacher tl={tl} />
      <Captions tl={tl} />
    </AbsoluteFill>
  );
};
