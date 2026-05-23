import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const emotionConfig = {
  joy:      { color: 'var(--fixer)',     rot: '1.5deg'  },
  fear:     { color: 'var(--stamp-red)', rot: '-2deg'   },
  anger:    { color: 'var(--stamp-red)', rot: '3deg'    },
  sadness:  { color: 'var(--stamp-blue)',rot: '-3deg'   },
  surprise: { color: 'var(--fixer)',     rot: '2deg'    },
  disgust:  { color: '#5c3a1a',          rot: '-1.5deg' },
  neutral:  { color: 'var(--silver)',    rot: '0.5deg'  },
  calm:     { color: '#2a4a2a',          rot: '-1deg'   },
  anxiety:  { color: '#5c3a1a',          rot: '2.5deg'  },
  confusion:{ color: 'var(--silver)',    rot: '-2.5deg' },
  wonder:   { color: 'var(--fixer)',     rot: '1deg'    },
};

const EmotionStamp = ({ emotion = 'neutral', delay = 0.8, size = 'md' }) => {
  const cfg = emotionConfig[emotion.toLowerCase()] || emotionConfig.neutral;
  const sizeMap = {
    sm: { fontSize: '0.6rem', padding: '2px 6px', borderWidth: '2px' },
    md: { fontSize: '0.65rem', padding: '3px 10px', borderWidth: '3px' },
    lg: { fontSize: '0.75rem', padding: '5px 14px', borderWidth: '3px' },
  };
  const s = sizeMap[size] || sizeMap.md;

  return (
    <motion.span
      initial={{ scale: 3, rotate: '-8deg', opacity: 0 }}
      animate={{ scale: 1, rotate: cfg.rot, opacity: 0.85 }}
      transition={{ duration: 0.4, delay, ease: [0.175, 0.885, 0.32, 1.275] }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `${s.borderWidth} solid ${cfg.color}`,
        borderRadius: '2px',
        padding: s.padding,
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: s.fontSize,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: cfg.color,
        boxShadow: `inset 0 0 0 1px ${cfg.color}`,
        rotate: cfg.rot,
      }}
    >
      {emotion}
    </motion.span>
  );
};

export default EmotionStamp;
