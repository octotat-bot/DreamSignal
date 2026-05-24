import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * DetectiveCursor
 * ──────────────────────────────────────────────────────
 * Loupe ONLY appears on specific elements (.redact-bar, .dream-negative, .sym-tag, .neg-excerpt).
 * Default OS cursor everywhere else.
 */

const LOUPE_SIZE = 48;

const DetectiveCursor = () => {
  const pos        = useRef({ x: -200, y: -200 });
  const ringPos    = useRef({ x: -200, y: -200 });
  const rafId      = useRef(null);
  const loupeRef   = useRef(null);
  const ringRef    = useRef(null);
  const stateRef   = useRef('hidden');
  const [mounted, setMounted] = useState(false);

  // Smooth ring follow via RAF
  const animateRing = useCallback(() => {
    const dx = pos.current.x - ringPos.current.x;
    const dy = pos.current.y - ringPos.current.y;
    ringPos.current.x += dx * 0.12;
    ringPos.current.y += dy * 0.12;

    if (ringRef.current) {
      ringRef.current.style.transform = `translate(${ringPos.current.x - 14}px, ${ringPos.current.y - 14}px)`;
    }

    rafId.current = requestAnimationFrame(animateRing);
  }, []);

  useEffect(() => {
    setMounted(true);
    rafId.current = requestAnimationFrame(animateRing);

    const onMove = (e) => {
      pos.current = { x: e.clientX, y: e.clientY };

      // Update loupe position instantly
      // The center of the glass in the SVG is at cx="18", cy="18".
      // To align the glass center exactly with the cursor, we offset by 18.
      if (loupeRef.current) {
        loupeRef.current.style.transform =
          `translate(${e.clientX - 18}px, ${e.clientY - 18}px)`;
      }

      // Detect what we're over
      const els = document.elementsFromPoint(e.clientX, e.clientY);
      let newState = 'hidden';

      for (const el of els) {
        const cls = typeof el.className === 'string' ? el.className : '';
        const tag = el.tagName?.toLowerCase();

        // 1. Force hidden on interactive elements (inputs, buttons, links)
        if (
          tag === 'input' || 
          tag === 'textarea' || 
          tag === 'button' || 
          tag === 'a' || 
          cls.includes('btn') || 
          cls.includes('clickable') || 
          cls.includes('dossier-card-interactive')
        ) {
          newState = 'hidden';
          break;
        }

        // 2. Check for target classes
        if (cls.includes('redact-bar') || cls.includes('redacted-wrapper') || el.closest('.redacted-wrapper')) {
          newState = 'redact';
          break;
        }
        if (cls.includes('dream-negative') || cls.includes('negative-frame')) {
          newState = 'negative';
          break;
        }
        if (cls.includes('sym-tag') || cls.includes('neg-excerpt')) {
          newState = 'glass';
          break;
        }
      }

      if (newState !== stateRef.current) {
        // Handle redact bar CSS hover toggle
        const allBars = document.querySelectorAll('.redact-bar');
        if (newState === 'redact') {
          allBars.forEach(b => b.classList.add('redact-bar-hover'));
        } else if (stateRef.current === 'redact') {
          allBars.forEach(b => b.classList.remove('redact-bar-hover'));
        }

        stateRef.current = newState;
        applyState(newState);
      }
    };

    const onMouseDown = () => {
      if (loupeRef.current && stateRef.current !== 'hidden') {
        loupeRef.current.style.scale = '0.85'; // Quick press down
      }
    };

    const onMouseUp = () => {
      if (loupeRef.current && stateRef.current !== 'hidden') {
        loupeRef.current.style.scale = stateRef.current === 'redact' ? '1.15' : '1.0'; // Spring back
      }
    };

    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);

    return () => {
      document.body.classList.remove('loupe-active');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [animateRing]);

  const applyState = (state) => {
    if (!loupeRef.current || !ringRef.current) return;

    const lensGlow = loupeRef.current.querySelector('.loupe-lens-glow');

    if (state === 'hidden') {
      loupeRef.current.style.opacity = '0';
      ringRef.current.style.opacity = '0';
      document.body.classList.remove('loupe-active'); // Restore native cursor
      return;
    }

    // Make loupe visible and hide native cursor
    loupeRef.current.style.opacity = '1';
    ringRef.current.style.opacity = '1';
    document.body.classList.add('loupe-active');

    switch (state) {
      case 'redact':
        loupeRef.current.style.filter = 'drop-shadow(0 0 10px rgba(180,20,10,0.9))';
        if (lensGlow) lensGlow.setAttribute('fill', 'rgba(200,30,10,0.25)');
        loupeRef.current.style.scale = '1.15';
        break;

      case 'negative':
      case 'glass':
        loupeRef.current.style.filter = 'drop-shadow(2px 3px 6px rgba(26,21,16,0.5))';
        if (lensGlow) lensGlow.setAttribute('fill', 'rgba(200,230,255,0.12)');
        loupeRef.current.style.scale = '1.0';
        break;
    }
  };

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        ref={ringRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: '1.5px solid rgba(61,53,40,0.25)',
          pointerEvents: 'none',
          zIndex: 999997,
          opacity: 0,
          transition: 'opacity 0.2s',
        }}
      />

      <div
        ref={loupeRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: LOUPE_SIZE,
          height: LOUPE_SIZE,
          pointerEvents: 'none',
          zIndex: 999998,
          opacity: 0,
          transition: 'scale 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.2s ease, opacity 0.2s',
          willChange: 'transform, scale',
        }}
      >
        <svg viewBox="0 0 48 48" fill="none" width={LOUPE_SIZE} height={LOUPE_SIZE}>
          <circle cx="18" cy="18" r="14.5" stroke="#c8a84b" strokeWidth="2.5" />
          <circle cx="18" cy="18" r="11.5" stroke="#b8925a" strokeWidth="1" strokeDasharray="2 1" />
          <circle className="loupe-lens-glow" cx="18" cy="18" r="13" fill="rgba(200,230,255,0.12)" />
          <ellipse cx="13.5" cy="13" rx="4" ry="2.5" fill="rgba(255,255,255,0.18)" transform="rotate(-25 13.5 13)" />
          <line x1="18" y1="7" x2="18" y2="10" stroke="#c8a84b" strokeWidth="0.8" strokeLinecap="round" />
          <line x1="18" y1="26" x2="18" y2="29" stroke="#c8a84b" strokeWidth="0.8" strokeLinecap="round" />
          <line x1="7" y1="18" x2="10" y2="18" stroke="#c8a84b" strokeWidth="0.8" strokeLinecap="round" />
          <line x1="26" y1="18" x2="29" y2="18" stroke="#c8a84b" strokeWidth="0.8" strokeLinecap="round" />
          <rect className="loupe-handle" x="29" y="29" width="14" height="5" rx="2.5" fill="#8B6347" transform="rotate(45 29 29)" />
          <line x1="32.5" y1="31" x2="36" y2="34.5" stroke="#6b4a30" strokeWidth="0.7" strokeLinecap="round" />
          <line x1="34.5" y1="31" x2="38" y2="34.5" stroke="#6b4a30" strokeWidth="0.7" strokeLinecap="round" />
          <rect x="28.5" y="28.5" width="3.5" height="3.5" rx="0.5" fill="#c8a84b" transform="rotate(45 28.5 28.5)" />
        </svg>
      </div>
    </>,
    document.body
  );
};

export default DetectiveCursor;
