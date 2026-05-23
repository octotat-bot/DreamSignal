import React from 'react';
import { motion } from 'framer-motion';

const STEPS = [
  { key: 'transcribed',  label: 'TRANSCRIBED',  statusKey: 'transcribed'  },
  { key: 'classified',   label: 'CLASSIFIED',   statusKey: 'emotions'     },
  { key: 'decoded',      label: 'DECODED',      statusKey: 'symbols'      },
  { key: 'interpreted',  label: 'INTERPRETED',  statusKey: 'analyzed'     },
  { key: 'archived',     label: 'ARCHIVED',     statusKey: 'completed'    },
];

// Map a stage name (from the SSE stream) or a raw processingStatus value
// (from the polling fallback) to which step indices are stamped done.
//
// SSE emits: started → transcribing → transcribed → analyzing → analyzed → archived
// Polling sees: pending / processing / complete / failed
const getCompletedSteps = (status) => {
  if (!status) return [];
  const s = status.toLowerCase();

  // Terminal — every stamp slams down
  if (s === 'complete' || s === 'completed' || s === 'archived') {
    return [0, 1, 2, 3, 4];
  }
  // Mid-pipeline, AI service has returned — last stamp pending
  if (s === 'analyzed') return [0, 1, 2, 3];
  // Mid-pipeline, AI service running — first stamp set, the rest pulse
  if (s === 'analyzing' || s === 'transcribed') return [0];
  // Pre-pipeline / failed / initial — nothing stamped
  if (s === 'transcribing' || s === 'started' || s === 'processing' || s === 'pending' || s === 'failed') {
    return [];
  }
  return [];
};

const rots = ['-2deg', '1.5deg', '-1deg', '2.5deg', '-3deg'];

const ProcessingStamps = ({ status = 'pending' }) => {
  const done = getCompletedSteps(status);
  const activeIdx = done.length < STEPS.length ? done.length : -1;

  return (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
      {STEPS.map((step, i) => {
        const isDone   = done.includes(i);
        const isActive = i === activeIdx;

        return (
          <div key={step.key} style={{ textAlign: 'center' }}>
            {isDone ? (
              <motion.div
                initial={{ scale: 3, rotate: '-8deg', opacity: 0 }}
                animate={{ scale: 1, rotate: rots[i], opacity: 0.9 }}
                transition={{ duration: 0.4, ease: [0.175, 0.885, 0.32, 1.275] }}
                style={{
                  border: '3px solid var(--stamp-red)',
                  borderRadius: '2px',
                  padding: '6px 14px',
                  fontFamily: '"Share Tech Mono", monospace',
                  fontSize: '0.65rem',
                  letterSpacing: '0.15em',
                  color: 'var(--stamp-red)',
                  boxShadow: 'inset 0 0 0 1px var(--stamp-red)',
                  rotate: rots[i],
                }}
              >
                {step.label}
              </motion.div>
            ) : isActive ? (
              <div style={{
                border: '2px solid var(--fixer)',
                borderRadius: '2px',
                padding: '6px 14px',
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: '0.65rem',
                letterSpacing: '0.12em',
                color: 'var(--fixer)',
                animation: 'pulseRed 1.5s ease-in-out infinite',
              }}>
                {step.label}...
              </div>
            ) : (
              <div style={{
                border: '2px solid var(--silver)',
                borderRadius: '2px',
                padding: '6px 14px',
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: '0.65rem',
                letterSpacing: '0.12em',
                color: 'var(--silver)',
                opacity: 0.4,
              }}>
                {step.label}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProcessingStamps;
