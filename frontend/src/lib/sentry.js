/**
 * Frontend Sentry plumbing.
 *
 * No-ops unless `VITE_SENTRY_DSN` is set at build time. When enabled it
 * captures unhandled errors, React render crashes (via the ErrorBoundary
 * fallback), and a low-rate sample of performance traces.
 *
 * To turn on:
 *   1. Create a React project at https://sentry.io and grab its DSN.
 *   2. Add `VITE_SENTRY_DSN=...` to `frontend/.env` (and optionally a
 *      `VITE_SENTRY_TRACES_SAMPLE_RATE`).
 *   3. Restart `npm run dev` so Vite picks up the new env var.
 */
import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (!DSN) return false;
  try {
    Sentry.init({
      dsn: DSN,
      environment: import.meta.env.MODE || 'development',
      release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
      tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.1),
      // Session-replay disabled by default — opt in by adding the
      // `Sentry.replayIntegration()` integration here. Dream transcripts
      // are intimate and shouldn't leak into a replay sink without
      // explicit user consent.
      sendDefaultPii: false,
    });
    return true;
  } catch (err) {
    console.warn('Sentry init failed:', err?.message);
    return false;
  }
}

/**
 * Report a captured error explicitly. Useful from ErrorBoundary, async
 * handlers, and anywhere we already log to console.
 */
export function reportError(err, context = {}) {
  if (!DSN) return;
  try {
    Sentry.captureException(err, { extra: context });
  } catch {
    /* never escalate a Sentry hiccup into a render crash */
  }
}
