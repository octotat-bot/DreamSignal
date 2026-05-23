import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { dreamsAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import EmotionStamp from '../components/EmotionStamp';
import RedactedText from '../components/RedactedText';
import CoffeeRing from '../components/CoffeeRing';

const makeCaseId = (id) => {
  if (!id) return 'CASE-0000-ALPHA';
  const num = parseInt(id.slice(-4), 16) % 9999;
  const suffixes = ['ALPHA','BETA','GAMMA','DELTA','EPSILON'];
  return `CASE-${String(num).padStart(4,'0')}-${suffixes[num % 5]}`;
};

const emotionBarColor = {
  joy:      '#b8860b',
  fear:     '#8b1a1a',
  anger:    '#8b1a1a',
  sadness:  '#1a3a5c',
  surprise: '#b8860b',
  disgust:  '#5c3a1a',
  neutral:  '#8a8070',
};

// Typewriter hook
const useTypewriter = (text = '', speed = 40) => {
  const [display, setDisplay] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplay('');
    setDone(false);
    if (!text) return;
    let i = 0;
    const iv = setInterval(() => {
      setDisplay(text.slice(0, i + 1));
      i++;
      if (i >= text.length) { clearInterval(iv); setDone(true); }
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed]);
  return { display, done };
};

const DetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [dream, setDream]       = useState(null);
  const [loading, setLoading]   = useState(true);
  // Distinguishes "really missing" (404) from "server crashed" (500), so the
  // error screen below can render a useful CTA rather than always insisting
  // the file was destroyed.
  const [errorKind, setErrorKind] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        setErrorKind(null);
        setDream(await dreamsAPI.getDreamDetail(id));
      } catch (err) {
        const status = err?.response?.status;
        if (status === 404 || status === 403 || status === 400) {
          setErrorKind('missing');
          toast.error('Case file not found.');
        } else {
          setErrorKind('server');
          toast.error('Archive temporarily unreachable.');
        }
      } finally { setLoading(false); }
    };
    fetch();
  }, [id]);

  const handleDelete = async () => {
    try {
      await dreamsAPI.deleteDream(id);
      toast.success('Case file destroyed.');
      navigate('/dashboard');
    } catch { toast.error('Destruction failed.'); }
  };

  const caseId = makeCaseId(id);
  const formatDate = d => new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  const titleTyper = useTypewriter(dream?.analysis?.title || '', 45);

  if (loading) return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px' }}>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '80px', marginBottom: '8px' }} />)}
    </div>
  );

  if (!dream) {
    const isServer = errorKind === 'server';
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '64px 48px', textAlign: 'center' }}>
        <div className="case-label" style={{ marginBottom: '12px' }}>
          {isServer ? 'ARCHIVE UNREACHABLE' : 'FILE NOT FOUND'}
        </div>
        <p style={{ fontFamily: '"Courier Prime", monospace', color: 'var(--ink-faded)', marginBottom: '24px' }}>
          {isServer
            ? 'The records office is temporarily offline. Try again in a moment.'
            : 'This case file does not exist or has been destroyed.'}
        </p>
        <div style={{ display: 'inline-flex', gap: '12px' }}>
          {isServer && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-stamp btn-stamp-red"
            >
              ▶ RETRY
            </button>
          )}
          <Link to="/dashboard" className="btn-stamp btn-stamp-ink">← RETURN TO DESK</Link>
        </div>
      </div>
    );
  }

  const emotionData = (dream.emotions || []).map(e => ({
    name: e.label.charAt(0).toUpperCase() + e.label.slice(1),
    score: parseFloat((e.score * 100).toFixed(1)),
    color: emotionBarColor[e.label] || '#8a8070',
  }));

  return (
    <motion.div
      initial={{ filter: 'brightness(0) sepia(1)', opacity: 0 }}
      animate={{ filter: 'brightness(1) sepia(0.08)', opacity: 1 }}
      transition={{ duration: 2.4, ease: [0.16, 1, 0.3, 1] }}
      style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px', position: 'relative' }}
    >
      {/* Safelight glow — page enter */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(ellipse at center, rgba(107,26,10,0.08) 0%, transparent 60%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      <CoffeeRing style={{ top: '60px', right: '20px', zIndex: 1 }} />

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── CASE HEADER ── */}
        <div style={{ borderBottom: '2px solid var(--ink)', paddingBottom: '24px', marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <Link to="/timeline" style={{
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: '0.6rem',
                letterSpacing: '0.1em',
                color: 'var(--silver)',
                textDecoration: 'underline',
                textDecorationStyle: 'dotted',
              }}>
                ← CASE ARCHIVE
              </Link>
              <div className="case-label" style={{ marginTop: '12px', marginBottom: '8px' }}>{caseId}</div>
              <h1 style={{
                fontFamily: '"Special Elite", serif',
                fontSize: 'clamp(1.6rem, 4vw, 2.6rem)',
                color: 'var(--ink)',
                margin: 0,
                lineHeight: 1.2,
              }}>
                {titleTyper.display}
                {!titleTyper.done && <span className="tw-cursor">|</span>}
              </h1>
              <div style={{
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: '0.6rem',
                color: 'var(--silver)',
                letterSpacing: '0.1em',
                marginTop: '8px',
              }}>
                EXPOSURE DATE: {formatDate(dream.createdAt)} / {dream.inputType?.toUpperCase()} RECORDING
              </div>

              {/* Subjective attribute badges + tags */}
              {(dream.isLucid || dream.isRecurring || dream.isNightmare || (dream.tags && dream.tags.length > 0)) && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  marginTop: '12px',
                  alignItems: 'center',
                }}>
                  {dream.isLucid && (
                    <span style={{
                      fontFamily: '"Share Tech Mono", monospace',
                      fontSize: '0.55rem',
                      letterSpacing: '0.12em',
                      padding: '3px 8px',
                      border: '1.5px solid var(--fixer)',
                      color: 'var(--fixer)',
                      textTransform: 'uppercase',
                    }}>◉ LUCID</span>
                  )}
                  {dream.isRecurring && (
                    <span style={{
                      fontFamily: '"Share Tech Mono", monospace',
                      fontSize: '0.55rem',
                      letterSpacing: '0.12em',
                      padding: '3px 8px',
                      border: '1.5px solid var(--stamp-blue)',
                      color: 'var(--stamp-blue)',
                      textTransform: 'uppercase',
                    }}>↻ RECURRING</span>
                  )}
                  {dream.isNightmare && (
                    <span style={{
                      fontFamily: '"Share Tech Mono", monospace',
                      fontSize: '0.55rem',
                      letterSpacing: '0.12em',
                      padding: '3px 8px',
                      border: '1.5px solid var(--stamp-red)',
                      color: 'var(--stamp-red)',
                      textTransform: 'uppercase',
                    }}>⚠ NIGHTMARE</span>
                  )}
                  {(dream.tags || []).map((t) => (
                    <span key={t} style={{
                      fontFamily: '"Share Tech Mono", monospace',
                      fontSize: '0.55rem',
                      letterSpacing: '0.1em',
                      padding: '3px 8px',
                      backgroundColor: 'var(--redact)',
                      color: 'var(--paper)',
                      textTransform: 'uppercase',
                    }}>#{t}</span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
              {dream.dominantEmotion && (
                <EmotionStamp emotion={dream.dominantEmotion} delay={1.2} size="lg" />
              )}
              <button
                onClick={() => setShowDelete(true)}
                className="btn-stamp"
                style={{ color: 'var(--stamp-red)', fontSize: '0.6rem' }}
              >
                DESTROY FILE
              </button>
            </div>
          </div>
        </div>

        {/* ── TWO COLUMN LAYOUT ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '40px', alignItems: 'start' }}>

          {/* LEFT COL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

            {/* Developed dream-scene photograph (AI-generated) */}
            {dream.imagePath && (
              <div>
                <div className="case-label" style={{ marginBottom: '12px' }}>
                  EVIDENCE PHOTO — DEVELOPED FROM TESTIMONY
                </div>
                <div
                  style={{
                    position: 'relative',
                    backgroundColor: 'var(--redact)',
                    padding: '12px',
                    boxShadow:
                      'inset 0 0 0 2px var(--fixer), 0 0 0 1px rgba(61,53,40,0.4), 0 6px 22px rgba(15,14,12,0.35)',
                  }}
                >
                  <img
                    src={`${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api').replace(/\/api\/?$/, '')}${dream.imagePath}`}
                    alt={dream.analysis?.title || 'Dream scene'}
                    style={{
                      width: '100%',
                      display: 'block',
                      filter: 'sepia(0.18) saturate(0.85) contrast(1.05) brightness(0.95)',
                    }}
                    onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: '12px',
                      pointerEvents: 'none',
                      backgroundImage:
                        'radial-gradient(ellipse at center, transparent 55%, rgba(15,14,12,0.55) 100%)',
                    }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: '8px',
                      fontFamily: '"Share Tech Mono", monospace',
                      fontSize: '0.55rem',
                      color: 'var(--silver)',
                      letterSpacing: '0.12em',
                    }}
                  >
                    <span>▶ EXHIBIT A — RECONSTRUCTED SCENE</span>
                    <span>FRAME 01 / 01</span>
                  </div>
                </div>
              </div>
            )}

            {/* Cinematic description */}
            {dream.analysis?.cinematicDescription && (
              <div>
                <div className="case-label" style={{ marginBottom: '12px' }}>CINEMATIC DESCRIPTION</div>
                <div style={{
                  borderLeft: '3px solid var(--fixer)',
                  paddingLeft: '20px',
                }}>
                  <p style={{
                    fontFamily: '"Courier Prime", monospace',
                    fontStyle: 'italic',
                    fontSize: '14px',
                    color: 'var(--ink)',
                    lineHeight: 1.9,
                    margin: 0,
                  }}>
                    {dream.analysis.cinematicDescription}
                  </p>
                </div>
              </div>
            )}

            {/* Psychological interpretation */}
            {dream.analysis?.psychologicalInterpretation && (
              <div className="dossier-card" style={{ padding: '24px' }}>
                <div className="case-label" style={{ marginBottom: '16px' }}>PSYCHOLOGICAL ANALYSIS</div>
                <p style={{
                  fontFamily: '"Courier Prime", monospace',
                  fontSize: '14px',
                  color: 'var(--ink-faded)',
                  lineHeight: 1.9,
                  margin: 0,
                  textIndent: '2em',
                }}>
                  {dream.analysis.psychologicalInterpretation}
                </p>
              </div>
            )}

            {/* Transcript */}
            <div className="dossier-card" style={{ overflow: 'hidden' }}>
              <button
                onClick={() => setShowTranscript(v => !v)}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: '"Share Tech Mono", monospace',
                  fontSize: '0.6rem',
                  letterSpacing: '0.12em',
                  color: 'var(--ink-faded)',
                  textTransform: 'uppercase',
                }}
              >
                RAW TRANSCRIPT — {showTranscript ? '[COLLAPSE]' : '[EXPAND]'}
              </button>
              <AnimatePresence>
                {showTranscript && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="lined-paper" style={{ padding: '16px 24px', borderTop: '1px dashed rgba(61,53,40,0.3)' }}>
                      <RedactedText
                        text={dream.rawTranscript || ''}
                        revealOnHover
                        className=""
                        style={{
                          fontFamily: '"Courier Prime", monospace',
                          fontSize: '13px',
                          color: 'var(--ink)',
                          lineHeight: 1.9,
                          whiteSpace: 'pre-wrap',
                        }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* RIGHT COL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Emotion evidence */}
            {emotionData.length > 0 && (
              <div className="dossier-card" style={{ padding: '24px' }}>
                <div className="case-label" style={{ marginBottom: '16px' }}>EMOTION EVIDENCE</div>
                <div style={{ height: '200px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={emotionData} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <XAxis type="number" domain={[0,100]} hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fontFamily: '"Share Tech Mono"', fontSize: 10, fill: 'var(--ink-faded)' }}
                        axisLine={false}
                        tickLine={false}
                        width={62}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--paper-dark)',
                          border: '1px solid var(--ink-faded)',
                          borderRadius: 0,
                          fontFamily: '"Courier Prime", monospace',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="score" radius={0} barSize={12}>
                        {emotionData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Symbols */}
            {(dream.symbols || []).length > 0 && (
              <div className="dossier-card" style={{ padding: '24px' }}>
                <div className="case-label" style={{ marginBottom: '16px' }}>SYMBOLS DETECTED</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {dream.symbols.map((s, i) => (
                    <motion.div
                      key={s.label}
                      initial={{ scale: 2, rotate: '-6deg', opacity: 0 }}
                      animate={{ scale: 1, rotate: `${-3 + i * 1.5}deg`, opacity: 0.85 }}
                      transition={{ duration: 0.4, delay: 1.5 + i * 0.1, ease: [0.175, 0.885, 0.32, 1.275] }}
                      style={{
                        border: '2px solid var(--stamp-blue)',
                        borderRadius: '2px',
                        padding: '4px 10px',
                        boxShadow: 'inset 0 0 0 1px var(--stamp-blue)',
                      }}
                    >
                      <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '0.6rem', letterSpacing: '0.12em', color: 'var(--stamp-blue)', textTransform: 'uppercase' }}>
                        {s.label}
                      </div>
                      <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '0.5rem', color: 'var(--silver)' }}>
                        CERTAINTY: {(s.score * 100).toFixed(0)}%
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Related cases */}
            {(dream.relatedDreams || []).length > 0 && (
              <div className="dossier-card" style={{ padding: '24px' }}>
                <div className="case-label" style={{ marginBottom: '16px' }}>RELATED CASES</div>
                {dream.relatedDreams.map(item => (
                  <Link
                    key={item.dreamId}
                    to={`/dreams/${item.dreamId}`}
                    style={{
                      display: 'block',
                      padding: '10px 0',
                      borderBottom: '1px dashed rgba(61,53,40,0.25)',
                      textDecoration: 'none',
                      opacity: 0.85,
                      transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0.85'}
                  >
                    <div style={{ fontFamily: '"Courier Prime", monospace', fontSize: '12px', color: 'var(--ink)', marginBottom: '2px' }}>
                      {item.title || 'Untitled Case'}
                    </div>
                    <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '0.55rem', color: 'var(--stamp-red)' }}>
                      MATCH: {(item.similarity * 100).toFixed(0)}%
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete modal */}
      <AnimatePresence>
        {showDelete && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDelete(false)}
              style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,14,12,0.6)' }}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="dossier-card"
              style={{ position: 'relative', zIndex: 1, padding: '40px', maxWidth: '400px', width: '100%', textAlign: 'center' }}
            >
              <div className="case-label" style={{ marginBottom: '16px', color: 'var(--stamp-red)' }}>⚠ DESTRUCTION ORDER</div>
              <h3 style={{ fontFamily: '"Special Elite", serif', fontSize: '1.4rem', color: 'var(--ink)', marginBottom: '12px' }}>
                Destroy this case file?
              </h3>
              <p style={{ fontFamily: '"Courier Prime", monospace', fontSize: '13px', color: 'var(--silver)', lineHeight: 1.9, marginBottom: '32px' }}>
                This action is permanent and irreversible. All evidence and analysis will be purged from the archive.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setShowDelete(false)} className="btn-stamp btn-stamp-ink" style={{ flex: 1, justifyContent: 'center' }}>
                  ABORT
                </button>
                <button onClick={handleDelete} className="btn-stamp btn-stamp-red" style={{ flex: 1, justifyContent: 'center', backgroundColor: 'var(--stamp-red)', color: 'var(--paper)' }}>
                  CONFIRM
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DetailPage;
