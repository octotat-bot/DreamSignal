/**
 * In-process pub/sub for dream-processing stage events.
 *
 * The `processDream` pipeline (controllers/dreamController.js) emits stage
 * transitions to this emitter. The SSE route (routes/dreamRoutes.js) lets
 * the frontend subscribe to a single dreamId, so the "Developing Film"
 * screen animates in real time instead of polling every 2 seconds.
 *
 * Trade-off: this is a single-process EventEmitter — it works fine on a
 * single Express instance but would need Redis pub/sub (or similar) for a
 * horizontally-scaled deployment. Acceptable for now; replaceable later
 * by swapping `emitter` for a Redis adapter without touching callers.
 */

const { EventEmitter } = require('events');

const emitter = new EventEmitter();
// Each dreamId may have multiple subscribers (e.g. multiple tabs); raise
// the listener cap to avoid Node's default 10-listener warning.
emitter.setMaxListeners(0);

function eventName(dreamId) {
  return `dream:${String(dreamId)}`;
}

/**
 * Emit a stage event for a dream.
 *
 * @param {string} dreamId
 * @param {object} payload  e.g. { stage: 'transcribed', processingStatus: 'processing' }
 */
function emit(dreamId, payload) {
  emitter.emit(eventName(dreamId), {
    ...payload,
    dreamId: String(dreamId),
    timestamp: new Date().toISOString(),
  });
}

/**
 * Subscribe to a dream's stage events. Returns an `unsubscribe()` function
 * that the caller MUST invoke when the SSE connection closes — otherwise
 * the listener leaks for the lifetime of the process.
 */
function subscribe(dreamId, handler) {
  const name = eventName(dreamId);
  emitter.on(name, handler);
  return () => emitter.off(name, handler);
}

module.exports = { emit, subscribe };
