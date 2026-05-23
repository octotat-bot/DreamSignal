import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { dreamsAPI, analyticsAPI } from '../api/api';
import { motion } from 'framer-motion';
import CoffeeRing from '../components/CoffeeRing';
import EmotionStamp from '../components/EmotionStamp';

const makeCaseId = (index) => {
  const suffixes = ['ALPHA','BETA','GAMMA','DELTA','EPSILON'];
  return `CASE-${String(index).padStart(4,'0')}-${suffixes[index % 5]}`;
};

const formatDate = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const formatDateShort = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// Local-date key (YYYY-MM-DD) — used by the streak counter so a dream
// filed at 23:55 doesn't count as a separate "day" from one filed at
// 00:05 the next morning relative to the user's wall clock.
const dayKey = (d) => {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Compute current + longest consecutive-day streaks from a list of
// createdAt timestamps. Current streak ends on whichever is later: today
// (if the user has filed today) or yesterday (so a streak doesn't reset
// until the day actually rolls over without an entry).
const computeStreaks = (dates) => {
  if (!dates || dates.length === 0) return { current: 0, longest: 0 };
  const days = Array.from(new Set(dates.map(dayKey))).sort(); // ascending

  // Longest run of consecutive dates
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diff = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  // Current streak ends today or yesterday
  const today = dayKey(new Date());
  const yesterday = dayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const last = days[days.length - 1];
  if (last !== today && last !== yesterday) return { current: 0, longest };

  let current = 1;
  for (let i = days.length - 2; i >= 0; i--) {
    const prev = new Date(days[i]);
    const next = new Date(days[i + 1]);
    const diff = Math.round((next - prev) / (1000 * 60 * 60 * 24));
    if (diff === 1) current += 1;
    else break;
  }
  return { current, longest };
};

const Dashboard = () => {
  const { user, refreshProfile } = useAuth();
  const toast = useToast();
  const [recentDreams,  setRecentDreams]  = useState([]);
  const [streakDreams,  setStreakDreams]  = useState([]);
  const [patterns,      setPatterns]      = useState(null);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        await refreshProfile();
        // Recent list (4) for the sidebar, full history (up to 365) for
        // the streak counter. Parallel + only one round-trip cost.
        const [dreamsData, streakData, patternsData] = await Promise.all([
          dreamsAPI.getDreams({ page: 1, limit: 4 }),
          dreamsAPI.getDreams({ page: 1, limit: 365 }),
          analyticsAPI.getPatterns(),
        ]);
        setRecentDreams(dreamsData.dreams);
        setStreakDreams(streakData.dreams || []);
        setPatterns(patternsData);
      } catch {
        toast.error('Failed to load case files.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const streak = computeStreaks(streakDreams.map((d) => d.createdAt));

  const totalDreams   = patterns?.totalDreams      || 0;
  const emotionTrends = patterns?.emotionTrends    || [];
  const symbolFreq    = patterns?.symbolFrequency  || [];
  // Backend returns `dominantEmotionHistory` but no single aggregate; derive it
  // from the trends array (highest dreamCount, tiebreaker = averageScore).
  const dominantEmo = emotionTrends.length
    ? [...emotionTrends].sort((a, b) =>
        (b.dreamCount - a.dreamCount) || (b.averageScore - a.averageScore)
      )[0].label || 'NONE'
    : 'NONE';
  const lastDate     = recentDreams[0]?.createdAt ? formatDateShort(recentDreams[0].createdAt) : 'N/A';

  if (loading) return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px' }}>
      {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: '80px', marginBottom: '8px' }} />)}
    </div>
  );

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px', position: 'relative' }}>

      <CoffeeRing style={{ top: '20px', right: '0px' }} />

      {/* ── CASE STATUS HEADER BAR ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        style={{
          borderBottom: '2px solid var(--ink)',
          paddingBottom: '16px',
          marginBottom: '40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '16px',
          position: 'relative',
        }}
      >
        <div>
          <div className="case-label" style={{ marginBottom: '4px' }}>
            SUBJECT: {user?.username?.toUpperCase()} / CLEARANCE: LEVEL 3
          </div>
          <h1 style={{
            fontFamily: '"Special Elite", serif',
            fontSize: '2rem',
            color: 'var(--ink)',
            margin: 0,
          }}>
            Active Case Desk
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right' }}>
            <div className="case-label">{totalDreams} CASES FILED</div>
            <div className="case-label">LAST ACTIVITY: {lastDate}</div>
            {totalDreams > 0 && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await dreamsAPI.exportArchive();
                    toast.success('Archive exported.');
                  } catch {
                    toast.error('Export failed.');
                  }
                }}
                className="btn-stamp"
                style={{
                  marginTop: '6px',
                  fontSize: '0.55rem',
                  color: 'var(--stamp-blue)',
                  letterSpacing: '0.14em',
                }}
              >
                ▼ EXPORT ARCHIVE (.JSON)
              </button>
            )}
          </div>
          {/* FILE ACTIVE stamp */}
          <motion.div
            initial={{ scale: 3, rotate: '-8deg', opacity: 0 }}
            animate={{ scale: 1, rotate: '3deg', opacity: 0.85 }}
            transition={{ duration: 0.4, delay: 0.5, ease: [0.175, 0.885, 0.32, 1.275] }}
            style={{
              border: '3px solid var(--stamp-red)',
              borderRadius: '2px',
              padding: '5px 14px',
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: '0.65rem',
              letterSpacing: '0.15em',
              color: 'var(--stamp-red)',
              boxShadow: 'inset 0 0 0 1px var(--stamp-red)',
            }}
          >
            FILE ACTIVE
          </motion.div>
        </div>
      </motion.div>

      {/* ── STATS ROW — evidence tags ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1px',
          backgroundColor: 'rgba(61,53,40,0.25)',
          marginBottom: '40px',
        }}
      >
        {[
          { label: 'CASES FILED',       value: totalDreams,               sub: 'total archived'   },
          { label: 'DOMINANT SIGNAL',   value: dominantEmo.toUpperCase(), sub: 'emotional index'  },
          { label: 'RECURRING SYMBOLS', value: symbolFreq.length,         sub: 'detected patterns'},
          {
            label: 'CURRENT STREAK',
            value: streak.current > 0 ? `${streak.current}D` : '—',
            sub: streak.longest > streak.current
              ? `best ${streak.longest} day${streak.longest === 1 ? '' : 's'}`
              : 'consecutive days',
          },
          { label: 'LAST EXPOSURE',     value: lastDate,                  sub: 'most recent entry'},
        ].map(({ label, value, sub }, i) => (
          <div key={label} className="dossier-card" style={{ padding: '20px 24px' }}>
            <div className="case-label" style={{ marginBottom: '8px' }}>{label}</div>
            <div style={{
              fontFamily: '"Special Elite", serif',
              fontSize: '1.6rem',
              color: 'var(--ink)',
              lineHeight: 1.2,
            }}>
              {value}
            </div>
            <div style={{ fontFamily: '"Courier Prime", monospace', fontSize: '11px', color: 'var(--silver)', marginTop: '4px' }}>
              {sub}
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── MAIN COLUMNS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '40px', alignItems: 'start' }}>

        {/* LEFT — Recent dream files */}
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}>
            <div className="case-label">RECENT CASE FILES</div>
            <Link to="/timeline" style={{
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: '0.6rem',
              letterSpacing: '0.12em',
              color: 'var(--stamp-blue)',
              textDecoration: 'underline',
              textDecorationStyle: 'dotted',
            }}>
              VIEW ALL CASES →
            </Link>
          </div>

          {recentDreams.length === 0 ? (
            <div className="dossier-card" style={{ padding: '48px', textAlign: 'center' }}>
              <div className="case-label" style={{ marginBottom: '12px' }}>NO FILES ON RECORD</div>
              <p style={{ fontFamily: '"Courier Prime", monospace', fontSize: '13px', color: 'var(--ink-faded)', marginBottom: '24px', lineHeight: 1.9 }}>
                Begin documenting your subconscious activity to populate the archive.
              </p>
              <Link to="/record" className="btn-stamp btn-stamp-red">
                ▶ OPEN NEW FILE
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', backgroundColor: 'rgba(61,53,40,0.2)' }}>
              {recentDreams.map((dream, i) => (
                <motion.div
                  key={dream._id}
                  className="dossier-card develop-reveal negative-frame"
                  style={{
                    animationDelay: `${i * 0.35}s`,
                    margin: '0 8px',
                  }}
                >
                  <Link to={`/dreams/${dream._id}`} style={{ display: 'block', padding: '20px 24px', textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                      <div style={{ flex: 1 }}>
                        {/* Case ID */}
                        <div className="case-label" style={{ marginBottom: '6px' }}>
                          {makeCaseId(i + 1)}
                        </div>

                        {/* Redaction bar + title */}
                        <div style={{ position: 'relative', marginBottom: '8px' }}>
                          <h3 style={{
                            fontFamily: '"Special Elite", serif',
                            fontSize: '1.05rem',
                            color: 'var(--ink)',
                            margin: 0,
                          }}>
                            {dream.analysis?.title || 'Untitled Dream'}
                          </h3>
                        </div>

                        {/* Redacted transcript */}
                        <div style={{ position: 'relative' }}>
                          <div className="redact-bar" style={{ width: '70%', height: '1.2em', marginBottom: '4px' }} />
                          <p style={{
                            fontFamily: '"Courier Prime", monospace',
                            fontSize: '12px',
                            color: 'var(--ink-faded)',
                            lineHeight: 1.7,
                            margin: 0,
                          }}>
                            {(dream.analysis?.summary || dream.rawTranscript || '').slice(0, 100)}...
                          </p>
                        </div>
                      </div>

                      {/* Right meta */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                        <div className="case-label">{formatDate(dream.createdAt)}</div>
                        {dream.dominantEmotion && (
                          <EmotionStamp emotion={dream.dominantEmotion} delay={0.5 + i * 0.2} size="sm" />
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT — Quick actions + Emotion breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', backgroundColor: 'transparent' }}>

          {/* Quick actions */}
          <div className="dossier-card" style={{ padding: '24px', marginBottom: '1px' }}>
            <div className="case-label" style={{ marginBottom: '16px' }}>CLASSIFIED ACTIONS</div>
            {[
              { to: '/record',    code: 'ACT-001', label: 'FILE NEW REPORT',   desc: 'Voice or written testimony'  },
              { to: '/timeline',  code: 'ACT-002', label: 'BROWSE ARCHIVE',    desc: 'Contact sheet of all cases'   },
              { to: '/analytics', code: 'ACT-003', label: 'PATTERN ANALYSIS',  desc: 'Subconscious signal report'   },
            ].map(({ to, code, label, desc }) => (
              <Link
                key={to}
                to={to}
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '12px 0',
                  borderBottom: '1px dashed rgba(61,53,40,0.25)',
                  textDecoration: 'none',
                  alignItems: 'flex-start',
                  transition: 'opacity 0.2s',
                  opacity: 0.85,
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.85'}
              >
                <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '0.6rem', color: 'var(--silver)', flexShrink: 0, paddingTop: '2px' }}>
                  {code}
                </span>
                <div>
                  <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '0.65rem', letterSpacing: '0.1em', color: 'var(--ink)' }}>{label}</div>
                  <div style={{ fontFamily: '"Courier Prime", monospace', fontSize: '11px', color: 'var(--silver)' }}>{desc}</div>
                </div>
                <span style={{ marginLeft: 'auto', color: 'var(--silver)', fontSize: '12px' }}>→</span>
              </Link>
            ))}
          </div>

          {/* Emotion breakdown */}
          {emotionTrends.length > 0 && (
            <div className="dossier-card" style={{ padding: '24px', marginTop: '1px' }}>
              <div className="case-label" style={{ marginBottom: '16px' }}>SIGNAL SPECTRUM</div>
              {emotionTrends.slice(0, 5).map((e, i) => {
                const pct = totalDreams > 0 ? (e.dreamCount / totalDreams) * 100 : 0;
                return (
                  <div key={e.label} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--ink-faded)', textTransform: 'uppercase' }}>
                        {e.label}
                      </span>
                      <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '0.6rem', color: 'var(--silver)' }}>
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div style={{ height: '3px', backgroundColor: 'rgba(61,53,40,0.15)', position: 'relative' }}>
                      <motion.div
                        style={{ position: 'absolute', left: 0, top: 0, height: '100%', backgroundColor: 'var(--fixer)' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.9, delay: 0.3 + i * 0.1 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
