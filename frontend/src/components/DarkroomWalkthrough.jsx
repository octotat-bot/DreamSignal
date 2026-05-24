import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';

const TOUR_KEY = 'dreamsignal_tour_done';
const PADDING  = 12; // px spotlight padding around target

const STEPS = [
  {
    target: 'navigation',
    title:  'FIELD OPERATIONS HQ',
    body:   'Your command centre. Navigate between the Archive (all cases), Signal (record new testimony), Exposure (timeline), Patterns (subconscious analytics), and your Dossier (profile).',
    card:   'bottom',
  },
  {
    target: 'cases-filed',
    title:  'CASE COUNTER',
    body:   'Total dream-signal files logged in the archive. Each entry is a classified document — cross-reference them in Patterns to surface recurring motifs.',
    card:   'right',
  },
  {
    target: 'dominant-signal',
    title:  'DOMINANT SIGNAL',
    body:   'The primary emotional frequency detected across all your transmissions. Your subconscious is broadcasting — this is what it keeps sending.',
    card:   'right',
  },
  {
    target: 'record',
    title:  'INITIATE TRANSMISSION',
    body:   'Open a new case file. Speak or type your dream testimony and the system will classify it, detect emotional signals, extract symbols, and cross-reference existing patterns.',
    card:   'left',
  },
  {
    target: 'contact-sheet',
    title:  'RECENT EXPOSURES',
    body:   'Your most recent case files — like a photographic contact sheet. Hover any redacted section to reveal classified testimony. Click a file to open the full dossier.',
    card:   'top',
  },
];

const DarkroomWalkthrough = () => {
  const location = useLocation();

  // Only render on /dashboard
  if (location.pathname !== '/dashboard') return null;

  // Check localStorage once
  if (typeof window !== 'undefined' && localStorage.getItem(TOUR_KEY)) return null;

  return <WalkthroughOverlay />;
};

