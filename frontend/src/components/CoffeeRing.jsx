import React, { useId, useMemo } from 'react';

/**
 * SVG coffee stain — built to look like an actual aged coffee spill on paper,
 * not a tidy gradient blob.
 *
 * Layered anatomy (back-to-front):
 *   1. Main pool: distorted ellipse with a sharp dark rim
 *      (the real "coffee-ring effect" — particles accumulate at the drying edge)
 *   2. Off-center inner pool: asymmetric darker patch, as if the cup was tilted
 *   3. Two concentric tide lines: faint dried-coffee bands inside the rim
 *   4. Satellite splash droplets: small irregular blobs scattered around the rim
 *   5. Trailing drips: 1-2 elongated drops radiating outward
 *   6. Fine speckle spray: tiny backsplash particles
 *
 * All splash positions are deterministic per `seed`, so the same seed always
 * renders the same stain, but different seeds give visibly different splatters.
 *
 * Pass `splashes={false}` for the calm single-pool variant.
 */

// Deterministic PRNG so `seed` controls splash layout reproducibly.
const makeRand = (seed) => {
  let s = (seed * 9301 + 49297) | 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return ((s >>> 0) % 100000) / 100000;
  };
};

const CoffeeRing = ({
  style = {},
  size = 130,
  seed = 3,
  opacity = 1,
  splashes = true,
}) => {
  // SSR-stable unique IDs so multiple instances don't share filters/gradients.
  const reactId = useId();
  const base = `cf-${reactId.replace(/:/g, '')}`;
  const mainFilterId = `${base}-distort`;
  const dropFilterId = `${base}-distort-sm`;
  const rimId = `${base}-rim`;
  const poolId = `${base}-pool`;
  const tide1Id = `${base}-tide1`;
  const tide2Id = `${base}-tide2`;
  const dropRimId = `${base}-droprim`;

  const { droplets, drips, specks } = useMemo(() => {
    const rand = makeRand(seed);

    // Satellite splash droplets — small irregular blobs around the rim
    const droplets = [];
    const dropletCount = 6 + Math.floor(rand() * 4); // 6-9
    for (let i = 0; i < dropletCount; i++) {
      const angle = rand() * Math.PI * 2;
      const distance = 41 + rand() * 18; // 41-59 units from center
      const cx = 50 + Math.cos(angle) * distance;
      const cy = 44 + Math.sin(angle) * distance * 0.85;
      const r = 0.9 + rand() * 3.2;
      droplets.push({
        cx, cy,
        rx: r,
        ry: r * (0.55 + rand() * 0.6),
        op: 0.38 + rand() * 0.45,
      });
    }

    // Trailing drips — elongated drops that ran outward from the rim
    const drips = [];
    const dripCount = 1 + Math.floor(rand() * 2); // 1-2
    for (let i = 0; i < dripCount; i++) {
      const angle = rand() * Math.PI * 2;
      const distance = 36 + rand() * 5;
      const cx = 50 + Math.cos(angle) * distance;
      const cy = 44 + Math.sin(angle) * distance * 0.85;
      drips.push({
        cx, cy,
        rx: 1.3 + rand() * 1.6,
        ry: 3.8 + rand() * 4.2,
        rot: (angle * 180) / Math.PI - 90, // long axis points outward
      });
    }

    // Fine speckle spray — tiny backsplash dots
    const specks = [];
    const speckCount = 22 + Math.floor(rand() * 14); // 22-35
    for (let i = 0; i < speckCount; i++) {
      const angle = rand() * Math.PI * 2;
      const distance = 38 + rand() * 32;
      const cx = 50 + Math.cos(angle) * distance;
      const cy = 44 + Math.sin(angle) * distance * 0.85;
      specks.push({
        cx, cy,
        r: 0.14 + rand() * 0.55,
        op: 0.22 + rand() * 0.42,
      });
    }

    return { droplets, drips, specks };
  }, [seed]);

  return (
    <svg
      width={size}
      height={size * 0.88}
      viewBox="0 0 100 88"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      overflow="visible"
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        overflow: 'visible',
        opacity,
        ...style,
      }}
    >
      <defs>
        {/* Heavy organic distortion for the main pool — large irregular edges */}
        <filter id={mainFilterId} x="-40%" y="-40%" width="180%" height="180%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.022"
            numOctaves="3"
            seed={seed}
            result="big"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="big"
            scale="16"
            xChannelSelector="R"
            yChannelSelector="G"
            result="bigDisp"
          />
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.18"
            numOctaves="2"
            seed={seed + 4}
            result="fine"
          />
          <feDisplacementMap
            in="bigDisp"
            in2="fine"
            scale="2.5"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* Lighter distortion for satellite droplets — subtle edge wobble */}
        <filter id={dropFilterId} x="-60%" y="-60%" width="220%" height="220%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.45"
            numOctaves="2"
            seed={seed + 11}
            result="dn"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="dn"
            scale="1.6"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* Main rim — the sharp dark concentrated edge of the coffee ring */}
        <radialGradient id={rimId} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(140,88,28,0.00)" />
          <stop offset="40%"  stopColor="rgba(130,80,22,0.03)" />
          <stop offset="60%"  stopColor="rgba(115,68,18,0.09)" />
          <stop offset="72%"  stopColor="rgba(90,52,14,0.30)" />
          <stop offset="80%"  stopColor="rgba(60,34,8,0.66)" />
          <stop offset="84%"  stopColor="rgba(38,20,4,0.86)" />
          <stop offset="88%"  stopColor="rgba(46,24,6,0.70)" />
          <stop offset="93%"  stopColor="rgba(60,32,8,0.28)" />
          <stop offset="97%"  stopColor="rgba(72,40,10,0.10)" />
          <stop offset="100%" stopColor="rgba(80,46,10,0.00)" />
        </radialGradient>

        {/* Off-center inner pool — asymmetric drying as if the cup was tilted */}
        <radialGradient id={poolId} cx="42%" cy="56%" r="48%">
          <stop offset="0%"   stopColor="rgba(85,48,12,0.24)" />
          <stop offset="45%"  stopColor="rgba(85,48,12,0.08)" />
          <stop offset="80%"  stopColor="rgba(85,48,12,0.00)" />
          <stop offset="100%" stopColor="rgba(85,48,12,0.00)" />
        </radialGradient>

        {/* Inner tide line 1 — first dried-residue band inside the rim */}
        <radialGradient id={tide1Id} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(120,72,18,0.00)" />
          <stop offset="60%"  stopColor="rgba(120,72,18,0.00)" />
          <stop offset="78%"  stopColor="rgba(95,56,14,0.18)" />
          <stop offset="86%"  stopColor="rgba(72,42,10,0.10)" />
          <stop offset="100%" stopColor="rgba(80,46,10,0.00)" />
        </radialGradient>

        {/* Inner tide line 2 — innermost faint residue */}
        <radialGradient id={tide2Id} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(110,66,16,0.00)" />
          <stop offset="65%"  stopColor="rgba(110,66,16,0.00)" />
          <stop offset="82%"  stopColor="rgba(95,56,14,0.10)" />
          <stop offset="92%"  stopColor="rgba(80,46,10,0.04)" />
          <stop offset="100%" stopColor="rgba(70,40,10,0.00)" />
        </radialGradient>

        {/* Mini coffee-ring gradient for satellite droplets */}
        <radialGradient id={dropRimId} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(58,32,8,0.10)" />
          <stop offset="55%"  stopColor="rgba(58,32,8,0.22)" />
          <stop offset="78%"  stopColor="rgba(38,20,4,0.85)" />
          <stop offset="92%"  stopColor="rgba(52,28,6,0.35)" />
          <stop offset="100%" stopColor="rgba(70,40,10,0.00)" />
        </radialGradient>
      </defs>

      {/* Main pool — layered rim, asymmetric pool, and two tide lines */}
      <g filter={`url(#${mainFilterId})`}>
        <ellipse cx="50" cy="44" rx="38" ry="33" fill={`url(#${rimId})`} />
        <ellipse cx="50" cy="44" rx="38" ry="33" fill={`url(#${poolId})`} />
        <ellipse cx="50" cy="44" rx="29" ry="25" fill={`url(#${tide1Id})`} />
        <ellipse cx="50" cy="44" rx="20" ry="17" fill={`url(#${tide2Id})`} />
      </g>

      {splashes && (
        <>
          {/* Trailing drips — elongated drops radiating outward */}
          {drips.map((d, i) => (
            <ellipse
              key={`drip-${i}`}
              cx={d.cx}
              cy={d.cy}
              rx={d.rx}
              ry={d.ry}
              fill={`url(#${dropRimId})`}
              transform={`rotate(${d.rot} ${d.cx} ${d.cy})`}
              filter={`url(#${dropFilterId})`}
            />
          ))}

          {/* Satellite splash droplets — each a tiny coffee ring of its own */}
          {droplets.map((d, i) => (
            <ellipse
              key={`drop-${i}`}
              cx={d.cx}
              cy={d.cy}
              rx={d.rx}
              ry={d.ry}
              fill={`url(#${dropRimId})`}
              opacity={d.op}
              filter={`url(#${dropFilterId})`}
            />
          ))}

          {/* Fine speckle spray — backsplash particles, no filter (too small) */}
          {specks.map((s, i) => (
            <circle
              key={`speck-${i}`}
              cx={s.cx}
              cy={s.cy}
              r={s.r}
              fill={`rgba(52,28,6,${s.op})`}
            />
          ))}
        </>
      )}
    </svg>
  );
};

export default CoffeeRing;
