import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authAPI, dreamsAPI, analyticsAPI } from '../api/api';
import CoffeeRing from '../components/CoffeeRing';

/* Local-date key (YYYY-MM-DD) — shared with the Dashboard streak counter so
   a dream filed at 23:55 doesn't count as a separate "day" from one filed
   at 00:05 relative to the user's wall clock. Duplicated rather than
   shared because it's 6 lines and avoids a cross-page import cycle. */
const dayKey = (d) => {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const computeStreaks = (dates) => {
  if (!dates || dates.length === 0) return { current: 0, longest: 0 };
  const days = Array.from(new Set(dates.map(dayKey))).sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = Math.round(
      (new Date(days[i]) - new Date(days[i - 1])) / (1000 * 60 * 60 * 24)
    );
    if (diff === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }
  const today = dayKey(new Date());
  const yesterday = dayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const last = days[days.length - 1];
  if (last !== today && last !== yesterday) return { current: 0, longest };
  let current = 1;
  for (let i = days.length - 2; i >= 0; i--) {
    const diff = Math.round(
      (new Date(days[i + 1]) - new Date(days[i])) / (1000 * 60 * 60 * 24)
    );
    if (diff === 1) current += 1;
    else break;
  }
  return { current, longest };
};

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';

const daysSince = (d) => {
  if (!d) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24)));
};

/* Tiny styled label-value row used inside the identity card. */
const Field = ({ label, value, mono = false }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: '16px',
      padding: '10px 0',
      borderBottom: '1px dashed rgba(61,53,40,0.25)',
    }}
  >
    <span
      className="case-label"
      style={{ flexShrink: 0 }}
    >
      {label}
    </span>
    <span
      style={{
        fontFamily: mono ? '"Share Tech Mono", monospace' : '"Courier Prime", monospace',
        fontSize: mono ? '0.8rem' : '0.85rem',
        color: 'var(--ink)',
        textAlign: 'right',
        wordBreak: 'break-word',
      }}
    >
      {value}
    </span>
  </div>
);

const StatTile = ({ label, value, sub }) => (
  <div className="dossier-card" style={{ padding: '20px 24px' }}>
    <div className="case-label" style={{ marginBottom: '8px' }}>{label}</div>
    <div
      style={{
        fontFamily: '"Special Elite", serif',
        fontSize: '1.6rem',
        color: 'var(--ink)',
        lineHeight: 1.2,
      }}
    >
      {value}
    </div>
    {sub && (
      <div
        style={{
          fontFamily: '"Courier Prime", monospace',
          fontSize: '11px',
          color: 'var(--silver)',
          marginTop: '4px',
        }}
      >
        {sub}
      </div>
    )}
  </div>
);

