import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { analyticsAPI, dreamsAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell
} from 'recharts';
import CoffeeRing from '../components/CoffeeRing';

const SYMBOL_ROTS = [-3, 1.5, -1, 2.5, -2, 3, -1.5, 2, -3, 1];

const AnalyticsPage = () => {
  const toast = useToast();
  const [patterns,   setPatterns]   = useState(null);
  const [allDreams,  setAllDreams]  = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [p, d] = await Promise.all([
          analyticsAPI.getPatterns(),
          dreamsAPI.getDreams({ page: 1, limit: 100 }),
        ]);
        setPatterns(p);
        setAllDreams(d.dreams || []);
      } catch { toast.error('Failed to load signal analysis.'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  // Build deduplicated cross-reference links from each dream's `relatedDreams`
  // (populated by the embedding-similarity step in the AI service). Each pair
  // is keyed by sorted IDs so A↔B and B↔A only show up once.
  // NOTE: must stay above any early return — see Rules of Hooks.
  const relatedLinks = useMemo(() => {
    if (!allDreams.length) return [];
    const titleMap = new Map(
      allDreams.map(d => [String(d._id), d.analysis?.title || 'Untitled'])
    );
    const seen = new Set();
    const links = [];
    for (const d of allDreams) {
      const aId = String(d._id);
      const aTitle = titleMap.get(aId) || 'Untitled';
      for (const r of d.relatedDreams || []) {
        const bId = r.dreamId ? String(r.dreamId) : null;
        if (!bId || bId === aId) continue;
        const pairKey = [aId, bId].sort().join(':');
        if (seen.has(pairKey)) continue;
        seen.add(pairKey);
        links.push({
          key: pairKey,
          aId,
          aTitle,
          bId,
          bTitle: titleMap.get(bId) || r.title || 'Untitled',
          similarity: r.similarity || 0,
        });
      }
    }
    links.sort((a, b) => b.similarity - a.similarity);
    return links;
  }, [allDreams]);

  if (loading) return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px' }}>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '200px', marginBottom: '16px' }} />)}
    </div>
  );

  const emotionTrends  = patterns?.emotionTrends  || [];
  const symbolFreq     = patterns?.symbolFrequency || [];
  const totalDreams    = patterns?.totalDreams     || 0;

  // Derive dominant emotion: highest dreamCount, tiebreaker = highest averageScore.
  // The backend stores `dominantEmotionHistory` (one entry per dream), but doesn't
  // surface a single aggregate value — compute it client-side from emotionTrends.
  const dominantEmo = emotionTrends.length
    ? [...emotionTrends].sort((a, b) =>
        (b.dreamCount - a.dreamCount) || (b.averageScore - a.averageScore)
      )[0].label || 'N/A'
    : 'N/A';

  // Frequency % for an emotion = dreams where it was detected / total dreams.
  const emotionPct = (e) => (totalDreams > 0 ? (e.dreamCount / totalDreams) * 100 : 0);

  // Build intensity over time from all dreams
  const intensityData = allDreams.slice().reverse().map((d, i) => ({
    name: `#${String(i + 1).padStart(2,'0')}`,
    intensity: d.emotions?.reduce((max, e) => Math.max(max, e.score), 0) * 100 || 0,
  }));

  // Emotion pie (kept in case a pie panel is reintroduced)
  const pieData = emotionTrends.map(e => ({ name: e.label, value: emotionPct(e) }));
  const PIE_COLORS = ['#b8860b','#8b1a1a','#1a3a5c','#5c3a1a','#2a4a2a','#8a8070','#3d3528'];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px', position: 'relative' }}>

      <CoffeeRing style={{ top: '20px', right: '0' }} />

      {/* Page header — rubber stamp style */}
      <div style={{ borderBottom: '2px solid var(--ink)', paddingBottom: '16px', marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div className="case-label" style={{ marginBottom: '4px' }}>SUBCONSCIOUS PATTERN ANALYSIS</div>
            <h1 style={{ fontFamily: '"Special Elite", serif', fontSize: '2rem', color: 'var(--ink)', margin: 0 }}>
              Signal Research Report
            </h1>
          </div>
          <motion.div
            initial={{ scale: 3, rotate: '-8deg', opacity: 0 }}
            animate={{ scale: 1, rotate: '3deg', opacity: 0.85 }}
            transition={{ duration: 0.4, delay: 0.3, ease: [0.175, 0.885, 0.32, 1.275] }}
            style={{
              border: '3px solid var(--stamp-blue)',
              borderRadius: '2px',
              padding: '6px 16px',
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: '0.65rem',
              letterSpacing: '0.15em',
              color: 'var(--stamp-blue)',
              boxShadow: 'inset 0 0 0 1px var(--stamp-blue)',
            }}
          >
            CLASSIFIED ANALYSIS
          </motion.div>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1px',
        backgroundColor: 'rgba(61,53,40,0.25)',
        marginBottom: '40px',
      }}>
        {[
          { label: 'TOTAL CASES',     value: totalDreams },
          { label: 'DOMINANT SIGNAL', value: dominantEmo.toUpperCase() },
          { label: 'PATTERNS FOUND',  value: emotionTrends.length },
          { label: 'SYMBOLS LOGGED',  value: symbolFreq.length },
        ].map(({ label, value }) => (
          <div key={label} className="dossier-card" style={{ padding: '20px 24px' }}>
            <div className="case-label" style={{ marginBottom: '6px' }}>{label}</div>
            <div style={{ fontFamily: '"Special Elite", serif', fontSize: '1.8rem', color: 'var(--ink)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>

        {/* Emotion bar chart */}
        <div className="dossier-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div className="case-label">EMOTION FREQUENCY</div>
            <div style={{ flex: 1, borderTop: '1px dashed rgba(61,53,40,0.3)' }} />
          </div>
          <div style={{ height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={emotionTrends.map(e => ({
                name: (e.label || '').slice(0, 4).toUpperCase() || 'N/A',
                pct: Math.round(emotionPct(e)),
              }))}>
                <XAxis dataKey="name" tick={{ fontFamily: '"Share Tech Mono"', fontSize: 9, fill: 'var(--ink-faded)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontFamily: '"Share Tech Mono"', fontSize: 9, fill: 'var(--ink-faded)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--paper-dark)', border: '1px solid var(--ink-faded)', borderRadius: 0, fontFamily: '"Courier Prime"', fontSize: 12 }} />
                <Bar dataKey="pct" fill="var(--fixer)" radius={0} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Intensity over time */}
        <div className="dossier-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div className="case-label">SIGNAL INTENSITY OVER TIME</div>
            <div style={{ flex: 1, borderTop: '1px dashed rgba(61,53,40,0.3)' }} />
          </div>
          <div style={{ height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={intensityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(61,53,40,0.15)" />
                <XAxis dataKey="name" tick={{ fontFamily: '"Share Tech Mono"', fontSize: 9, fill: 'var(--ink-faded)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0,100]} tick={{ fontFamily: '"Share Tech Mono"', fontSize: 9, fill: 'var(--ink-faded)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--paper-dark)', border: '1px solid var(--ink-faded)', borderRadius: 0, fontFamily: '"Courier Prime"', fontSize: 12 }} />
                <Line type="monotone" dataKey="intensity" stroke="var(--fixer)" strokeWidth={2} dot={{ fill: 'var(--stamp-red)', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Symbol evidence grid */}
      {symbolFreq.length > 0 && (
        <div className="dossier-card" style={{ padding: '28px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <motion.div
              initial={{ scale: 2, rotate: '-8deg', opacity: 0 }}
              animate={{ scale: 1, rotate: '2deg', opacity: 0.85 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              style={{
                border: '2px solid var(--stamp-red)',
                borderRadius: '2px',
                padding: '3px 10px',
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: '0.6rem',
                letterSpacing: '0.15em',
                color: 'var(--stamp-red)',
                boxShadow: 'inset 0 0 0 1px var(--stamp-red)',
              }}
            >
              SYMBOL MAP
            </motion.div>
            <div style={{ flex: 1, borderTop: '1px dashed rgba(61,53,40,0.3)' }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
            {symbolFreq.slice(0, 20).map(({ label, count }, i) => {
              const maxCount = symbolFreq[0]?.count || 1;
              const scale    = 0.8 + (count / maxCount) * 0.7;
              return (
                <motion.div
                  key={label}
                  initial={{ scale: 2, rotate: '-6deg', opacity: 0 }}
                  animate={{ scale, rotate: `${SYMBOL_ROTS[i % SYMBOL_ROTS.length]}deg`, opacity: 0.85 }}
                  transition={{ duration: 0.4, delay: 0.5 + i * 0.05, ease: [0.175, 0.885, 0.32, 1.275] }}
                  style={{
                    border: '2px solid var(--stamp-blue)',
                    borderRadius: '2px',
                    padding: '4px 10px',
                    boxShadow: 'inset 0 0 0 1px var(--stamp-blue)',
                    display: 'inline-block',
                    transformOrigin: 'center',
                  }}
                >
                  <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--stamp-blue)', textTransform: 'uppercase' }}>
                    {label}
                  </div>
                  <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '0.5rem', color: 'var(--silver)' }}>
                    ×{count}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cross-referenced case files — pairs of dreams that the embedding
          similarity step linked at > 0.65 cosine similarity */}
      {relatedLinks.length > 0 && (
        <div className="dossier-card" style={{ padding: '28px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div className="case-label">CROSS-REFERENCED CASE FILES</div>
            <div style={{ flex: 1, borderTop: '1px dashed rgba(61,53,40,0.3)' }} />
            <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '0.55rem', color: 'var(--silver)', letterSpacing: '0.1em' }}>
              {relatedLinks.length} LINK{relatedLinks.length === 1 ? '' : 'S'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1px', backgroundColor: 'rgba(61,53,40,0.2)' }}>
            {relatedLinks.slice(0, 6).map((link, i) => (
              <Link
                key={link.key}
                to={`/dreams/${link.aId}`}
                style={{
                  padding: '16px 20px',
                  backgroundColor: 'var(--paper-dark)',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block',
                  transition: 'opacity 0.2s',
                  opacity: 0.9,
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.9')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '0.55rem', color: 'var(--silver)', letterSpacing: '0.1em' }}>
                    LINK-{String(i + 1).padStart(3, '0')}
                  </span>
                  <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '0.55rem', color: 'var(--fixer)', letterSpacing: '0.08em' }}>
                    {(link.similarity * 100).toFixed(0)}% MATCH
                  </span>
                </div>
                <div style={{ fontFamily: '"Courier Prime", monospace', fontSize: '12px', color: 'var(--ink)', lineHeight: 1.6 }}>
                  <span style={{ color: 'var(--ink)' }}>{link.aTitle}</span>
                  <span style={{ color: 'var(--silver)', margin: '0 6px' }}>↔</span>
                  <span style={{ color: 'var(--ink)' }}>{link.bTitle}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Footer reference */}
      <div style={{
        marginTop: '48px',
        borderTop: '1px dashed rgba(61,53,40,0.3)',
        paddingTop: '16px',
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: '0.55rem',
        color: 'var(--silver)',
        letterSpacing: '0.1em',
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span>DREAMSIGNAL RESEARCH DIVISION — PATTERN ANALYSIS REPORT</span>
        <span>GENERATED: {new Date().toLocaleDateString()}</span>
      </div>
    </div>
  );
};

export default AnalyticsPage;
