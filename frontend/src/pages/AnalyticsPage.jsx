import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { analyticsAPI, dreamsAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import { motion } from 'framer-motion';
import CoffeeRing from '../components/CoffeeRing';
import EmotionStamp from '../components/EmotionStamp';

const makeCaseId = (index) => {
  const suffixes = ['ALPHA','BETA','GAMMA','DELTA','EPSILON'];
  return `CASE-${String(index).padStart(4,'0')}-${suffixes[index % 5]}`;
};

// Preset positions on our responsive 100 x 100 conspiracy board coordinate grid
const SYMBOL_POSITIONS = [
  { x: 14, y: 22 },
  { x: 12, y: 50 },
  { x: 15, y: 78 },
  { x: 86, y: 22 },
  { x: 88, y: 50 },
  { x: 85, y: 78 },
];

const DREAM_POSITIONS = [
  { x: 50, y: 16 },
  { x: 36, y: 44 },
  { x: 64, y: 38 },
  { x: 44, y: 74 },
  { x: 64, y: 76 },
];

const ROTATIONS = [-3, 2, -1, 3, -2, 4, -1.5, 2.5, -4, 1.5];

const AnalyticsPage = () => {
  const toast = useToast();
  const [patterns,   setPatterns]   = useState(null);
  const [allDreams,  setAllDreams]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState(null);

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
      } catch {
        toast.error('Failed to load signal analysis.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const relatedLinks = useMemo(() => {
    if (!allDreams.length) return [];
    const titleMap = new Map(
      allDreams.map(d => [String(d._id), d.analysis?.title || 'Untitled'])
    );
    const seen = new Set();
    const links = [];
    for (const d of allDreams) {
      const aId = String(d._id);
      for (const r of d.relatedDreams || []) {
        const bId = r.dreamId ? String(r.dreamId) : null;
        if (!bId || bId === aId) continue;
        const pairKey = [aId, bId].sort().join(':');
        if (seen.has(pairKey)) continue;
        seen.add(pairKey);
        links.push({
          key: pairKey,
          aId,
          aTitle: titleMap.get(aId) || 'Untitled',
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

  const emotionTrends = patterns?.emotionTrends || [];
  const symbolFreq    = patterns?.symbolFrequency || [];
  const totalDreams   = patterns?.totalDreams || 0;

  const dominantEmo = emotionTrends.length
    ? [...emotionTrends].sort((a, b) =>
        (b.dreamCount - a.dreamCount) || (b.averageScore - a.averageScore)
      )[0].label || 'N/A'
    : 'N/A';

  // Take top 6 symbols and top 5 recent dreams for conspiracy board representation
  const activeSymbols = symbolFreq.slice(0, 6);
  const activeDreams  = allDreams.slice(0, 5);

  // Helper to verify connection between a dream and a symbol label
  const isConnected = (dream, symbolLabel) => {
    return (dream.symbols || []).some(s => s.label.toLowerCase() === symbolLabel.toLowerCase());
  };

  // Helper to draw sagging string curves
  const getSaggingPath = (p1, p2) => {
    const midX = (p1.x + p2.x) / 2;
    const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    const sag = dist * 0.12; // Sag factor
    const midY = (p1.y + p2.y) / 2 + sag;
    return `M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`;
  };

  const handleBoardClick = (e) => {
    // Clear selection if clicking the corkboard backdrop directly
    if (e.target.id === 'corkboard-canvas') {
      setSelectedSymbol(null);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px', position: 'relative' }}>
      <CoffeeRing style={{ top: '20px', right: '0' }} />

      {/* Page Header */}
      <div style={{ borderBottom: '2px solid var(--ink)', paddingBottom: '16px', marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div className="case-label" style={{ marginBottom: '4px' }}>SUBCONSCIOUS PATTERN ANALYSIS</div>
            <h1 style={{ fontFamily: '"Special Elite", serif', fontSize: '2.5rem', color: 'var(--ink)', margin: 0, lineHeight: 1.1 }}>
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
              marginLeft: 'auto',
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

      {/* ── CONSPIRACY BOARD SECTION ── */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span className="case-label" style={{ letterSpacing: '0.2em' }}>INVESTIGATION BOARD — SYMBOL LINKAGES</span>
        <div style={{ flex: 1, borderTop: '1px dashed rgba(61,53,40,0.3)' }} />
        {selectedSymbol && (
          <button
            onClick={() => setSelectedSymbol(null)}
            className="btn-stamp"
            style={{ fontSize: '9px', padding: '3px 10px', color: 'var(--stamp-red)' }}
          >
            RESET VIEW
          </button>
        )}
      </div>

      {totalDreams === 0 ? (
        <div className="dossier-card stacked-paper" style={{ padding: '80px', textAlign: 'center', marginBottom: '40px' }}>
          <div className="case-label" style={{ marginBottom: '16px' }}>BOARD STANDBY</div>
          <h3 style={{ fontFamily: '"Special Elite", serif', fontSize: '1.5rem', marginBottom: '12px' }}>
            No Investigation Map Available
          </h3>
          <p style={{ fontFamily: '"Courier Prime", monospace', fontSize: '13px', color: 'var(--silver)', maxWidth: '440px', margin: '0 auto 24px', lineHeight: 1.8 }}>
            Submit dream reports to build active connections. Connected symbols will appear as evidence nodes pinned by red string on the conspiracy board.
          </p>
          <Link to="/record" className="btn-stamp btn-stamp-red">
            ▶ FILE NEW REPORT
          </Link>
        </div>
      ) : (
        <div
          id="corkboard-canvas"
          onClick={handleBoardClick}
          style={{
            position: 'relative',
            width: '100%',
            height: '650px',
            backgroundColor: '#1b140f',
            backgroundImage: 'radial-gradient(#261d15 15%, transparent 16%), radial-gradient(#261d15 15%, transparent 16%)',
            backgroundSize: '8px 8px',
            backgroundPosition: '0 0, 4px 4px',
            border: '12px solid #140d09',
            boxShadow: 'inset 0 10px 40px rgba(0,0,0,0.95), 0 12px 28px rgba(0,0,0,0.4)',
            overflow: 'hidden',
            borderRadius: '2px',
            marginBottom: '40px',
            userSelect: 'none',
          }}
        >
          {/* SVG Red Strings Overlay */}
          <svg
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 5,
            }}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {activeSymbols.map((symbol, sIdx) => {
              const sPos = SYMBOL_POSITIONS[sIdx % SYMBOL_POSITIONS.length];
              return activeDreams.map((dream, dIdx) => {
                const dPos = DREAM_POSITIONS[dIdx % DREAM_POSITIONS.length];
                const connected = isConnected(dream, symbol.label);

                if (!connected) return null;

                // Connection highlights when matching the selected symbol, or when nothing is selected
                const isLineActive = !selectedSymbol || selectedSymbol.toLowerCase() === symbol.label.toLowerCase();

                return (
                  <motion.path
                    key={`${symbol.label}-${dream._id}`}
                    d={getSaggingPath(sPos, dPos)}
                    fill="none"
                    stroke="#a01a1a" // Thread blood-red
                    strokeWidth={isLineActive ? 1.6 : 0.4}
                    opacity={isLineActive ? 0.8 : 0.12}
                    strokeDasharray={isLineActive ? "none" : "2,2"}
                    style={{
                      filter: isLineActive ? 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))' : 'none',
                      transition: 'all 0.4s ease-in-out',
                    }}
                  />
                );
              });
            })}
          </svg>

          {/* Symbol Pinned Evidence Nodes (Left & Right margins) */}
          {activeSymbols.map((symbol, i) => {
            const pos = SYMBOL_POSITIONS[i % SYMBOL_POSITIONS.length];
            const isHighlighted = !selectedSymbol || selectedSymbol.toLowerCase() === symbol.label.toLowerCase();
            const rotation = ROTATIONS[i % ROTATIONS.length];

            return (
              <motion.div
                key={symbol.label}
                onClick={() => setSelectedSymbol(prev => prev === symbol.label ? null : symbol.label)}
                animate={{
                  scale: isHighlighted ? 1 : 0.88,
                  opacity: isHighlighted ? 1 : 0.28,
                  filter: isHighlighted ? 'brightness(1)' : 'brightness(0.65)',
                }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '135px',
                  padding: '12px',
                  backgroundColor: '#faf8f2',
                  border: '1px solid #d4cbb8',
                  boxShadow: isHighlighted ? '0 8px 18px rgba(0,0,0,0.5)' : '0 3px 6px rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                  zIndex: isHighlighted ? 15 : 10,
                  transformOrigin: 'center',
                }}
              >
                {/* Red pushpin head at center top */}
                <div style={{
                  position: 'absolute',
                  top: '-4px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#c92a2a',
                  border: '1.5px solid rgba(255,255,255,0.4)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                  zIndex: 20,
                }} />

                {/* Handwritten Tag content */}
                <div style={{
                  fontFamily: '"Share Tech Mono", monospace',
                  fontSize: '9px',
                  color: 'var(--silver)',
                  letterSpacing: '0.08em',
                  marginBottom: '2px',
                }}>
                  SYMBOL NODE
                </div>
                <div style={{
                  fontFamily: '"Special Elite", serif',
                  fontSize: '1.05rem',
                  color: '#1a1510',
                  lineHeight: 1.1,
                  textTransform: 'uppercase',
                  margin: '4px 0',
                }}>
                  {symbol.label}
                </div>
                <div style={{
                  fontFamily: '"Courier Prime", monospace',
                  fontSize: '10px',
                  color: '#8b1a1a',
                  fontWeight: 'bold',
                }}>
                  STRENGTH: ×{symbol.count}
                </div>
              </motion.div>
            );
          })}

          {/* Dream Pinned Evidence Cards (Center grid) */}
          {activeDreams.map((dream, i) => {
            const pos = DREAM_POSITIONS[i % DREAM_POSITIONS.length];
            // Highlight a dream card if no symbol is selected OR if it contains the selected symbol
            const isHighlighted = !selectedSymbol || isConnected(dream, selectedSymbol);
            const rotation = ROTATIONS[(i + 4) % ROTATIONS.length];

            return (
              <motion.div
                key={dream._id}
                animate={{
                  scale: isHighlighted ? 1 : 0.85,
                  opacity: isHighlighted ? 1 : 0.25,
                  filter: isHighlighted ? 'brightness(1)' : 'brightness(0.6)',
                }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '165px',
                  padding: '12px 14px',
                  backgroundColor: 'var(--paper-dark)',
                  border: '1.5px solid var(--ink-faded)',
                  boxShadow: isHighlighted ? '0 10px 22px rgba(0,0,0,0.5)' : '0 4px 8px rgba(0,0,0,0.3)',
                  zIndex: isHighlighted ? 14 : 9,
                  transformOrigin: 'center',
                }}
              >
                {/* Silver/Metallic pushpin head at center top */}
                <div style={{
                  position: 'absolute',
                  top: '-4px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#868e96',
                  border: '1.5px solid rgba(255,255,255,0.4)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                  zIndex: 20,
                }} />

                {/* Case File tag */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{
                    fontFamily: '"Share Tech Mono", monospace',
                    fontSize: '8px',
                    color: 'var(--silver)',
                    letterSpacing: '0.06em',
                  }}>
                    {makeCaseId(i + 1)}
                  </span>
                  <span style={{
                    fontFamily: '"Share Tech Mono", monospace',
                    fontSize: '8px',
                    color: 'var(--silver)',
                  }}>
                    {new Date(dream.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
                  </span>
                </div>

                {/* Link to Dream Detail */}
                <Link
                  to={`/dreams/${dream._id}`}
                  style={{
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'block',
                  }}
                >
                  <h4 style={{
                    fontFamily: '"Special Elite", serif',
                    fontSize: '0.85rem',
                    color: 'var(--ink)',
                    margin: '6px 0',
                    lineHeight: 1.25,
                    textDecoration: 'underline',
                    textDecorationStyle: 'dotted',
                  }}>
                    {dream.analysis?.title || 'Untitled Case'}
                  </h4>
                </Link>

                {/* Micro emotion badge inside card */}
                {dream.dominantEmotion && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '6px' }}>
                    <EmotionStamp emotion={dream.dominantEmotion} delay={0} size="sm" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Cross-referenced case files */}
      {relatedLinks.length > 0 && (
        <div className="dossier-card" style={{ padding: '28px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div className="case-label">CROSS-REFERENCED CASE FILES</div>
            <div style={{ flex: 1, borderTop: '1px dashed rgba(61,53,40,0.3)' }} />
            <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '9px', color: 'var(--silver)', letterSpacing: '0.1em' }}>
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
                  <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '9px', color: 'var(--silver)', letterSpacing: '0.1em' }}>
                    LINK-{String(i + 1).padStart(3, '0')}
                  </span>
                  <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: '9px', color: 'var(--fixer)', letterSpacing: '0.08em' }}>
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
        fontSize: '9px',
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
