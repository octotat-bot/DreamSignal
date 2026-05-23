import React, { useState, useMemo } from 'react';

// Generates deterministic redaction for a string
// Redacts 25-40% of words, never first word of sentence,
// always redacts mid-sentence capitalized words
const buildRedacted = (text) => {
  if (!text) return [];
  const words = text.split(/(\s+)/);
  let isStart = true;

  return words.map((token, i) => {
    if (/^\s+$/.test(token)) { return { type: 'space', value: token }; }

    const word = token;
    const isCapMid = !isStart && /^[A-Z]/.test(word) && word.length > 2;
    const psuedoRandom = ((i * 2654435761) >>> 0) % 100;
    const shouldRedact = isCapMid || (!isStart && psuedoRandom < 32);

    // Update sentence start tracking
    isStart = /[.!?]$/.test(word.replace(/['")/]/g, ''));

    if (shouldRedact) {
      return { type: 'redact', value: word, len: word.length };
    }
    return { type: 'text', value: word };
  });
};

const RedactedText = ({
  text = '',
  revealOnHover = true,
  className = '',
}) => {
  const [revealed, setRevealed] = useState(false);
  const tokens = useMemo(() => buildRedacted(text), [text]);

  return (
    <span
      className={className}
      onMouseEnter={() => revealOnHover && setRevealed(true)}
      onMouseLeave={() => revealOnHover && setRevealed(false)}
      aria-label={text}
      style={{ cursor: revealOnHover ? 'pointer' : 'default' }}
    >
      {tokens.map((tok, i) => {
        if (tok.type === 'space') return <span key={i}>{tok.value}</span>;
        if (tok.type === 'text')  return <span key={i}>{tok.value}</span>;
        if (tok.type === 'redact') {
          const width = `${tok.len * 0.55}em`;
          return (
            <span key={i} style={{ position: 'relative', display: 'inline-block' }}>
              {/* The actual text, only visible when revealed */}
              <span style={{
                opacity: revealed ? 1 : 0,
                transition: 'opacity 0.4s 0.3s',
                fontStyle: 'italic',
              }}>
                {tok.value}
              </span>
              {/* Redaction bar */}
              <span
                className="redact-bar"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: '0.15em',
                  width,
                  height: '1.2em',
                  backgroundColor: 'var(--redact)',
                  transform: `rotate(-0.3deg) scaleX(${revealed ? 0 : 1})`,
                  transformOrigin: 'left',
                  transition: 'transform 0.6s ease-in-out',
                  display: 'inline-block',
                }}
                aria-hidden="true"
              />
            </span>
          );
        }
        return null;
      })}
    </span>
  );
};

export default RedactedText;
