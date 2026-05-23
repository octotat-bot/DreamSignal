/**
 * /api/auth/me/password and DELETE /api/auth/me — profile management endpoints.
 *
 * Covers:
 *  - PATCH /api/auth/me/password: success, wrong current password, validation
 *    (min length, same-as-current), unauth.
 *  - DELETE /api/auth/me: success cascade (user + dreams + pattern removed),
 *    wrong password, unauth.
 *
 * Both routes use bcrypt-hashed passwords end-to-end so the tests double as
 * a smoke check that bcrypt is wired up correctly.
 */
const request = require('supertest');
const bcrypt = require('bcrypt');

const { createApp } = require('../app');
const { createTestUser, authHeader } = require('./helpers');
const User = require('../models/User');
const Dream = require('../models/Dream');
const Pattern = require('../models/Pattern');

let app;
beforeEach(() => {
  app = createApp({ enableRateLimit: false, enableHttpLogger: false });
});

async function createUserWithRealPassword(plain = 'OriginalPass123') {
  const hash = await bcrypt.hash(plain, 4); // low rounds = fast in tests
  return createTestUser({ password: hash });
}

describe('PATCH /api/auth/me/password', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).patch('/api/auth/me/password').send({
      currentPassword: 'x',
      newPassword: 'longenough',
    });
    expect(res.status).toBe(401);
  });

  it('rotates the password when current is correct', async () => {
    const { user, token } = await createUserWithRealPassword('OriginalPass123');

    const res = await request(app)
      .patch('/api/auth/me/password')
      .set(authHeader(token))
      .send({ currentPassword: 'OriginalPass123', newPassword: 'BrandNewPass456' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated/i);

    // Verify the stored hash actually changed and matches the new password
    const refreshed = await User.findById(user._id);
    const newMatches = await bcrypt.compare('BrandNewPass456', refreshed.password);
    const oldMatches = await bcrypt.compare('OriginalPass123', refreshed.password);
    expect(newMatches).toBe(true);
    expect(oldMatches).toBe(false);
  });

  it('rejects an incorrect current password', async () => {
    const { token } = await createUserWithRealPassword('OriginalPass123');

    const res = await request(app)
      .patch('/api/auth/me/password')
      .set(authHeader(token))
      .send({ currentPassword: 'WrongPassword', newPassword: 'BrandNewPass456' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/incorrect/i);
  });

  it('rejects passwords shorter than 8 characters', async () => {
    const { token } = await createUserWithRealPassword('OriginalPass123');
    const res = await request(app)
      .patch('/api/auth/me/password')
      .set(authHeader(token))
      .send({ currentPassword: 'OriginalPass123', newPassword: 'short' });
    expect(res.status).toBe(400);
  });

  it('rejects when new password equals current password', async () => {
    const { token } = await createUserWithRealPassword('OriginalPass123');
    const res = await request(app)
      .patch('/api/auth/me/password')
      .set(authHeader(token))
      .send({ currentPassword: 'OriginalPass123', newPassword: 'OriginalPass123' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/differ/i);
  });
});

describe('DELETE /api/auth/me', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).delete('/api/auth/me').send({ password: 'whatever' });
    expect(res.status).toBe(401);
  });

  it('rejects when password is wrong', async () => {
    const { token } = await createUserWithRealPassword('OriginalPass123');
    const res = await request(app)
      .delete('/api/auth/me')
      .set(authHeader(token))
      .send({ password: 'NotMyPassword' });
    expect(res.status).toBe(401);
  });

  it('rejects when password is missing', async () => {
    const { token } = await createUserWithRealPassword('OriginalPass123');
    const res = await request(app)
      .delete('/api/auth/me')
      .set(authHeader(token))
      .send({});
    expect(res.status).toBe(400);
  });

  it('deletes the user, their dreams, and their pattern aggregate', async () => {
    const { user, token } = await createUserWithRealPassword('OriginalPass123');

    await Dream.create({
      userId: user._id,
      inputType: 'text',
      rawTranscript: 'A dream about endless hallways.',
      processingStatus: 'complete',
    });
    await Pattern.create({
      userId: user._id,
      emotionTrends: [],
      symbolFrequency: [],
      dominantEmotionHistory: [],
      totalDreams: 1,
    });

    const res = await request(app)
      .delete('/api/auth/me')
      .set(authHeader(token))
      .send({ password: 'OriginalPass123' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/closed/i);

    expect(await User.findById(user._id)).toBeNull();
    expect(await Dream.countDocuments({ userId: user._id })).toBe(0);
    expect(await Pattern.findOne({ userId: user._id })).toBeNull();
  });
});
