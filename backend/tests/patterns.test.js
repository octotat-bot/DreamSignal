/**
 * GET /api/analytics/patterns — verifies the lazy-compute path:
 *   - first hit on a user with dreams computes + persists the Pattern doc
 *   - response shape matches what the frontend Zod schema expects
 *     (symbolFrequency, emotionTrends, totalDreams)
 *   - data is scoped per user
 */
// Vitest globals: describe/it/expect/beforeEach (see vitest.config.js)
const request = require('supertest');

const { createApp } = require('../app');
const { createTestUser, authHeader, seedDream } = require('./helpers');
const Pattern = require('../models/Pattern');

let app;
beforeEach(() => {
  app = createApp({ enableRateLimit: false, enableHttpLogger: false });
});

describe('GET /api/analytics/patterns', () => {
  it('rejects unauthenticated callers', async () => {
    const res = await request(app).get('/api/analytics/patterns');
    expect(res.status).toBe(401);
  });

  it('returns an empty-shape pattern for a brand-new user', async () => {
    const { token } = await createTestUser();

    const res = await request(app)
      .get('/api/analytics/patterns')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.totalDreams).toBe(0);
    expect(Array.isArray(res.body.symbolFrequency)).toBe(true);
    expect(Array.isArray(res.body.emotionTrends)).toBe(true);
    expect(res.body.symbolFrequency).toHaveLength(0);
    expect(res.body.emotionTrends).toHaveLength(0);
  });

  it('lazy-computes patterns the first time they are requested', async () => {
    const { token, user } = await createTestUser();
    await seedDream(user._id, { rawTranscript: 'A', symbols: [{ label: 'ocean', score: 0.4 }, { label: 'door', score: 0.3 }] });
    await seedDream(user._id, { rawTranscript: 'B', symbols: [{ label: 'ocean', score: 0.5 }] });

    // No pattern doc yet — controller should compute it on demand.
    const preComputed = await Pattern.findOne({ userId: user._id });
    expect(preComputed).toBeNull();

    const res = await request(app)
      .get('/api/analytics/patterns')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.totalDreams).toBe(2);

    const oceanRow = res.body.symbolFrequency.find((s) => s.label === 'ocean');
    expect(oceanRow).toBeDefined();
    expect(oceanRow.count).toBe(2);
    expect(typeof oceanRow.percentage).toBe('number');

    expect(res.body.emotionTrends.length).toBeGreaterThan(0);
    expect(res.body.emotionTrends[0]).toHaveProperty('label');
    expect(res.body.emotionTrends[0]).toHaveProperty('averageScore');
    expect(res.body.emotionTrends[0]).toHaveProperty('dreamCount');

    // Now persisted — confirms the lazy-compute happened.
    const persisted = await Pattern.findOne({ userId: user._id });
    expect(persisted).not.toBeNull();
    expect(persisted.totalDreams).toBe(2);
  });

  it('scopes patterns per user (no cross-user leakage)', async () => {
    const alice = await createTestUser();
    const bob = await createTestUser();

    await seedDream(alice.user._id, { rawTranscript: 'A1', symbols: [{ label: 'forest', score: 0.5 }] });
    await seedDream(bob.user._id, { rawTranscript: 'B1', symbols: [{ label: 'fire', score: 0.7 }] });
    await seedDream(bob.user._id, { rawTranscript: 'B2', symbols: [{ label: 'fire', score: 0.6 }] });

    const aliceRes = await request(app).get('/api/analytics/patterns').set(authHeader(alice.token));
    const bobRes = await request(app).get('/api/analytics/patterns').set(authHeader(bob.token));

    expect(aliceRes.body.totalDreams).toBe(1);
    expect(bobRes.body.totalDreams).toBe(2);
    expect(aliceRes.body.symbolFrequency.map((s) => s.label)).toEqual(['forest']);
    expect(bobRes.body.symbolFrequency.map((s) => s.label)).toEqual(['fire']);
  });
});
