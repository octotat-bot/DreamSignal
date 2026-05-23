require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
const pinoHttp = require('pino-http');
const { nanoid } = require('nanoid');

const connectDB = require('./config/db');
const logger = require('./services/logger');
const dreamQueue = require('./services/dreamQueue');
const authRoutes = require('./routes/authRoutes');
const dreamRoutes = require('./routes/dreamRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const errorHandler = require('./middleware/errorMiddleware');

const app = express();

// Connect to MongoDB Database
connectDB();

// Security HTTP Headers
app.use(helmet());

// Structured HTTP logging — every request gets a stable request-id that
// is echoed back as the `x-request-id` response header AND attached to
// req.log, so a single dream submission can be traced through every
// log line by grepping the same id.
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

// CORS configuration (Limit origin to React Dev server)
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// Request body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static storage folder (for audio files playback)
app.use('/storage', express.static(path.join(__dirname, '../storage')));

// Rate Limiter: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { message: 'Too many requests from this IP, please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/dreams', dreamRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 Route handler
app.use((req, res, next) => {
  res.status(404);
  next(new Error(`Not Found - ${req.originalUrl}`));
});

// Global Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  logger.info(
    { port: PORT, env: process.env.NODE_ENV || 'development' },
    'Express server started'
  );
  // Probe Redis once at boot so we know upfront whether dream pipelines
  // will run in queued or inline mode.
  dreamQueue.init().then((queued) => {
    logger.info({ mode: queued ? 'queued' : 'inline' }, 'Dream pipeline runtime resolved');
  });
});

const shutdown = async (signal) => {
  logger.info({ signal }, 'Shutting down');
  try { await dreamQueue.shutdown(); } catch (e) { logger.warn({ err: e.message }, 'Queue shutdown error'); }
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
