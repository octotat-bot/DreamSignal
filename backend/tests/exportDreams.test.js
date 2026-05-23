/**
 * GET /api/dreams/export — verify the archive endpoint:
 *   - returns 200 with application/json
 *   - sets a download Content-Disposition
 *   - includes every dream for the authenticated user, excluding embeddings
 *   - scopes results so users only see their own dreams
 */
// Vitest globals: describe/it/expect/beforeEach (see vitest.config.js)
const request = require('supertest');

const { createApp } = require('../app');
const { createTestUser, authHeader, seedDream } = require('./helpers');

let app;
beforeEach(() => {
  app = createApp({ enableRateLimit: false, enableHttpLogger: false });
});

describe('GET /api/dreams/export', () => {
  it('rejects unauthenticated callers', async () => {
    const res = await request(app).get('/api/dreams/export');
    expect(res.status).toBe(401);
  });

  it('returns the authenticated user\'s full archive with a download header', async () => {
    const { token, user } = await createTestUser();
    await seedDream(user._id, { rawTranscript: 'first' });
    await seedDream(user._id, { rawTranscript: 'second' });

    const res = await request(app)
      .get('/api/dreams/export')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="dreamsignal-archive-\d{4}-\d{2}-\d{2}\.json"/);

    const body = JSON.parse(res.text);
    expect(body.schemaVersion).toBe(1);
    expect(body.totalDreams).toBe(2);
    expect(body.dreams).toHaveLength(2);
    // Embeddings stripped to keep the archive small.
    for (const d of body.dreams) {
      expect(d.embedding).toBeUndefined();
    }
  });

  it('only returns dreams owned by the authenticated user', async () => {
    const owner = await createTestUser();
    const stranger = await createTestUser();

    await seedDream(owner.user._id, { rawTranscript: 'mine A' });
    await seedDream(owner.user._id, { rawTranscript: 'mine B' });
    await seedDream(stranger.user._id, { rawTranscript: 'not mine' });

    const res = await request(app)
      .get('/api/dreams/export')
      .set(authHeader(owner.token));

    expect(res.status).toBe(200);
    const body = JSON.parse(res.text);
    expect(body.totalDreams).toBe(2);
    const transcripts = body.dreams.map((d) => d.rawTranscript);
    expect(transcripts).toEqual(expect.arrayContaining(['mine A', 'mine B']));
    expect(transcripts).not.toContain('not mine');
  });
});
