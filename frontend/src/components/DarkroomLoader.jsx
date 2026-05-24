import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const DarkroomLoader = ({ onComplete, maxDuration = 6200 }) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    // Blinking dots animation for status
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    // Auto-skip/complete after maxDuration
    const timeout = setTimeout(() => {
      if (onComplete) onComplete();
    }, maxDuration);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onComplete, maxDuration]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: '#0a0a08',
      zIndex: 200000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      overflow: 'hidden',
    }}>
      {/* Pulsing Safelight in top right corner */}
      <div style={{
        position: 'absolute',
        top: '32px',
        right: '32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }}>
        <motion.div
          animate={{
            boxShadow: [
              '0 0 20px 4px rgba(230,30,10,0.5)',
              '0 0 35px 8px rgba(230,30,10,0.8)',
              '0 0 20px 4px rgba(230,30,10,0.5)',
            ]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: '#ff2211',
            border: '2px solid #551100',
          }}
        />
        <span style={{
          fontFamily: '"Share Tech Mono", monospace',
          fontSize: '9px',
          letterSpacing: '0.12em',
          color: '#ff2211',
        }}>
          SAFELIGHT ACTIVE
        </span>
      </div>

      {/* Main Photographic Development Area */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '40px',
      }}>
        {/* Developer Tray */}
        <div style={{
          width: '320px',
          height: '240px',
          border: '12px solid #e0dfdb',
          borderBottomColor: '#c5c4c0',
          borderRightColor: '#d2d1cd',
          backgroundColor: '#11100e',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8), inset 0 8px 16px rgba(0,0,0,0.9)',
          padding: '16px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Liquid refraction overlay */}
          <motion.div
            animate={{
              opacity: [0.1, 0.22, 0.1]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, transparent 30%, rgba(184,134,11,0.08) 50%, transparent 70%)',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />

          {/* Photographic Paper */}
          <div style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#f5efe0',
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px',
          }}>
            {/* Developing content */}
            <motion.div
              initial={{ opacity: 0, filter: 'blur(8px) contrast(0.5) sepia(1)' }}
              animate={{ opacity: 1, filter: 'blur(0px) contrast(1.1) sepia(0.2)' }}
              transition={{ duration: 7, ease: 'easeOut' }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                color: '#1a1510',
                width: '100%',
              }}
            >
              <div style={{
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: '9px',
                letterSpacing: '0.2em',
                color: '#8b1a1a',
                marginBottom: '8px',
                border: '1.5px solid #8b1a1a',
                padding: '2px 8px',
                textTransform: 'uppercase',
                boxShadow: 'inset 0 0 0 1px #8b1a1a',
              }}>
                CASE EVIDENCE
              </div>
              <h3 style={{
                fontFamily: '"Special Elite", serif',
                fontSize: '1.3rem',
                margin: '0 0 8px 0',
                color: '#1a1510',
                lineHeight: 1.2,
              }}>
                PROJECT DREAMSIGNAL
              </h3>
              <p style={{
                fontFamily: '"Courier Prime", monospace',
                fontSize: '11px',
                color: '#3d3528',
                lineHeight: 1.5,
                margin: 0,
                maxWidth: '220px',
              }}>
                Filing records of subconscious waveform patterns...
              </p>
            </motion.div>

            {/* Paper Texture Overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 2px)',
              backgroundSize: '100% 2px',
              pointerEvents: 'none',
            }} />
          </div>
        </div>

        {/* Developing Status */}
        <div style={{
          fontFamily: '"Share Tech Mono", monospace',
          fontSize: '11px',
          color: '#8a8070',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}>
          DEVELOPING SUBSTANCE{dots}
        </div>
      </div>

      {/* Skip button in bottom corner */}
      {onComplete && (
        <button
          onClick={onComplete}
          className="btn-stamp btn-stamp-ink"
          style={{
            position: 'absolute',
            bottom: '32px',
            right: '32px',
            color: '#8a8070',
            borderColor: '#3d3528',
            fontSize: '9px',
            padding: '4px 12px',
            letterSpacing: '0.12em',
            zIndex: 10000,
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = '#8a8070'}
        >
          [ SKIP INTRO ]
        </button>
      )}
    </div>
  );
};

export default DarkroomLoader;
