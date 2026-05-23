/**
 * Shared test helpers — token signing, user seeding, dream fixture builder.
 * Keeping these in one place so individual test files stay focused on
 * what they're actually asserting rather than re-implementing scaffolding.
 */
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Dream = require('../models/Dream');

function signTokenFor(userId, email = 'tester@example.com') {
  return jwt.sign(
    { id: String(userId), email },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Bump on every call so two users created in the same millisecond don't
// collide on the User schema's unique index for username/email.
let _userCounter = 0;

async function createTestUser(overrides = {}) {
  _userCounter += 1;
  const stamp = `${Date.now().toString(36)}${_userCounter}`;
  const user = await User.create({
    username: overrides.username || `tester${stamp}`,
    email: overrides.email || `tester${stamp}@example.com`,
    password: overrides.password || 'irrelevant-for-tests',
    ...overrides,
  });
  return { user, token: signTokenFor(user._id, user.email) };
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Insert a fully-formed completed dream so analytics + export tests
 * have realistic data without going through the AI pipeline.
 */
async function seedDream(userId, overrides = {}) {
  return Dream.create({
    userId,
    inputType: 'text',
    rawTranscript: 'A test transcript about an ocean and a door.',
    processingStatus: 'complete',
    dominantEmotion: 'fear',
    emotionalIntensity: 0.42,
    emotions: [
      { label: 'fear', score: 0.42 },
      { label: 'surprise', score: 0.21 },
      { label: 'neutral', score: 0.18 },
    ],
    symbols: [
      { label: 'ocean', score: 0.38 },
      { label: 'door', score: 0.36 },
    ],
    embedding: new Array(384).fill(0.01),
    analysis: {
      title: 'Test Dream',
      summary: 'Summary.',
      psychologicalInterpretation: 'Interpretation.',
      cinematicDescription: 'Cinematic.',
      dominantTheme: 'Threshold',
      environment: 'Library',
      mood: 'Mysterious',
    },
    tags: ['ocean', 'door'],
    ...overrides,
  });
}

module.exports = {
  signTokenFor,
  createTestUser,
  authHeader,
  seedDream,
  ObjectId: mongoose.Types.ObjectId,
};
