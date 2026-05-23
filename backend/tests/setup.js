/**
 * Global Vitest setup: spins up an in-process MongoDB via
 * mongodb-memory-server before any test runs and tears it down at the end.
 * Also forces a deterministic JWT secret + AI service URL so token signing
 * and aiService URL construction are stable across runs.
 */
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
// describe/beforeAll/afterAll/afterEach are provided as globals by Vitest
// (see vitest.config.js — `globals: true`). Vitest 4 only ships ESM so a
// CJS `require('vitest')` would throw at import time.

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_for_vitest_minimum_32_characters_long';
process.env.AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai.test.local';
// Force the dream queue into inline mode for tests — never touch Redis.
process.env.REDIS_URL = '';

let memoryServer;

beforeAll(async () => {
  memoryServer = await MongoMemoryServer.create();
  const uri = memoryServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
});

afterEach(async () => {
  // Wipe every collection between tests so state doesn't bleed across
  // assertions. Cheaper than tearing down + recreating the whole instance.
  const collections = mongoose.connection.collections;
  for (const name of Object.keys(collections)) {
    await collections[name].deleteMany({});
  }
});
