import React, { useId } from 'react';

/**
 * SVG coffee stain using feTurbulence + feDisplacementMap
 * to create an organic, irregular blob — not a geometric ring.
 *
 * The radial gradient creates the real "coffee ring effect":
 *   - transparent center (where liquid evaporated first)
 *   - dark concentrated rim (where particles accumulated at the drying edge)
 *   - soft outer fade (moisture that soaked into the paper)
 */
const CoffeeRing = ({ style = {}, size = 130, seed = 3, opacity = 1 }) => {
  // Unique IDs so multiple instances don't conflict
  const uid = Math.round(Math.random() * 100000);
  const filterId = `cf-distort-${uid}`;
  const gradId   = `cf-grad-${uid}`;
  const grad2Id  = `cf-grad2-${uid}`;

  return (
    <svg
      width={size}
      height={size * 0.88}
      viewBox="0 0 100 88"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        opacity,
        ...style,
      }}
    >
      <defs>
        {/* Organic distortion — makes it irregular like real liquid */}
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.035"
            numOctaves="4"
            seed={seed}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="11"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* Main stain gradient:
            transparent center → slight inner tint → dark rim → outer fade */}
        <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(140,88,28,0.00)" />
          <stop offset="48%"  stopColor="rgba(130,80,22,0.04)" />
          <stop offset="66%"  stopColor="rgba(115,70,18,0.15)" />
          <stop offset="75%"  stopColor="rgba(100,60,14,0.38)" />
          <stop offset="82%"  stopColor="rgba(88,52,12,0.62)"  />
          <stop offset="87%"  stopColor="rgba(75,44,10,0.70)"  />
          <stop offset="92%"  stopColor="rgba(62,36,8,0.45)"   />
          <stop offset="97%"  stopColor="rgba(50,28,6,0.18)"   />
          <stop offset="100%" stopColor="rgba(40,22,4,0.00)"   />
        </radialGradient>

        {/* Inner residue ring — faint dried coffee film inside the stain */}
        <radialGradient id={grad2Id} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(140,88,28,0.00)" />
          <stop offset="38%"  stopColor="rgba(130,80,22,0.00)" />
          <stop offset="55%"  stopColor="rgba(120,75,20,0.07)" />
          <stop offset="68%"  stopColor="rgba(110,68,18,0.10)" />
          <stop offset="80%"  stopColor="rgba(90,55,14,0.00)"  />
          <stop offset="100%" stopColor="rgba(70,40,10,0.00)"  />
        </radialGradient>
      </defs>

      {/* Main stain ellipse — distorted into organic blob */}
      <ellipse
        cx="50" cy="44"
        rx="43" ry="38"
        fill={`url(#${gradId})`}
        filter={`url(#${filterId})`}
      />

      {/* Inner residue — slightly smaller, same distortion */}
      <ellipse
        cx="50" cy="44"
        rx="43" ry="38"
        fill={`url(#${grad2Id})`}
        filter={`url(#${filterId})`}
      />
    </svg>
  );
};

export default CoffeeRing;
