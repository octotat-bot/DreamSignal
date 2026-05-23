/**
 * Backend Sentry plumbing.
 *
 * Activates only when `SENTRY_DSN` is set in the environment, so deployments
 * without Sentry stay free of overhead and don't even pull in the SDK's
 * instrumentation. Initialization happens BEFORE the Express app + DB
 * imports in `server.js` so Sentry's auto-instrumented `http` + `express`
 * hooks attach to the right module instances.
 *
 * To turn on:
 *   1. Create a Node project at https://sentry.io and grab its DSN.
 *   2. Set SENTRY_DSN in backend/.env (and optionally SENTRY_TRACES_SAMPLE_RATE).
 *   3. Restart the server — the boot log will report "Sentry initialised".
 */
const logger = require('./logger').child({ scope: 'sentry' });

let sentry = null;
let initialized = false;

function init() {
  if (initialized) return sentry;
  initialized = true;

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.info('SENTRY_DSN not set — error reporting disabled');
    return null;
  }

  try {
    // Lazy require so a deployment without SENTRY_DSN doesn't pull the
    // entire instrumentation stack into the process on every boot.
    sentry = require('@sentry/node');
    sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.SENTRY_RELEASE || undefined,
      // Performance traces default to 10% — high enough to spot regressions,
      // low enough to keep ingest cheap. Override per environment.
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
      // Don't ship request bodies — dream transcripts are intimate and
      // shouldn't leave the user's database into a 3rd-party log sink.
      sendDefaultPii: false,
      beforeSend(event) {
        if (event.request) {
          delete event.request.data;
          delete event.request.cookies;
        }
        return event;
      },
    });
    logger.info({ environment: process.env.NODE_ENV }, 'Sentry initialised');
    return sentry;
  } catch (err) {
    logger.warn({ err: err.message }, '@sentry/node import failed — continuing without it');
    sentry = null;
    return null;
  }
}

/** Express error middleware. Forwards captured errors to Sentry, then
 *  delegates to the next handler so normal error rendering still runs. */
function expressErrorHandler() {
  return (err, req, res, next) => {
    if (sentry && err) {
      try {
        sentry.captureException(err, {
          tags: { requestId: req.id || null },
          extra: {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
          },
        });
      } catch {
        /* never let a Sentry hiccup crash the request handler */
      }
    }
    next(err);
  };
}

module.exports = { init, expressErrorHandler };
