import React from 'react';
import { Link } from 'react-router-dom';
import { reportError } from '../lib/sentry';

/**
 * Route-level error boundary, styled to match the redacted-dossier theme.
 *
 * Catches render-time errors in its subtree, logs them, and shows a "case
 * file corrupted" fallback page with a link back to the dashboard, instead
 * of unmounting the whole app and leaving the user staring at blank paper.
 *
 * Reset key (a route's pathname, passed in by RouteErrorBoundary below) clears
 * the error state on navigation so the user can recover by moving to another
 * page without a full reload.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error('[ErrorBoundary]', error, info?.componentStack);
    // Forward to Sentry if configured. No-ops without VITE_SENTRY_DSN.
    reportError(error, { componentStack: info?.componentStack });
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null, info: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    const { error } = this.state;

    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '64px 48px', position: 'relative' }}>
        <div style={{ borderBottom: '2px solid var(--ink)', paddingBottom: '16px', marginBottom: '32px' }}>
          <div className="case-label" style={{ marginBottom: '4px' }}>
            INCIDENT REPORT — RENDER FAILURE
          </div>
          <h1 style={{ fontFamily: '"Special Elite", serif', fontSize: '2rem', color: 'var(--ink)', margin: 0 }}>
            Case File Corrupted
          </h1>
        </div>

        <div className="dossier-card" style={{ padding: '32px', marginBottom: '24px', position: 'relative' }}>
          {/* Top-right red CORRUPTED stamp */}
          <div
            style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              border: '3px solid var(--stamp-red)',
              borderRadius: '2px',
              padding: '6px 14px',
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: '0.65rem',
              letterSpacing: '0.18em',
              color: 'var(--stamp-red)',
              boxShadow: 'inset 0 0 0 1px var(--stamp-red)',
              transform: 'rotate(3deg)',
              opacity: 0.9,
            }}
          >
            CORRUPTED
          </div>

          <div className="case-label" style={{ marginBottom: '14px' }}>
            STATEMENT FROM RECORDING DEVICE
          </div>
          <p style={{ fontFamily: '"Courier Prime", monospace', fontSize: '13px', color: 'var(--ink-faded)', lineHeight: 1.9, marginTop: 0 }}>
            The film developed improperly. We could not produce a readable image of this
            case file. The originating record may still be intact — try navigating away
            and back, or return to the archive.
          </p>

          <pre
            style={{
              backgroundColor: 'var(--redact)',
              color: 'var(--fixer)',
              padding: '14px 16px',
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: '11px',
              lineHeight: 1.55,
              overflow: 'auto',
              borderLeft: '3px solid var(--stamp-red)',
              margin: '8px 0 16px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
{String(error?.message || error || 'Unknown error')}
          </pre>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/dashboard" className="btn-stamp btn-stamp-ink" style={{ fontSize: '0.7rem' }}>
              ▶ RETURN TO ARCHIVE
            </Link>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-stamp btn-stamp-red"
              style={{ fontSize: '0.7rem' }}
            >
              ▶ RE-DEVELOP FILM
            </button>
          </div>
        </div>

        <div
          style={{
            fontFamily: '"Share Tech Mono", monospace',
            fontSize: '0.55rem',
            color: 'var(--silver)',
            letterSpacing: '0.1em',
            display: 'flex',
            justifyContent: 'space-between',
            borderTop: '1px dashed rgba(61,53,40,0.3)',
            paddingTop: '12px',
          }}
        >
          <span>DREAMSIGNAL CONTAINMENT — UI ERROR BOUNDARY</span>
          <span>STAMPED: {new Date().toLocaleString()}</span>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
