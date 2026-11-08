import React from 'react';
import { Composition } from 'remotion';
import { Loop } from './Loop.jsx';
import list from '../animations.json';

// Одна композиция на каждую анимацию из animations.json: 2 секунды, 24 кадра/с, 480×480.
export const Root = () => (
  <>
    {list.map(a => (
      <Composition
        key={a.key}
        id={a.key}
        component={Loop}
        durationInFrames={48}
        fps={24}
        width={480}
        height={480}
        defaultProps={{ frames: a.frames, hold: a.hold ?? 6, motion: a.motion ?? 'none', boil: a.boil ?? 2.4 }}
      />
    ))}
  </>
);
