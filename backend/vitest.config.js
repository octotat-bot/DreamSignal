/**
 * Vitest config for the Express backend. Tests run against the real
 * controllers + Mongoose models, with mongodb-memory-server providing
 * an in-process MongoDB so we never touch the real Atlas cluster.
 */
const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    // `globals: true` exposes describe/it/expect/vi/beforeAll/etc as
    // globals so individual CJS test files don't need to `require('vitest')`
    // (Vitest 4 only ships ESM, so the explicit require fails).
    globals: true,
    setupFiles: ['./tests/setup.js'],
    // mongodb-memory-server can take a moment to download the binary the
    // first time it runs; give it room before declaring the suite hung.
    testTimeout: 30000,
    hookTimeout: 60000,
    // Run sequentially (single fork) so the shared in-memory mongo isn't
    // hammered by parallel test files. Cheaper than per-file mongo instances.
    pool: 'forks',
    fileParallelism: false,
  },
});
