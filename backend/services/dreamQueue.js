/**
 * BullMQ-backed dream-processing queue with a graceful inline fallback.
 *
 * Two responsibilities:
 *   1. Try to connect to Redis at startup. If a connection is established
 *      within a short timeout, wire up a BullMQ Queue + Worker that runs
 *      the dream pipeline asynchronously with automatic retries and
 *      exponential backoff.
 *   2. If Redis is unreachable (no REDIS_URL, server not running, etc.)
 *      we silently fall back to inline `processDream(...)` — exactly the
 *      old fire-and-forget behavior — so the app still works in a
 *      `node server.js` setup without external infra.
 *
 * Callers use the same `enqueueDream(...)` API regardless of backend.
 *
 * Notes:
 *   - Workers run in-process for simplicity. For a multi-instance
 *     deployment, split the worker out into its own process and have it
 *     `require('./dreamController').processDream` directly.
 *   - Audio files are uploaded to Cloudinary before the job is enqueued,
 *     so only the Cloudinary URL (a plain string) needs to be serialized
 *     into the job payload.
 */

const logger = require('./logger').child({ scope: 'dreamQueue' });

const QUEUE_NAME = 'dream-processing';
const REDIS_URL = process.env.REDIS_URL || '';
const REDIS_CONNECT_TIMEOUT_MS = 1500;

let queue = null;
let worker = null;
let initPromise = null;

/**
 * Attempt to initialize the BullMQ queue + worker. Resolves to `true` if
 * we're now in queued-mode, `false` if we should fall back to inline.
 */
function init() {
  if (initPromise) return initPromise;
  if (!REDIS_URL) {
    logger.info('REDIS_URL not set — using inline dream processing');
    initPromise = Promise.resolve(false);
    return initPromise;
  }

  initPromise = (async () => {
    let Redis, Queue, Worker;
    try {
      // Require lazily so a missing peer dep doesn't crash at module load
      // — this matters for the inline-fallback path.
      ({ default: Redis } = require('ioredis'));
      ({ Queue, Worker } = require('bullmq'));
    } catch (err) {
      logger.warn({ err: err.message }, 'bullmq/ioredis not installed — falling back to inline');
      return false;
    }

    // ioredis tries forever by default; we give Redis a short window to
    // accept the connection and fall back if it's not running.
    const conn = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
      retryStrategy: () => null, // no auto-retry during the probe
    });

    try {
      await conn.connect();
    } catch (err) {
      logger.warn({ err: err.message }, 'Redis unreachable — falling back to inline');
      try { conn.disconnect(); } catch {}
      return false;
    }

    queue = new Queue(QUEUE_NAME, { connection: conn.duplicate() });

    worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        // Require here too, to break the circular require with
        // dreamController (which itself requires this file).
        const { processDream } = require('../controllers/dreamController');
        const { dreamId, userId, audioUrl, requestId } = job.data;
        await processDream(dreamId, userId, audioUrl || null, requestId);
      },
      {
        connection: conn.duplicate(),
        concurrency: Number(process.env.DREAM_QUEUE_CONCURRENCY || 2),
      }
    );

    worker.on('failed', (job, err) => {
      logger.error(
        { jobId: job?.id, dreamId: job?.data?.dreamId, err: err?.message },
        'Dream job failed'
      );
    });
    worker.on('completed', (job) => {
      logger.debug({ jobId: job.id, dreamId: job.data?.dreamId }, 'Dream job completed');
    });

    logger.info({ queue: QUEUE_NAME }, 'BullMQ dream queue ready');
    return true;
  })();

  return initPromise;
}

/**
 * Enqueue a dream for background processing. Falls back to inline
 * execution if the queue isn't initialized.
 *
 * @param {string}      dreamId    - Mongoose ObjectId of the dream document
 * @param {string}      userId     - Mongoose ObjectId of the owning user
 * @param {string|null} audioUrl   - Cloudinary URL of the uploaded audio (null for text dreams)
 * @param {string|null} requestId  - x-request-id for log correlation
 */
async function enqueueDream(dreamId, userId, audioUrl, requestId) {
  const queued = await init();
  if (queued && queue) {
    await queue.add(
      'process',
      {
        dreamId: String(dreamId),
        userId: String(userId),
        audioUrl: audioUrl || null,
        requestId: requestId || null,
      },
      {
        attempts: Number(process.env.DREAM_QUEUE_ATTEMPTS || 3),
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: { age: 60 * 60, count: 100 },
        removeOnFail: { age: 24 * 60 * 60 },
      }
    );
    return { mode: 'queued' };
  }

  // Inline fallback — identical to the pre-queue fire-and-forget pattern.
  const { processDream } = require('../controllers/dreamController');
  processDream(dreamId, userId, audioUrl || null, requestId).catch((err) => {
    logger.error({ err: err.message, dreamId: String(dreamId) }, 'Inline pipeline error');
  });
  return { mode: 'inline' };
}

async function shutdown() {
  if (worker) await worker.close();
  if (queue)  await queue.close();
}

module.exports = { enqueueDream, init, shutdown };
