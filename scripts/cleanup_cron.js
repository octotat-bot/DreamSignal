#!/usr/bin/env node
/**
 * Long-running cron wrapper around `cleanup_storage.js`. Runs cleanup once
 * at startup, then sleeps for CLEANUP_INTERVAL_HOURS (default 24h) and
 * repeats forever. Designed to be the entrypoint of the `cleanup` service
 * in docker-compose so the user gets recurring orphan-file pruning without
 * needing host-side cron.
 *
 * Env vars:
 *   CLEANUP_INTERVAL_HOURS  hours between runs               (default 24)
 *   CLEANUP_MAX_AGE_DAYS    only delete orphans older than N (default 7)
 *   CLEANUP_DRY_RUN         set truthy to skip --apply       (default off)
 */
const { spawn } = require('node:child_process');
const path = require('node:path');

const INTERVAL_HOURS = Number(process.env.CLEANUP_INTERVAL_HOURS || 24);
const MAX_AGE_DAYS = Number(process.env.CLEANUP_MAX_AGE_DAYS || 7);
const DRY_RUN = ['1', 'true', 'yes', 'on'].includes(
  String(process.env.CLEANUP_DRY_RUN || '').toLowerCase()
);
const INTERVAL_MS = Math.max(1, INTERVAL_HOURS) * 60 * 60 * 1000;
const SCRIPT_PATH = path.join(__dirname, 'cleanup_storage.js');

function runOnce() {
  return new Promise((resolve) => {
    const args = [SCRIPT_PATH, `--max-age=${MAX_AGE_DAYS}`];
    if (!DRY_RUN) args.push('--apply');
    const child = spawn(process.execPath, args, { stdio: 'inherit' });
    child.on('exit', (code) => resolve(code ?? 0));
    child.on('error', (err) => {
      console.error('[cleanup-cron] failed to spawn child:', err.message);
      resolve(1);
    });
  });
}

async function loop() {
  const mode = DRY_RUN ? 'dry-run' : 'apply';
  console.log(
    `[cleanup-cron] starting (interval=${INTERVAL_HOURS}h, max-age=${MAX_AGE_DAYS}d, mode=${mode})`
  );
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const start = Date.now();
    const code = await runOnce();
    console.log(
      `[cleanup-cron] run finished (exit=${code}, took=${Date.now() - start}ms). Next run in ${INTERVAL_HOURS}h.`
    );
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
}

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

loop();
