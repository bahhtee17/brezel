// Видео-объяснения курса «Брецель» (вертикальные 1080×1920). Сборка и рендер: anim/render-video.mjs
import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { Explainer } from './Explainer.jsx';

const Root = () => (
  <Composition
    id="Explainer"
    component={Explainer}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={300}
    defaultProps={{ timeline: null }}
    calculateMetadata={({ props }) => ({ durationInFrames: props.timeline?.duration || 300 })}
  />
);

registerRoot(Root);
