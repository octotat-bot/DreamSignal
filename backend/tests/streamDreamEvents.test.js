/**
 * GET /api/dreams/events/:id — SSE stream handler.
 * Supertest's chained .get() reads the body to completion, which is what
 * we want for terminal dreams (the stream closes immediately after
 * emitting its initial event). For non-terminal dreams the stream would
 * stay open until the queue emits — we focus on the terminal-state path
 * here since it doesn't require coordinating with the queue runner.
 */
// Vitest globals: describe/it/expect/beforeEach (see vitest.config.js)
const request = require('supertest');

const { createApp } = require('../app');
const { createTestUser, authHeader, seedDream, ObjectId } = require('./helpers');

let app;
beforeEach(() => {
  app = createApp({ enableRateLimit: false, enableHttpLogger: false });
});

describe('GET /api/dreams/events/:id', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get(`/api/dreams/events/${new ObjectId().toString()}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 for a non-existent dream id', async () => {
    const { token } = await createTestUser();
    const res = await request(app)
      .get(`/api/dreams/events/${new ObjectId().toString()}`)
      .set(authHeader(token));
    expect(res.status).toBe(404);
  });

  it('returns 403 when the dream belongs to another user', async () => {
    const owner = await createTestUser();
    const stranger = await createTestUser();
    const dream = await seedDream(owner.user._id);

    const res = await request(app)
      .get(`/api/dreams/events/${dream._id.toString()}`)
      .set(authHeader(stranger.token));

    expect(res.status).toBe(403);
  });

  it('streams text/event-stream headers and an initial frame for a terminal dream', async () => {
    const { token, user } = await createTestUser();
    const dream = await seedDream(user._id, { processingStatus: 'complete' });

    const res = await request(app)
      .get(`/api/dreams/events/${dream._id.toString()}`)
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    expect(res.headers['cache-control']).toMatch(/no-cache/);

    // Initial frame must include the dream's current terminal state so a
    // client connecting late doesn't sit on "pending" forever.
    const body = res.text || '';
    expect(body).toMatch(/data: /);
    expect(body).toMatch(/"stage":"archived"/);
    expect(body).toMatch(/"processingStatus":"complete"/);
  });

  it('accepts the `?token=` query auth path (EventSource compatibility)', async () => {
    const { token, user } = await createTestUser();
    const dream = await seedDream(user._id, { processingStatus: 'complete' });

    const res = await request(app).get(
      `/api/dreams/events/${dream._id.toString()}?token=${encodeURIComponent(token)}`
    );

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
  });
});