/* ── Avatar Component ── */
const AvatarUpload = ({ avatar, username, onUploaded, onRemoved }) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [hovering, setHovering] = useState(false);
  const toast = useToast();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected
    e.target.value = '';

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB.');
      return;
    }

    try {
      setUploading(true);
      const data = await authAPI.uploadAvatar(file);
      onUploaded(data.avatar);
      toast.success('Photograph attached to dossier.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload photograph.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (e) => {
    e.stopPropagation();
    try {
      setUploading(true);
      await authAPI.removeAvatar();
      onRemoved();
      toast.success('Photograph removed.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove photograph.');
    } finally {
      setUploading(false);
    }
  };

  const initial = username?.charAt(0)?.toUpperCase() || '?';

  return (
    <div
      style={{ position: 'relative', flexShrink: 0 }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        id="avatar-upload-input"
      />

      {/* Avatar circle */}
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          width: '96px',
          height: '96px',
          borderRadius: '50%',
          border: '2.5px solid var(--ink)',
          overflow: 'hidden',
          cursor: uploading ? 'wait' : 'pointer',
          position: 'relative',
          backgroundColor: 'rgba(61,53,40,0.06)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
          transition: 'box-shadow 0.3s, border-color 0.3s',
          ...(hovering && !uploading ? { borderColor: 'var(--stamp-blue)', boxShadow: '0 2px 18px rgba(0,0,0,0.25)' } : {}),
        }}
        title="Click to upload photograph"
      >
        {avatar ? (
          <img
            src={avatar}
            alt="Subject photograph"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'sepia(0.12) contrast(1.05)',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: '"Special Elite", serif',
              fontSize: '2.2rem',
              color: 'var(--ink)',
              opacity: 0.6,
            }}
          >
            {initial}
          </div>
        )}

        {/* Hover overlay */}
        {hovering && !uploading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
            }}
          >
            <span
              style={{
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: '0.5rem',
                color: '#fff',
                letterSpacing: '0.1em',
                textAlign: 'center',
                lineHeight: 1.4,
              }}
            >
              {avatar ? 'REPLACE\nPHOTO' : 'ATTACH\nPHOTO'}
            </span>
          </div>
        )}

        {/* Uploading spinner */}
        {uploading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
          </div>
        )}
      </div>

      {/* Remove button */}
      {avatar && hovering && !uploading && (
        <button
          onClick={handleRemove}
          title="Remove photograph"
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            border: '1.5px solid var(--stamp-red)',
            backgroundColor: 'var(--paper)',
            color: 'var(--stamp-red)',
            fontSize: '11px',
            fontFamily: '"Share Tech Mono", monospace',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            padding: 0,
            zIndex: 2,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
};

const ProfilePage = () => {
  const { user, logout, refreshProfile, updateAvatar } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [dreams, setDreams] = useState([]);
  const [patterns, setPatterns] = useState(null);
  const [loading, setLoading] = useState(true);

  // Password change form
  const [pwOpen, setPwOpen] = useState(false);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNext, setPwNext] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  // Close-case-file (delete account) confirmation form
  const [closeOpen, setCloseOpen] = useState(false);
  const [closePassword, setClosePassword] = useState('');
  const [closeAcknowledge, setCloseAcknowledge] = useState('');
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        await refreshProfile();
        const [dreamsResp, patternsResp] = await Promise.all([
          dreamsAPI.getDreams({ page: 1, limit: 365 }),
          analyticsAPI.getPatterns().catch(() => null),
        ]);
        setDreams(dreamsResp.dreams || []);
        setPatterns(patternsResp);
      } catch {
        toast.error('Failed to load profile dossier.');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Derived stats
  // ─────────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const streak = computeStreaks(dreams.map((d) => d.createdAt));
    const totalDreams = patterns?.totalDreams ?? dreams.filter((d) => d.processingStatus === 'complete').length;
    const lucidCount = dreams.filter((d) => d.isLucid).length;
    const recurringCount = dreams.filter((d) => d.isRecurring).length;
    const nightmareCount = dreams.filter((d) => d.isNightmare).length;

    const emotionTrends = patterns?.emotionTrends || [];
    const symbolFreq = patterns?.symbolFrequency || [];
    const dominantEmotion = emotionTrends.length
      ? [...emotionTrends].sort(
          (a, b) => (b.dreamCount - a.dreamCount) || (b.averageScore - a.averageScore)
        )[0].label
      : null;
    const topSymbol = symbolFreq.length ? symbolFreq[0].label : null;

    return {
      streak,
      totalDreams,
      lucidCount,
      recurringCount,
      nightmareCount,
      dominantEmotion,
      topSymbol,
    };
  }, [dreams, patterns]);

  const memberDays = daysSince(user?.createdAt);

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (pwSaving) return;
    if (pwNext.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }
    if (pwNext !== pwConfirm) {
      toast.error('New password and confirmation do not match.');
      return;
    }
    if (pwNext === pwCurrent) {
      toast.error('New password must differ from the current one.');
      return;
    }
    try {
      setPwSaving(true);
      await authAPI.updatePassword({ currentPassword: pwCurrent, newPassword: pwNext });
      toast.success('Credentials rotated.');
      setPwCurrent('');
      setPwNext('');
      setPwConfirm('');
      setPwOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password update failed.');
    } finally {
      setPwSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      await dreamsAPI.exportArchive();
      toast.success('Archive exported.');
    } catch {
      toast.error('Export failed.');
    }
  };

  const handleCloseCaseFile = async (e) => {
    e.preventDefault();
    if (closing) return;
    if (closeAcknowledge.trim().toUpperCase() !== 'CLOSE FILE') {
      toast.error('Type CLOSE FILE exactly to confirm.');
      return;
    }
    if (!closePassword) {
      toast.error('Password required to close file.');
      return;
    }
    try {
      setClosing(true);
      await authAPI.deleteAccount({ password: closePassword });
      toast.success('Case file closed. Goodbye.');
      logout();
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to close file.');
      setClosing(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton" style={{ height: '80px', marginBottom: '8px' }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px', position: 'relative' }}>
      <CoffeeRing style={{ top: '20px', right: '0px' }} />

      {/* ── HEADER ── */}
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
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <AvatarUpload
            avatar={user?.avatar}
            username={user?.username}
            onUploaded={(url) => updateAvatar(url)}
            onRemoved={() => updateAvatar(null)}
          />
          <div>
            <div className="case-label" style={{ marginBottom: '4px' }}>
              INVESTIGATOR DOSSIER — CLEARANCE: LEVEL 3
            </div>
            <h1
              style={{
                fontFamily: '"Special Elite", serif',
                fontSize: '2rem',
                color: 'var(--ink)',
                margin: 0,
              }}
            >
              {user?.username || 'Unknown Subject'}
            </h1>
          </div>
        </div>

        <motion.div
          initial={{ scale: 2, rotate: '-6deg', opacity: 0 }}
          animate={{ scale: 1, rotate: '2deg', opacity: 0.85 }}
          transition={{ duration: 0.4, delay: 0.4, ease: [0.175, 0.885, 0.32, 1.275] }}
          style={{
            border: '3px solid var(--stamp-blue)',
            borderRadius: '2px',
            padding: '5px 14px',
            fontFamily: '"Share Tech Mono", monospace',
            fontSize: '0.65rem',
            letterSpacing: '0.15em',
            color: 'var(--stamp-blue)',
            boxShadow: 'inset 0 0 0 1px var(--stamp-blue)',
          }}
        >
          ON RECORD
        </motion.div>
      </motion.div>

      {/* ── STATS GRID ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1px',
          backgroundColor: 'rgba(61,53,40,0.25)',
          marginBottom: '40px',
        }}
      >
        <StatTile label="CASES FILED" value={stats.totalDreams} sub="total archived" />
        <StatTile
          label="CURRENT STREAK"
          value={stats.streak.current > 0 ? `${stats.streak.current}D` : '—'}
          sub={
            stats.streak.longest > stats.streak.current
              ? `best ${stats.streak.longest} day${stats.streak.longest === 1 ? '' : 's'}`
              : 'consecutive days'
          }
        />
        <StatTile
          label="LUCID INCIDENTS"
          value={stats.lucidCount}
          sub={stats.lucidCount === 0 ? 'no controlled crossings' : 'controlled crossings'}
        />
        <StatTile
          label="RECURRING"
          value={stats.recurringCount}
          sub={stats.recurringCount === 0 ? 'no repeats logged' : 'repeat sightings'}
        />
        <StatTile
          label="NIGHTMARES"
          value={stats.nightmareCount}
          sub={stats.nightmareCount === 0 ? 'no red-flag entries' : 'red-flag entries'}
        />
      </motion.div>

      {/* ── TWO-COLUMN BODY ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.1fr 0.9fr',
          gap: '40px',
          alignItems: 'start',
        }}
      >
        {/* LEFT — Identity + Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div className="dossier-card" style={{ padding: '28px 32px' }}>
            <div className="case-label" style={{ marginBottom: '16px' }}>SUBJECT IDENTITY</div>
            <Field label="HANDLE"        value={user?.username || '—'} />
            <Field label="CONTACT CHANNEL" value={user?.email || '—'} />
            <Field label="ENROLLED"      value={formatDate(user?.createdAt)} />
            <Field
              label="ACTIVE FOR"
              value={`${memberDays} day${memberDays === 1 ? '' : 's'}`}
              mono
            />
            <Field
              label="DOMINANT SIGNAL"
              value={stats.dominantEmotion ? stats.dominantEmotion.toUpperCase() : 'INSUFFICIENT DATA'}
              mono
            />
            <Field
              label="RECURRING SYMBOL"
              value={stats.topSymbol ? stats.topSymbol.toUpperCase() : '—'}
              mono
            />
          </div>

          {/* Investigator's notes — flavor block that just summarizes what the
              numbers above mean in plain English. Pure UI, no data fetch. */}
          <div className="dossier-card negative-frame" style={{ padding: '28px 32px' }}>
            <div className="case-label" style={{ marginBottom: '12px' }}>
              FIELD NOTES — STATEMENT OF RECORD
            </div>
            <p
              style={{
                fontFamily: '"Courier Prime", monospace',
                fontSize: '13px',
                color: 'var(--ink-faded)',
                lineHeight: 1.9,
                marginTop: 0,
              }}
            >
              Subject has logged{' '}
              <strong style={{ color: 'var(--ink)' }}>{stats.totalDreams}</strong> case
              {stats.totalDreams === 1 ? '' : 's'} over{' '}
              <strong style={{ color: 'var(--ink)' }}>{memberDays || 0}</strong> day
              {memberDays === 1 ? '' : 's'} on file.
              {stats.streak.current > 0 && (
                <>
                  {' '}Active reporting streak of{' '}
                  <strong style={{ color: 'var(--ink)' }}>{stats.streak.current}</strong> consecutive day
                  {stats.streak.current === 1 ? '' : 's'}.
                </>
              )}
              {stats.lucidCount > 0 && (
                <>
                  {' '}<strong style={{ color: 'var(--ink)' }}>{stats.lucidCount}</strong> lucid
                  crossing{stats.lucidCount === 1 ? '' : 's'} reported.
                </>
              )}
              {stats.dominantEmotion && (
                <>
                  {' '}Prevailing affect:{' '}
                  <strong style={{ color: 'var(--ink)', textTransform: 'uppercase' }}>
                    {stats.dominantEmotion}
                  </strong>.
                </>
              )}
            </p>
            <div
              style={{
                marginTop: '12px',
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: '0.55rem',
                color: 'var(--silver)',
                letterSpacing: '0.12em',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>▶ ATTESTED BY: AUTOMATED ANALYST</span>
              <span>STAMPED: {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* RIGHT — Actions column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Archive actions */}
          <div className="dossier-card" style={{ padding: '24px' }}>
            <div className="case-label" style={{ marginBottom: '16px' }}>ARCHIVE OPERATIONS</div>

            <button
              type="button"
              onClick={handleExport}
              disabled={stats.totalDreams === 0}
              className="btn-stamp"
              style={{
                display: 'block',
                width: '100%',
                marginBottom: '10px',
                color: 'var(--stamp-blue)',
                opacity: stats.totalDreams === 0 ? 0.4 : 1,
                cursor: stats.totalDreams === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              ▼ EXPORT ARCHIVE (.JSON)
            </button>

            <Link
              to="/timeline"
              className="btn-stamp btn-stamp-ink"
              style={{ display: 'block', width: '100%', marginBottom: '10px', textAlign: 'center' }}
            >
              ▶ BROWSE ALL CASE FILES
            </Link>

            <Link
              to="/record"
              className="btn-stamp btn-stamp-red"
              style={{ display: 'block', width: '100%', textAlign: 'center' }}
            >
              ▶ FILE NEW REPORT
            </Link>
          </div>

          {/* Credentials */}
          <div className="dossier-card" style={{ padding: '24px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: pwOpen ? '14px' : '0',
              }}
            >
              <div className="case-label">CREDENTIAL ROTATION</div>
              <button
                type="button"
                onClick={() => {
                  setPwOpen((v) => !v);
                  setPwCurrent('');
                  setPwNext('');
                  setPwConfirm('');
                }}
                className="btn-stamp btn-stamp-ink"
                style={{ fontSize: '0.55rem' }}
                aria-expanded={pwOpen}
                aria-controls="rotate-password-panel"
              >
                {pwOpen ? '✕ CANCEL' : '✎ ROTATE'}
              </button>
            </div>

            {pwOpen && (
              <form id="rotate-password-panel" onSubmit={handlePasswordSubmit}>
                <PasswordInput
                  label="CURRENT PASSWORD"
                  value={pwCurrent}
                  onChange={setPwCurrent}
                  autoComplete="current-password"
                />
                <PasswordInput
                  label="NEW PASSWORD (8+ CHARS)"
                  value={pwNext}
                  onChange={setPwNext}
                  autoComplete="new-password"
                />
                <PasswordInput
                  label="CONFIRM NEW PASSWORD"
                  value={pwConfirm}
                  onChange={setPwConfirm}
                  autoComplete="new-password"
                />
                <button
                  type="submit"
                  disabled={pwSaving}
                  className="btn-stamp btn-stamp-primary"
                  style={{ width: '100%', marginTop: '8px' }}
                >
                  {pwSaving ? 'STAMPING…' : '✓ STAMP & ARCHIVE'}
                </button>
              </form>
            )}
          </div>

          {/* Destruction */}
          <div
            className="dossier-card"
            style={{
              padding: '24px',
              border: '1px dashed rgba(139,30,30,0.5)',
              backgroundColor: 'rgba(139,30,30,0.04)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: closeOpen ? '14px' : '0',
              }}
            >
              <div className="case-label" style={{ color: 'var(--stamp-red)' }}>
                FILE TERMINATION
              </div>
              <button
                type="button"
                onClick={() => {
                  setCloseOpen((v) => !v);
                  setClosePassword('');
                  setCloseAcknowledge('');
                }}
                className="btn-stamp btn-stamp-red"
                style={{ fontSize: '0.55rem' }}
                aria-expanded={closeOpen}
                aria-controls="close-file-panel"
              >
                {closeOpen ? '✕ CANCEL' : '⌧ CLOSE FILE'}
              </button>
            </div>

            {!closeOpen && (
              <p
                style={{
                  fontFamily: '"Courier Prime", monospace',
                  fontSize: '12px',
                  color: 'var(--ink-faded)',
                  lineHeight: 1.7,
                  marginTop: 0,
                  marginBottom: 0,
                }}
              >
                Permanently destroy this dossier — every case file, every audio reel, every pattern aggregate. This action cannot be reversed.
              </p>
            )}

            {closeOpen && (
              <form id="close-file-panel" onSubmit={handleCloseCaseFile}>
                <p
                  style={{
                    fontFamily: '"Courier Prime", monospace',
                    fontSize: '12px',
                    color: 'var(--stamp-red)',
                    lineHeight: 1.7,
                    marginTop: 0,
                    marginBottom: '14px',
                  }}
                >
                  This will permanently delete your account and{' '}
                  <strong>{stats.totalDreams}</strong> case file
                  {stats.totalDreams === 1 ? '' : 's'}. Export the archive first if you want a copy.
                </p>
                <PasswordInput
                  label="PASSWORD"
                  value={closePassword}
                  onChange={setClosePassword}
                  autoComplete="current-password"
                />
                <label
                  className="case-label"
                  style={{ display: 'block', marginBottom: '4px' }}
                  htmlFor="close-acknowledge-input"
                >
                  TYPE “CLOSE FILE” TO CONFIRM
                </label>
                <input
                  id="close-acknowledge-input"
                  type="text"
                  value={closeAcknowledge}
                  onChange={(e) => setCloseAcknowledge(e.target.value)}
                  autoComplete="off"
                  style={inputStyle}
                />
                <button
                  type="submit"
                  disabled={closing}
                  className="btn-stamp"
                  style={{
                    width: '100%',
                    marginTop: '8px',
                    color: 'var(--stamp-red)',
                    borderColor: 'var(--stamp-red)',
                  }}
                >
                  {closing ? 'CLOSING…' : '⌧ CLOSE FILE PERMANENTLY'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Small subcomponents — kept local because they're only used here
// ─────────────────────────────────────────────────────────────────────────────

const inputStyle = {
  display: 'block',
  width: '100%',
  padding: '8px 10px',
  marginBottom: '12px',
  backgroundColor: 'var(--paper)',
  border: '1px solid rgba(61,53,40,0.35)',
  borderRadius: '2px',
  fontFamily: '"Courier Prime", monospace',
  fontSize: '13px',
  color: 'var(--ink)',
  outline: 'none',
};

const PasswordInput = ({ label, value, onChange, autoComplete }) => {
  const id = `pwd-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <>
      <label className="case-label" htmlFor={id} style={{ display: 'block', marginBottom: '4px' }}>
        {label}
      </label>
      <input
        id={id}
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        style={inputStyle}
      />
    </>
  );
};

export default ProfilePage;