const WalkthroughOverlay = () => {
  const [step,   setStep]   = useState(0);
  const [rect,   setRect]   = useState(null);
  const [done,   setDone]   = useState(false);
  const [ready,  setReady]  = useState(false);

  // Wait for the cinematic loader to finish
  useEffect(() => {
    const checkCinematic = () => {
      if (sessionStorage.getItem('cinematic_played') === 'true') {
        setReady(true);
      } else {
        setTimeout(checkCinematic, 500);
      }
    };
    checkCinematic();
  }, []);

  const currentStep = STEPS[step];

  const computeRect = useCallback(() => {
    const el = document.querySelector(`[data-tour="${currentStep.target}"]`);
    if (el) setRect(el.getBoundingClientRect());
    else    setRect(null);
  }, [currentStep.target]);

  useEffect(() => {
    // Slight delay so DOM is painted (especially after Framer Motion)
    const t = setTimeout(computeRect, 80);
    window.addEventListener('resize', computeRect);
    window.addEventListener('scroll', computeRect, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', computeRect);
      window.removeEventListener('scroll', computeRect, true);
    };
  }, [computeRect]);

  const complete = () => {
    localStorage.setItem(TOUR_KEY, '1');
    setDone(true);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else complete();
  };

  if (done) return null;
  if (!ready) return null;

  // Spotlight cutout via box-shadow — punches a hole through the overlay
  const spotlight = rect
    ? {
        top:    rect.top    - PADDING,
        left:   rect.left   - PADDING,
        width:  rect.width  + PADDING * 2,
        height: rect.height + PADDING * 2,
      }
    : null;

  // Decide where to place the info card relative to target
  const cardStyle = buildCardStyle(currentStep.card, rect);

  return createPortal(
    <div
      aria-modal="true"
      role="dialog"
      aria-label={`Tour step ${step + 1} of ${STEPS.length}: ${currentStep.title}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        pointerEvents: 'none',
      }}
    >
      {/* Dark overlay with spotlight hole */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'all' }}
        onClick={complete}
      >
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {spotlight && (
              <rect
                x={spotlight.left}
                y={spotlight.top}
                width={spotlight.width}
                height={spotlight.height}
                rx="4"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(10, 8, 6, 0.82)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Spotlight border glow */}
      {spotlight && (
        <div
          style={{
            position:     'absolute',
            top:          spotlight.top,
            left:         spotlight.left,
            width:        spotlight.width,
            height:       spotlight.height,
            borderRadius: '4px',
            border:       '1.5px solid rgba(184,134,11,0.7)',
            boxShadow:    '0 0 0 2px rgba(184,134,11,0.15), 0 0 24px rgba(184,134,11,0.25)',
            pointerEvents:'none',
            transition:   'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      )}

      {/* Info dossier card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position:        'fixed',
          pointerEvents:   'all',
          zIndex:          100001,
          width:           '300px',
          backgroundColor: 'var(--paper-dark, #1a1410)',
          border:          '1px solid rgba(184,134,11,0.45)',
          borderTop:       '3px solid var(--fixer, #b8860b)',
          padding:         '22px 24px 20px',
          boxShadow:       '0 8px 40px rgba(0,0,0,0.6)',
          transition:      'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          ...cardStyle,
        }}
      >
        {/* Classification header */}
        <div style={{
          fontFamily:    '"Share Tech Mono", monospace',
          fontSize:      '9px',
          letterSpacing: '0.18em',
          color:         'var(--fixer, #b8860b)',
          marginBottom:  '10px',
          opacity:       0.8,
        }}>
          FIELD BRIEFING — STEP {step + 1}/{STEPS.length}
        </div>

        {/* Title */}
        <div style={{
          fontFamily:   '"Special Elite", serif',
          fontSize:     '1rem',
          color:        '#e8dfc8',
          marginBottom: '10px',
          lineHeight:   1.3,
        }}>
          {currentStep.title}
        </div>

        {/* Body */}
        <p style={{
          fontFamily:   '"Courier Prime", "Courier New", monospace',
          fontSize:     '12px',
          color:        'rgba(232,223,200,0.75)',
          lineHeight:   1.8,
          margin:       '0 0 20px',
        }}>
          {currentStep.body}
        </p>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '18px' }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width:        i === step ? '18px' : '6px',
                height:       '6px',
                borderRadius: '3px',
                backgroundColor: i === step
                  ? 'var(--fixer, #b8860b)'
                  : i < step
                    ? 'rgba(184,134,11,0.4)'
                    : 'rgba(184,134,11,0.15)',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={complete}
            style={{
              fontFamily:    '"Share Tech Mono", monospace',
              fontSize:      '0.6rem',
              letterSpacing: '0.12em',
              color:         'rgba(184,134,11,0.55)',
              background:    'none',
              border:        'none',
              cursor:        'pointer',
              padding:       '4px 0',
              textTransform: 'uppercase',
              transition:    'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(184,134,11,0.9)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(184,134,11,0.55)'}
          >
            [ SKIP BRIEFING ]
          </button>

          <button
            onClick={next}
            style={{
              fontFamily:      '"Share Tech Mono", monospace',
              fontSize:        '0.65rem',
              letterSpacing:   '0.14em',
              color:           '#1a1410',
              backgroundColor: 'var(--fixer, #b8860b)',
              border:          'none',
              cursor:          'pointer',
              padding:         '7px 16px',
              textTransform:   'uppercase',
              transition:      'opacity 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            {step < STEPS.length - 1 ? '[ NEXT →]' : '[ ACKNOWLEDGED ]'}
          </button>
        </div>

        {/* Decorative corner mark */}
        <div style={{
          position:      'absolute',
          top:           '8px',
          right:         '8px',
          fontFamily:    '"Share Tech Mono", monospace',
          fontSize:      '8px',
          color:         'rgba(184,134,11,0.3)',
          letterSpacing: '0.08em',
        }}>
          TS/SCI
        </div>
      </div>
    </div>,
    document.body
  );
};

/** Compute card (x,y) based on target rect and preferred placement side */
const buildCardStyle = (preferredSide, rect) => {
  const CARD_W   = 300;
  const CARD_H   = 240; // approx
  const MARGIN   = 24;

  if (!rect) {
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const placements = {
    bottom: {
      top:  rect.bottom + PADDING + MARGIN,
      left: Math.min(Math.max(rect.left + rect.width / 2 - CARD_W / 2, MARGIN), vw - CARD_W - MARGIN),
    },
    top: {
      top:  rect.top - PADDING - MARGIN - CARD_H,
      left: Math.min(Math.max(rect.left + rect.width / 2 - CARD_W / 2, MARGIN), vw - CARD_W - MARGIN),
    },
    right: {
      top:  Math.min(Math.max(rect.top + rect.height / 2 - CARD_H / 2, MARGIN), vh - CARD_H - MARGIN),
      left: rect.right + PADDING + MARGIN,
    },
    left: {
      top:  Math.min(Math.max(rect.top + rect.height / 2 - CARD_H / 2, MARGIN), vh - CARD_H - MARGIN),
      left: rect.left - PADDING - MARGIN - CARD_W,
    },
  };

  // Use preferred, but fall back if it would go off-screen
  const p = placements[preferredSide] || placements.bottom;
  const fits = p.top > 0 && p.top + CARD_H < vh && p.left > 0 && p.left + CARD_W < vw;

  if (fits) return p;

  // Try each side in priority order
  for (const side of ['bottom', 'right', 'top', 'left']) {
    const alt = placements[side];
    if (alt.top > 0 && alt.top + CARD_H < vh && alt.left > 0 && alt.left + CARD_W < vw) {
      return alt;
    }
  }
  return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
};

export default DarkroomWalkthrough;
