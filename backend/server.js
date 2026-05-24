require('dotenv').config();
const axios = require('axios');

// Sentry must be initialized before any other imports so its auto-
// instrumentation can patch http/express at load time.
require('./services/sentry').init();

const connectDB = require('./config/db');
const logger = require('./services/logger');
const dreamQueue = require('./services/dreamQueue');
const { createApp } = require('./app');

connectDB();

const app = createApp({
  corsOrigin: process.env.FRONTEND_URL || 'http://localhost:5173',
});

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

  if (process.env.NODE_ENV === 'production') {
    setInterval(async () => {
      try {
        await axios.get(`${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/health`);
        logger.info('AI service ping: ok');
      } catch (err) {
        logger.warn({ err: err.message }, 'AI service ping failed');
      }
    }, 14 * 60 * 1000); // every 14 minutes
  }
});

const shutdown = async (signal) => {
  logger.info({ signal }, 'Shutting down');
  try { await dreamQueue.shutdown(); } catch (e) { logger.warn({ err: e.message }, 'Queue shutdown error'); }
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
