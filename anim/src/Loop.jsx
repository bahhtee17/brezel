import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';

// Рисованная мультипликация «по-старому»:
// 1) кадры-позы сменяют друг друга (hold кадров на позу),
// 2) линия «кипит» — каждые boilEvery кадров меняется шум, контуры чуть дрожат,
// 3) лёгкое движение всей картинки (motion), если позы одна.
// Все периоды — делители длины ролика, поэтому видео зацикливается без шва.
const TAU = Math.PI * 2;

function motionStyle(motion, f, dur) {
  const t = f / dur; // 0..1 за весь ролик
  switch (motion) {
    case 'bounce': {
      const s = Math.abs(Math.sin(TAU * t * 2));
      return `translateY(${(-s * 14).toFixed(2)}px) scale(${(1 + (1 - s) * 0.015).toFixed(4)}, ${(1 - (1 - s) * 0.015).toFixed(4)})`;
    }
    case 'sway': return `rotate(${(Math.sin(TAU * t) * 2.2).toFixed(3)}deg)`;
    case 'nod': return `translateY(${(Math.sin(TAU * t * 4) * 5).toFixed(2)}px)`;
    case 'shake': return `translateX(${(Math.sin(TAU * t * 4) * 7).toFixed(2)}px)`;
    case 'pulse': return `scale(${(1 + Math.sin(TAU * t * 2) * 0.035).toFixed(4)})`;
    default: return 'none';
  }
}

export const Loop = ({ frames, hold = 6, boilEvery = 3, boil = 2.4, motion = 'none' }) => {
  const f = useCurrentFrame();
  const dur = 48;
  const pose = Math.floor(f / hold) % frames.length;
  const seed = (Math.floor(f / boilEvery) % 4) + 1;
  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <filter id={`boil${seed}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed={seed} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={boil} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <AbsoluteFill style={{ transform: motionStyle(motion, f, dur) }}>
        <Img
          src={staticFile(frames[pose])}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.06)', filter: `url(#boil${seed})` }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
