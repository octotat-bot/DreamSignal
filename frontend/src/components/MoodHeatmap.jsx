import React, { useMemo, useState } from 'react';

/**
 * GitHub-style mood calendar — one cell per day for the last ~26 weeks.
 * Each cell is colored by the day's dominant emotion (taken from the
 * latest dream filed that day) and tinted by how many dreams were filed.
 *
 * Hover any cell to see the date, count, and dominant emotion in a small
 * darkroom-style tooltip. Empty days are paper-toned so the grid still
 * reads as a contact sheet of exposures over time.
 */

const EMOTION_COLORS = {
  joy:      'var(--fixer)',
  fear:     'var(--stamp-red)',
  anger:    'var(--stamp-red)',
  sadness:  'var(--stamp-blue)',
  surprise: 'var(--fixer)',
  disgust:  '#5c3a1a',
  neutral:  'var(--silver)',
  love:     '#b8606b',
};

const WEEKS = 26; // ~6 months of history
const CELL = 12;
const GAP = 3;

const dayKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const MoodHeatmap = ({ dreams = [] }) => {
  const [hover, setHover] = useState(null);

  // Bucket dreams by local date. Each bucket records the count and the
  // emotion of the most recent dream on that day.
  const cells = useMemo(() => {
    const buckets = new Map();
    for (const d of dreams) {
      if (!d.createdAt) continue;
      const dt = new Date(d.createdAt);
      const key = dayKey(dt);
      const prev = buckets.get(key);
      if (!prev || new Date(d.createdAt) > prev.latest) {
        buckets.set(key, {
          latest: new Date(d.createdAt),
          emotion: d.dominantEmotion || 'neutral',
          count: (prev?.count || 0) + 1,
        });
      } else {
        prev.count += 1;
      }
    }

    // Build a contiguous grid ending on today, going back WEEKS * 7 days.
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const totalDays = WEEKS * 7;
    // Align the last column to today so the rightmost column is the current week.
    const start = new Date(today);
    start.setDate(start.getDate() - (totalDays - 1));

    const grid = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = dayKey(d);
      const bucket = buckets.get(key);
      grid.push({
        date: d,
        key,
        count: bucket?.count || 0,
        emotion: bucket?.emotion || null,
      });
    }
    return grid;
  }, [dreams]);

  // Re-shape the flat grid into columns of 7 days (one column per week).
  const columns = useMemo(() => {
    const cols = [];
    for (let i = 0; i < cells.length; i += 7) cols.push(cells.slice(i, i + 7));
    return cols;
  }, [cells]);

  // Month labels above the columns (drawn once per month transition)
  const monthLabels = useMemo(() => {
    const out = [];
    let lastMonth = -1;
    columns.forEach((col, ci) => {
      const first = col[0]?.date;
      if (!first) return;
      if (first.getMonth() !== lastMonth) {
        out.push({ ci, label: first.toLocaleString('en-US', { month: 'short' }).toUpperCase() });
        lastMonth = first.getMonth();
      }
    });
    return out;
  }, [columns]);

  const filedDays = cells.filter((c) => c.count > 0).length;

  return (
    <div className="dossier-card" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '16px' }}>
        <div className="case-label">EXPOSURE LOG — LAST {WEEKS * 7} DAYS</div>
        <div style={{ flex: 1, borderTop: '1px dashed rgba(61,53,40,0.3)' }} />
        <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '0.55rem', color: 'var(--silver)', letterSpacing: '0.1em' }}>
          {filedDays} DAYS FILED
        </span>
      </div>

      <div style={{ position: 'relative', overflowX: 'auto' }}>
        {/* Month labels strip */}
        <div
          style={{
            position: 'relative',
            height: '14px',
            marginBottom: '4px',
            marginLeft: '24px',
          }}
        >
          {monthLabels.map(({ ci, label }) => (
            <span
              key={`${ci}-${label}`}
              style={{
                position: 'absolute',
                left: `${ci * (CELL + GAP)}px`,
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: '0.55rem',
                color: 'var(--silver)',
                letterSpacing: '0.12em',
              }}
            >
              {label}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex' }}>
          {/* Day-of-week labels — only Mon/Wed/Fri for breathing room */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: `${GAP}px`, marginRight: '8px' }}>
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d, i) => (
              <span
                key={d}
                style={{
                  width: '16px',
                  height: `${CELL}px`,
                  lineHeight: `${CELL}px`,
                  fontFamily: '"Share Tech Mono", monospace',
                  fontSize: '0.5rem',
                  color: 'var(--silver)',
                  letterSpacing: '0.1em',
                  textAlign: 'right',
                  visibility: i % 2 === 1 ? 'visible' : 'hidden',
                }}
              >
                {d}
              </span>
            ))}
          </div>

          {/* The grid itself — one <div> column per week */}
          <div style={{ display: 'flex', gap: `${GAP}px` }}>
            {columns.map((col, ci) => (
              <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: `${GAP}px` }}>
                {Array.from({ length: 7 }).map((_, ri) => {
                  const cell = col[ri];
                  if (!cell) {
                    return <div key={ri} style={{ width: CELL, height: CELL }} />;
                  }
                  const isToday = dayKey(new Date()) === cell.key;
                  const isEmpty = cell.count === 0;
                  const intensity = Math.min(1, 0.45 + cell.count * 0.18);
                  const bg = isEmpty
                    ? 'var(--paper-dark)'
                    : EMOTION_COLORS[cell.emotion] || 'var(--silver)';
                  return (
                    <div
                      key={ri}
                      onMouseEnter={() => setHover(cell)}
                      onMouseLeave={() => setHover(null)}
                      style={{
                        width: CELL,
                        height: CELL,
                        backgroundColor: bg,
                        opacity: isEmpty ? 1 : intensity,
                        border: isToday ? '1px solid var(--ink)' : '1px solid rgba(61,53,40,0.25)',
                        cursor: isEmpty ? 'default' : 'pointer',
                        transition: 'transform 0.12s ease, opacity 0.12s ease',
                      }}
                      title={`${cell.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}${cell.count ? ` — ${cell.count} ${cell.count === 1 ? 'dream' : 'dreams'}, ${cell.emotion}` : ' — no exposures'}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '14px', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '0.55rem', color: 'var(--silver)', letterSpacing: '0.12em' }}>
          DOMINANT SIGNAL:
        </span>
        {Object.entries(EMOTION_COLORS)
          .filter(([k]) => k !== 'love')
          .map(([emotion, color]) => (
            <div key={emotion} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: CELL, height: CELL, backgroundColor: color, border: '1px solid rgba(61,53,40,0.25)', opacity: 0.75 }} />
              <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '0.55rem', color: 'var(--ink-faded)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {emotion}
              </span>
            </div>
          ))}
      </div>

      {/* Hover tooltip — darkroom strip */}
      {hover && hover.count > 0 && (
        <div
          style={{
            marginTop: '12px',
            padding: '8px 14px',
            backgroundColor: 'var(--redact)',
            color: 'var(--fixer)',
            fontFamily: '"Share Tech Mono", monospace',
            fontSize: '0.6rem',
            letterSpacing: '0.12em',
            borderLeft: '3px solid var(--fixer)',
            display: 'inline-block',
          }}
        >
          {hover.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          {'  /  '}
          {hover.count} {hover.count === 1 ? 'DREAM' : 'DREAMS'}
          {'  /  '}
          DOMINANT: {String(hover.emotion || 'NEUTRAL').toUpperCase()}
        </div>
      )}
    </div>
  );
};

export default MoodHeatmap;
