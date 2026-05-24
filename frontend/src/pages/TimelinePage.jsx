import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { dreamsAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import EmotionStamp from '../components/EmotionStamp';
import MoodHeatmap from '../components/MoodHeatmap';

const makeCaseId = (index) => {
  const suffixes = ['ALPHA','BETA','GAMMA','DELTA','EPSILON'];
  return `CASE-${String(index).padStart(4,'0')}-${suffixes[index % 5]}`;
};

const formatDate = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// Intersection-observer hook for scroll-triggered develop animation
const useInView = (threshold = 0.2) => {
  const ref    = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.unobserve(entry.target); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
};

// Single film frame card
const FilmFrame = ({ dream, index }) => {
  const [ref, inView] = useInView(0.15);
  const emotionBorderColor = {
    joy: 'var(--fixer)', fear: 'var(--stamp-red)', anger: 'var(--stamp-red)',
    sadness: 'var(--stamp-blue)', surprise: 'var(--fixer)', disgust: '#5c3a1a',
    neutral: 'var(--silver)',
  };
  const borderColor = emotionBorderColor[dream.dominantEmotion] || 'var(--silver)';

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        backgroundColor: 'var(--redact)',
        border: '8px solid var(--redact)',
        boxShadow: `inset 0 0 0 2px var(--fixer), 0 0 0 1px rgba(61,53,40,0.3)`,
        aspectRatio: '3/2',
        overflow: 'hidden',
        filter: inView ? 'none' : 'brightness(0) sepia(1)',
        transition: 'filter 2.4s ease-out',
        animationDelay: `${index * 0.15}s`,
      }}
    >
      {inView && (
        <Link to={`/dreams/${dream._id}`} style={{ display: 'block', width: '100%', height: '100%', textDecoration: 'none', position: 'relative' }}>
          {/* Emotion top border strip */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', backgroundColor: borderColor, zIndex: 2 }} />

          {/* Frame number */}
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '10px',
            fontFamily: '"Share Tech Mono", monospace',
            fontSize: '0.5rem',
            color: 'var(--silver)',
            letterSpacing: '0.1em',
            zIndex: 3,
          }}>
            ▶ {makeCaseId(index + 1)}
          </div>

          {/* Inner content — the developed image area */}
          <div
            className="dossier-card"
            style={{
              position: 'absolute',
              inset: '4px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: '12px',
              filter: inView ? `brightness(1) sepia(0.15) saturate(${0.4 + index * 0.1})` : 'brightness(0)',
              transition: 'filter 2.4s ease-out',
            }}
          >
            {/* Grain overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(to bottom, transparent 40%, rgba(15,14,12,0.7) 100%)`,
              zIndex: 1,
            }} />

            <div style={{ position: 'relative', zIndex: 2 }}>
              <h3 style={{
                fontFamily: '"Special Elite", serif',
                fontSize: '0.85rem',
                color: 'var(--paper)',
                margin: '0 0 6px 0',
                lineHeight: 1.3,
                textShadow: '0 1px 4px rgba(0,0,0,0.8)',
              }}>
                {dream.analysis?.title || 'Untitled Case'}
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {dream.dominantEmotion && (
                  <EmotionStamp emotion={dream.dominantEmotion} delay={0} size="sm" />
                )}
                <span style={{
                  fontFamily: '"Share Tech Mono", monospace',
                  fontSize: '0.5rem',
                  color: 'var(--silver)',
                  letterSpacing: '0.1em',
                }}>
                  {formatDate(dream.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </Link>
      )}
    </div>
  );
};

const TimelinePage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [dreams,        setDreams]        = useState([]);
  const [heatmapDreams, setHeatmapDreams] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [page,          setPage]          = useState(1);
  const [total,         setTotal]         = useState(0);
  const [search,        setSearch]        = useState('');
  const [emotion,       setEmotion]       = useState('');
  // Subjective-attribute filter chips. `null` = don't filter; `true` =
  // only show dreams flagged with that attribute.
  const [attrFilter,    setAttrFilter]    = useState({ lucid: null, recurring: null, nightmare: null });

  const LIMIT = 9;

  const loadDreams = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT, emotion: emotion || undefined };
      if (attrFilter.lucid !== null)     params.lucid     = attrFilter.lucid;
      if (attrFilter.recurring !== null) params.recurring = attrFilter.recurring;
      if (attrFilter.nightmare !== null) params.nightmare = attrFilter.nightmare;
      const res = await dreamsAPI.getDreams(params);
      setDreams(res.dreams);
      setTotal(res.total || res.dreams.length);
    } catch { toast.error('Failed to load archive.'); }
    finally { setLoading(false); }
  }, [page, emotion, attrFilter]);

  useEffect(() => { loadDreams(); }, [loadDreams]);

  const toggleAttr = (key) => {
    setPage(1);
    setAttrFilter((prev) => ({ ...prev, [key]: prev[key] ? null : true }));
  };

  // Separate, unfiltered fetch for the heatmap — we want the calendar to
  // reflect the user's entire ~6 month history regardless of which filter
  // is active on the contact sheet below.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await dreamsAPI.getDreams({ page: 1, limit: 365 });
        if (!cancelled) setHeatmapDreams(res.dreams || []);
      } catch {
        // non-fatal — heatmap just stays empty
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = search
    ? dreams.filter(d =>
        (d.analysis?.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.rawTranscript || '').toLowerCase().includes(search.toLowerCase())
      )
    : dreams;

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px', position: 'relative' }}>

      {/* Page header */}
      <div style={{ borderBottom: '2px solid var(--ink)', paddingBottom: '16px', marginBottom: '32px' }}>
        <div className="case-label" style={{ marginBottom: '4px' }}>CASE ARCHIVE — CONTACT SHEET</div>
        <h1 style={{ fontFamily: '"Special Elite", serif', fontSize: '2rem', color: 'var(--ink)', margin: 0 }}>
          Dream Exposure Archive
        </h1>
      </div>

      {/* Mood calendar heatmap — last 6 months of dream activity */}
      <MoodHeatmap dreams={heatmapDreams} />

      {/* Filter bar — darkroom equipment panel style */}
      <div style={{
        backgroundColor: 'var(--redact)',
        padding: '12px 20px',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: '24px',
      }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="SEARCH ARCHIVE..."
          style={{
            backgroundColor: 'transparent',
            border: '1px solid var(--silver)',
            color: 'var(--paper)',
            fontFamily: '"Share Tech Mono", monospace',
            fontSize: '0.65rem',
            letterSpacing: '0.1em',
            padding: '6px 12px',
            outline: 'none',
            width: '200px',
          }}
        />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['', 'joy', 'fear', 'anger', 'sadness', 'surprise', 'neutral'].map(e => (
            <button
              key={e}
              onClick={() => { setEmotion(e); setPage(1); }}
              style={{
                backgroundColor: emotion === e ? 'var(--fixer)' : 'transparent',
                border: '1px solid var(--silver)',
                color: emotion === e ? 'var(--redact)' : 'var(--silver)',
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: '0.55rem',
                letterSpacing: '0.1em',
                padding: '4px 10px',
                cursor: 'pointer',
                textTransform: 'uppercase',
                transition: 'all 0.2s',
              }}
            >
              {e || 'ALL'}
            </button>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', fontFamily: '"Share Tech Mono", monospace', fontSize: '0.55rem', color: 'var(--silver)', letterSpacing: '0.1em' }}>
          {total} FILES
        </span>
      </div>

      {/* Subjective attribute filter row */}
      <div style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: '24px',
        paddingLeft: '8px',
      }}>
        <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '0.55rem', color: 'var(--silver)', letterSpacing: '0.12em' }}>
          ATTRIBUTES:
        </span>
        {[
          { key: 'lucid',     label: 'LUCID' },
          { key: 'recurring', label: 'RECURRING' },
          { key: 'nightmare', label: 'NIGHTMARE' },
        ].map((opt) => {
          const active = attrFilter[opt.key] === true;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => toggleAttr(opt.key)}
              aria-pressed={active}
              style={{
                backgroundColor: active ? 'var(--stamp-red)' : 'transparent',
                border: `1px solid ${active ? 'var(--stamp-red)' : 'rgba(61,53,40,0.4)'}`,
                color: active ? 'var(--paper)' : 'var(--ink-faded)',
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: '0.55rem',
                letterSpacing: '0.12em',
                padding: '4px 10px',
                cursor: 'pointer',
                textTransform: 'uppercase',
                transition: 'all 0.15s',
              }}
            >
              {active ? '◉' : '○'} {opt.label}
            </button>
          );
        })}
      </div>

      {/* Contact sheet grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', backgroundColor: 'rgba(61,53,40,0.2)' }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="skeleton" style={{ aspectRatio: '3/2' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="dossier-card stacked-paper" style={{ padding: '64px', position: 'relative', overflow: 'hidden', border: '1px dashed rgba(61, 53, 40, 0.4)', textAlign: 'center' }}>
          {/* Rubber Stamp */}
          <div style={{
            position: 'absolute',
            top: '24px',
            right: '24px',
            border: '3px solid var(--stamp-red)',
            color: 'var(--stamp-red)',
            fontFamily: '"Share Tech Mono", monospace',
            fontSize: '11px',
            padding: '6px 12px',
            transform: 'rotate(12deg)',
            opacity: 0.85,
            fontWeight: 'bold',
            letterSpacing: '0.15em',
            boxShadow: 'inset 0 0 0 1px var(--stamp-red)',
          }}>
            NO EVIDENCE FILED
          </div>
          
          <div className="case-label" style={{ marginBottom: '20px', letterSpacing: '0.2em' }}>NO CASES ON RECORD</div>
          
          {/* Blank dossier mockup */}
          <div style={{ textAlign: 'left', fontFamily: '"Courier Prime", monospace', fontSize: '12px', color: 'var(--ink-faded)', maxWidth: '340px', margin: '0 auto 32px' }}>
            <div style={{ marginBottom: '12px' }}>CASE ID: <span style={{ borderBottom: '1px dashed var(--silver)', width: '180px', display: 'inline-block' }}></span></div>
            <div style={{ marginBottom: '12px' }}>DATE: <span style={{ borderBottom: '1px dashed var(--silver)', width: '180px', display: 'inline-block' }}>-- / -- / ----</span></div>
            <div style={{ marginBottom: '12px' }}>INVESTIGATOR: <span style={{ borderBottom: '1px dashed var(--silver)', width: '150px', display: 'inline-block' }}>{user?.username?.toUpperCase() || 'UNKNOWN'}</span></div>
            <div style={{ marginBottom: '18px' }}>TRANSCRIPTION SYNOPSIS:</div>
            <div style={{ borderBottom: '1px dashed var(--silver)', height: '24px', opacity: 0.5 }}></div>
            <div style={{ borderBottom: '1px dashed var(--silver)', height: '24px', opacity: 0.5 }}></div>
          </div>

          <Link to="/record" className="btn-stamp btn-stamp-red" style={{ display: 'inline-flex' }}>
            ▶ FILE NEW REPORT
          </Link>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1px',
          backgroundColor: 'var(--redact)',
          marginBottom: '32px',
        }}>
          {filtered.map((dream, i) => (
            <FilmFrame key={dream._id} dream={dream} index={i + (page - 1) * LIMIT} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-stamp btn-stamp-ink"
            style={{ fontSize: '0.6rem', opacity: page === 1 ? 0.3 : 1 }}
          >
            ← PREV
          </button>
          <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '0.6rem', color: 'var(--silver)', letterSpacing: '0.1em' }}>
            SHEET {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-stamp btn-stamp-ink"
            style={{ fontSize: '0.6rem', opacity: page === totalPages ? 0.3 : 1 }}
          >
            NEXT →
          </button>
        </div>
      )}
    </div>
  );
};

export default TimelinePage;
