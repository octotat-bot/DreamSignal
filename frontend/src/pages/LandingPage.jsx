import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import CoffeeRing from '../components/CoffeeRing';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] } },
});

const EVIDENCE_CARDS = [
  {
    code: 'EV-001-VOICE',
    redactTitle: true,
    title: 'VOICE TESTIMONY',
    body: 'Subjects narrate their nocturnal experiences. The signal is captured, compressed, and filed for pattern extraction.',
    stamp: 'AUDIO CLASSIFIED',
  },
  {
    code: 'EV-002-NEURAL',
    title: 'NEURAL CLASSIFICATION',
    body: 'Seven-axis emotional spectrum analysis. Fear, joy, sadness, anger — each weighted, indexed, archived by the system.',
    stamp: 'EMOTIONS DECODED',
  },
  {
    code: 'EV-003-SYMBOL',
    title: 'SYMBOL EXTRACTION',
    body: 'Recurring objects, persons, and environments are identified as recurring psychological markers. Cross-referenced.',
    stamp: 'SYMBOLS LOGGED',
  },
];

const LandingPage = () => (
  <div style={{
    minHeight: '100vh',
    backgroundColor: 'var(--paper)',
    position: 'relative',
    overflow: 'hidden',
  }}>

    {/* Decorative coffee rings */}
    <CoffeeRing style={{ position: 'absolute', top: '80px', right: '60px', opacity: 0.8 }} />
    <CoffeeRing style={{ position: 'absolute', bottom: '200px', left: '-30px', opacity: 0.6 }} />

    {/* Safelight corner glow */}
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      width: '400px',
      height: '400px',
      background: 'radial-gradient(circle at bottom left, rgba(107,26,10,0.12), transparent 70%)',
      pointerEvents: 'none',
      zIndex: 0,
    }} />

    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '80px 48px', position: 'relative', zIndex: 1 }}>

      {/* ── HERO ── */}
      <div style={{ borderBottom: '1px dashed rgba(61,53,40,0.4)', paddingBottom: '64px', marginBottom: '64px' }}>

        {/* Top classification bar */}
        <motion.div {...fadeUp(0)} style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '48px',
        }}>
          <motion.div
            initial={{ rotate: 0, opacity: 0 }}
            animate={{ rotate: -2, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              border: '3px solid var(--stamp-red)',
              borderRadius: '2px',
              padding: '6px 18px',
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: '0.7rem',
              letterSpacing: '0.2em',
              color: 'var(--stamp-red)',
              boxShadow: 'inset 0 0 0 1px var(--stamp-red)',
              display: 'inline-block',
              opacity: 0.85,
            }}
          >
            CLASSIFIED / DREAM RESEARCH DIVISION
          </motion.div>

          <div style={{
            fontFamily: '"Share Tech Mono", monospace',
            fontSize: '0.6rem',
            letterSpacing: '0.15em',
            color: 'var(--silver)',
            textAlign: 'right',
          }}>
            PROJECT DREAMSIGNAL<br />
            <span style={{ color: 'var(--stamp-red)' }}>● ACTIVE</span>
          </div>
        </motion.div>

        {/* Main headline */}
        <motion.h1 {...fadeUp(0.1)} style={{
          fontFamily: '"Special Elite", serif',
          fontSize: 'clamp(48px, 8vw, 80px)',
          lineHeight: 1.15,
          color: 'var(--ink)',
          marginBottom: '24px',
          maxWidth: '700px',
        }}>
          Your subconscious<br />
          is a crime scene.
        </motion.h1>

        <motion.p {...fadeUp(0.2)} style={{
          fontFamily: '"Courier Prime", monospace',
          fontSize: '16px',
          color: 'var(--ink-faded)',
          marginBottom: '40px',
          lineHeight: 1.9,
        }}>
          We collect evidence.
        </motion.p>

        {/* CTAs */}
        <motion.div {...fadeUp(0.3)} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Link to="/signup" className="btn-stamp btn-stamp-primary" style={{ fontSize: '0.75rem' }}>
            ▶ BEGIN FILING
          </Link>
          <Link to="/login" className="btn-stamp btn-stamp-blue" style={{ fontSize: '0.75rem' }}>
            ▶ VIEW DOSSIER
          </Link>
        </motion.div>
      </div>

      {/* ── METHODOLOGY ── */}
      <div>
        {/* Section stamp header */}
        <motion.div
          {...fadeUp(0.4)}
          style={{ marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '16px' }}
        >
          <motion.span
            initial={{ rotate: 0, opacity: 0 }}
            animate={{ rotate: 3, opacity: 0.85 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            style={{
              border: '3px solid var(--stamp-blue)',
              borderRadius: '2px',
              padding: '4px 14px',
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: '0.7rem',
              letterSpacing: '0.2em',
              color: 'var(--stamp-blue)',
              boxShadow: 'inset 0 0 0 1px var(--stamp-blue)',
              display: 'inline-block',
              rotate: '3deg',
            }}
          >
            METHODOLOGY
          </motion.span>
          <div style={{ flex: 1, borderTop: '1px dashed rgba(61,53,40,0.3)' }} />
        </motion.div>

        {/* Evidence cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1px', backgroundColor: 'rgba(61,53,40,0.2)' }}>
          {EVIDENCE_CARDS.map((card, i) => (
            <motion.div
              key={card.code}
              className="dossier-card develop-reveal"
              style={{
                padding: '32px 28px',
                animationDelay: `${i * 0.4}s`,
                position: 'relative',
              }}
            >
              {/* Case code */}
              <div className="case-label" style={{ marginBottom: '16px' }}>{card.code}</div>

              {/* Redaction bar over title */}
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <h3 style={{
                  fontFamily: '"Special Elite", serif',
                  fontSize: '1.1rem',
                  color: 'var(--ink)',
                  margin: 0,
                }}>
                  {card.title}
                </h3>
                {card.redactTitle && (
                  <div className="redact-bar" style={{ position: 'absolute', top: '0.1em', left: 0, width: '60%', height: '1.3em' }} />
                )}
              </div>

              <p style={{
                fontFamily: '"Courier Prime", monospace',
                fontSize: '13px',
                color: 'var(--ink-faded)',
                lineHeight: 1.9,
                marginBottom: '24px',
              }}>
                {card.body}
              </p>

              {/* Bottom stamp */}
              <motion.span
                initial={{ scale: 2, rotate: '-8deg', opacity: 0 }}
                animate={{ scale: 1, rotate: `${-2 + i * 2}deg`, opacity: 0.85 }}
                transition={{ duration: 0.4, delay: 0.8 + i * 0.3 }}
                style={{
                  border: '2px solid var(--stamp-blue)',
                  borderRadius: '2px',
                  padding: '3px 10px',
                  fontFamily: '"Share Tech Mono", monospace',
                  fontSize: '0.6rem',
                  letterSpacing: '0.15em',
                  color: 'var(--stamp-blue)',
                  boxShadow: 'inset 0 0 0 1px var(--stamp-blue)',
                  display: 'inline-block',
                }}
              >
                {card.stamp}
              </motion.span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{
        marginTop: '80px',
        borderTop: '1px dashed rgba(61,53,40,0.3)',
        paddingTop: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '0.6rem', color: 'var(--silver)', letterSpacing: '0.1em' }}>
          DREAMSIGNAL RESEARCH DIVISION — CASE REFERENCE: DS-ACTIVE-2025
        </span>
        <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '0.6rem', color: 'var(--silver)', letterSpacing: '0.1em' }}>
          CLEARANCE REQUIRED TO PROCEED
        </span>
      </div>
    </div>
  </div>
);

export default LandingPage;
