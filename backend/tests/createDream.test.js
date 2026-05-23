/**
 * POST /api/dreams — text-input happy path + validation guard.
 * The AI service is mocked so the test never hits the network; we just
 * assert that the controller returns 202 with a dreamId, persists the
 * Dream document, and applies the user-supplied metadata flags + tags.
 */
// describe/it/expect/vi/beforeEach are Vitest globals (see vitest.config.js)
const request = require('supertest');

vi.mock('../services/aiService', () => ({
  transcribeAudio: vi.fn(async () => ({ transcript: 'mock', duration_seconds: 1 })),
  analyzeDream: vi.fn(async () => ({
    analysis: {
      title: 'Mock Dream',
      summary: 'Mock summary',
      psychologicalInterpretation: 'Mock interp',
      cinematicDescription: 'Mock cinematic',
      dominantTheme: 'mock theme',
      environment: 'mock env',
      mood: 'mock mood',
    },
    emotions: [{ label: 'joy', score: 1.0 }],
    dominantEmotion: 'joy',
    emotionalIntensity: 1.0,
    symbols: [{ label: 'water', score: 0.5 }],
    embedding: new Array(384).fill(0),
    relatedDreams: [],
  })),
}));

const { createApp } = require('../app');
const { createTestUser, authHeader } = require('./helpers');
const Dream = require('../models/Dream');

let app;
beforeEach(() => {
  app = createApp({ enableRateLimit: false, enableHttpLogger: false });
});

describe('POST /api/dreams', () => {
  it('rejects unauthenticated callers with 401', async () => {
    const res = await request(app)
      .post('/api/dreams')
      .send({ inputType: 'text', transcript: 'A short dream.' });
    expect(res.status).toBe(401);
  });

  it('creates a text dream and returns 202 with a dreamId', async () => {
    const { token, user } = await createTestUser();

    const longEnoughTranscript =
      'I walked through a glowing ocean and a hidden door at midnight, then the library transformed.';

    const res = await request(app)
      .post('/api/dreams')
      .set(authHeader(token))
      .send({
        inputType: 'text',
        transcript: longEnoughTranscript,
        tags: ['ocean', 'walking'],
        isLucid: true,
      });

    expect(res.status).toBe(202);
    expect(res.body.dreamId).toBeTruthy();
    expect(typeof res.body.message).toBe('string');

    const stored = await Dream.findById(res.body.dreamId);
    expect(stored).not.toBeNull();
    expect(String(stored.userId)).toBe(String(user._id));
    expect(stored.rawTranscript).toContain('glowing ocean');
    expect(stored.tags).toContain('ocean');
    expect(stored.isLucid).toBe(true);
    expect(stored.isRecurring).toBe(false);
  });

  it('rejects too-short transcripts with the contract violation message', async () => {
    const { token } = await createTestUser();

    const res = await request(app)
      .post('/api/dreams')
      .set(authHeader(token))
      .send({ inputType: 'text', transcript: 'too short' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/at least 50/i);
  });

  it('rejects invalid payloads with a 400 from the Zod contract', async () => {
    const { token } = await createTestUser();

    const res = await request(app)
      .post('/api/dreams')
      .set(authHeader(token))
      .send({ inputType: 'text' }); // missing transcript

    expect(res.status).toBe(400);
    expect(typeof res.body.message).toBe('string');
  });

  it('requires a file when inputType is audio', async () => {
    const { token } = await createTestUser();

    const res = await request(app)
      .post('/api/dreams')
      .set(authHeader(token))
      .send({ inputType: 'audio' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/audio file/i);
  });
});
