import React from 'react';
import { imageService } from '../../services/imageService.js';

const STATE_IMG = {
  idle:      null,
  guiding:   imageService.mascotState('guiding'),
  happy:     imageService.mascotState('happy'),
  surprised: imageService.mascotState('surprised'),
  thinking:  imageService.mascotState('thinking'),
};

const STATE_CLASS = {
  idle:      'mascot-idle',
  guiding:   'mascot-guiding',
  happy:     'mascot-happy',
  surprised: 'mascot-surprised',
  thinking:  'mascot-thinking',
};

export default function MascotSprite({ imgUrl, state = 'idle', size = 80, style = {} }) {
  const src = STATE_IMG[state] || imgUrl;

  return (
    <img
      src={src}
      alt={`Guardián — estado ${state}`}
      className={STATE_CLASS[state] || STATE_CLASS.idle}
      onError={e => {
        if (e.currentTarget.src !== imgUrl) e.currentTarget.src = imgUrl;
      }}
      style={{ width: size, height: size, objectFit: 'contain', ...style }}
    />
  );
}
