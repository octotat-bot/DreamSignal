import React, { useState, useEffect } from 'react';
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

  if (loading) return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px' }}>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '200px', marginBottom: '16px' }} />)}
    </div>
  );

  const emotionTrends  = patterns?.emotionTrends  || [];
  const symbolFreq     = patterns?.symbolFrequency || [];
  const totalDreams    = patterns?.totalDreams     || 0;
  const dominantEmo    = patterns?.dominantEmotion || 'N/A';

  // Build intensity over time from all dreams
  const intensityData = allDreams.slice().reverse().map((d, i) => ({
    name: `#${String(i + 1).padStart(2,'0')}`,
    intensity: d.emotions?.reduce((max, e) => Math.max(max, e.score), 0) * 100 || 0,
  }));

  // Emotion pie
  const pieData = emotionTrends.map(({ emotion, percentage }) => ({ name: emotion, value: percentage || 0 }));
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
              <BarChart data={emotionTrends.map(e => ({ name: e.emotion.slice(0,4).toUpperCase(), pct: Math.round(e.percentage || 0) }))}>
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
            {symbolFreq.slice(0, 20).map(({ symbol, count }, i) => {
              const maxCount = symbolFreq[0]?.count || 1;
              const scale    = 0.8 + (count / maxCount) * 0.7;
              return (
                <motion.div
                  key={symbol}
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
                    {symbol}
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

      {/* Pattern report */}
      {patterns?.connections?.length > 0 && (
        <div className="dossier-card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div className="case-label">RECURRING PATTERN REPORT</div>
            <div style={{ flex: 1, borderTop: '1px dashed rgba(61,53,40,0.3)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1px', backgroundColor: 'rgba(61,53,40,0.2)' }}>
            {patterns.connections.slice(0, 6).map((conn, i) => (
              <div key={i} style={{ padding: '16px 20px', backgroundColor: 'var(--paper-dark)' }}>
                <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '0.55rem', color: 'var(--silver)', marginBottom: '6px', letterSpacing: '0.1em' }}>
                  LINK-{String(i + 1).padStart(3,'0')}
                </div>
                <div style={{ fontFamily: '"Courier Prime", monospace', fontSize: '12px', color: 'var(--ink)', marginBottom: '4px' }}>
                  {conn.dream1Title || 'Untitled'} ↔ {conn.dream2Title || 'Untitled'}
                </div>
                <div style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '0.55rem', color: 'var(--fixer)' }}>
                  MATCH: {conn.sharedSymbols?.join(', ') || 'unknown'}
                </div>
              </div>
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
