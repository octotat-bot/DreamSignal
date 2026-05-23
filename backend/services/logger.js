/**
 * Centralized pino logger with sane defaults for development and
 * production. Use this everywhere instead of `console.log` so log lines
 * are structured JSON in production (greppable, ship-to-Loki/Sentry
 * friendly) and pretty-printed locally for readability.
 *
 *     const log = require('../services/logger').child({ scope: 'dreamPipeline' });
 *     log.info({ dreamId }, 'Pipeline started');
 *     log.error({ dreamId, err }, 'Pipeline failed');
 *
 * pino-http (wired in server.js) adds a `req.log` with the request-id
 * already attached, so any handler can call `req.log.info(...)`.
 */

const pino = require('pino');

const isDev = (process.env.NODE_ENV || 'development') !== 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  base: { service: 'dreamsignal-backend' },
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token'],
    remove: true,
  },
  // Pretty-print in development; pino-pretty is a peer dep that ships
  // with pino's transports. Falling back to JSON if it's not installed
  // (e.g. inside a slim production container) keeps boot crash-free.
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss.l',
          ignore: 'pid,hostname,service',
        },
      }
    : undefined,
});

module.exports = logger;
