/**
 * Express app factory. Extracted from `server.js` so tests can mount the
 * routing stack against Supertest without spinning up a TCP listener,
 * connecting to MongoDB, or initializing the dream queue.
 *
 * `server.js` is now a thin entry point that calls `createApp()`, hooks
 * up DB + queue, and starts listening.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
const pinoHttp = require('pino-http');
const { nanoid } = require('nanoid');

const logger = require('./services/logger');
const sentry = require('./services/sentry');
const authRoutes = require('./routes/authRoutes');
const dreamRoutes = require('./routes/dreamRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const errorHandler = require('./middleware/errorMiddleware');

function createApp(options = {}) {
  const {
    enableRateLimit = process.env.NODE_ENV !== 'test',
    enableHttpLogger = process.env.NODE_ENV !== 'test',
    corsOrigin = 'http://localhost:5173',
  } = options;

  const app = express();
  app.set('trust proxy', 1);

  app.use(helmet());

  if (enableHttpLogger) {
    app.use(
      pinoHttp({
        logger,
        genReqId: (req, res) => {
          const incoming = req.headers['x-request-id'];
          const id = incoming || nanoid(12);
          res.setHeader('x-request-id', id);
          return id;
        },
        customLogLevel: (req, res, err) => {
          if (err || res.statusCode >= 500) return 'error';
          if (res.statusCode >= 400) return 'warn';
          return 'info';
        },
        serializers: {
          req: (req) => ({ id: req.id, method: req.method, url: req.url }),
          res: (res) => ({ statusCode: res.statusCode }),
        },
      })
    );
  }

  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/storage', express.static(path.join(__dirname, '../storage')));

  if (enableRateLimit) {
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: { message: 'Too many requests from this IP, please try again in 15 minutes.' },
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use('/api', limiter);
  }

  app.use('/api/auth', authRoutes);
  app.use('/api/dreams', dreamRoutes);
  app.use('/api/analytics', analyticsRoutes);

  app.use((req, res, next) => {
    res.status(404);
    next(new Error(`Not Found - ${req.originalUrl}`));
  });

  // Sentry capture middleware runs BEFORE the final error renderer so
  // every unhandled error is forwarded upstream; the local errorHandler
  // still produces the JSON response the client sees.
  app.use(sentry.expressErrorHandler());
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
