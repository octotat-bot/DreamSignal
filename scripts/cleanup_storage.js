#!/usr/bin/env node
/**
 * Delete orphaned audio + image files under storage/ that are no longer
 * referenced by any Dream document. Designed to be run as a periodic
 * cron job (daily is plenty for a single-user journal):
 *
 *     node scripts/cleanup_storage.js              # dry-run, prints orphans
 *     node scripts/cleanup_storage.js --apply      # actually delete
 *     node scripts/cleanup_storage.js --max-age=30 # only orphans >30 days old
 *
 * Connects to the same MONGO_URI the backend uses (loaded from
 * backend/.env), enumerates files in storage/audio and storage/images,
 * looks up which paths are still referenced, and removes the unreferenced
 * ones older than --max-age days.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

const mongoose = require('mongoose');
const Dream = require('../backend/models/Dream');

const REPO_ROOT = path.resolve(__dirname, '..');
const STORAGE_ROOT = path.join(REPO_ROOT, 'storage');

function parseArgs() {
  const args = { apply: false, maxAgeDays: 7 };
  for (const a of process.argv.slice(2)) {
    if (a === '--apply') args.apply = true;
    else if (a.startsWith('--max-age=')) args.maxAgeDays = Number(a.split('=')[1]) || 7;
    else if (a === '--help' || a === '-h') {
      console.log(
        'Usage: node scripts/cleanup_storage.js [--apply] [--max-age=DAYS]\n' +
          '  --apply        actually delete orphans (default: dry-run)\n' +
          '  --max-age=N    only delete orphans older than N days (default: 7)'
      );
      process.exit(0);
    }
  }
  return args;
}

function enumerateFiles(subdir) {
  const full = path.join(STORAGE_ROOT, subdir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full, { withFileTypes: true })
    .filter((d) => d.isFile() && !d.name.startsWith('.'))
    .map((d) => {
      const abs = path.join(full, d.name);
      const stat = fs.statSync(abs);
      return {
        absPath: abs,
        relPath: `/storage/${subdir}/${d.name}`,
        ageMs: Date.now() - stat.mtimeMs,
        bytes: stat.size,
      };
    });
}

async function main() {
  const { apply, maxAgeDays } = parseArgs();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dreamsignal');

  // Gather every relative path the DB still references.
  const dreams = await Dream.find({}).select('audioPath imagePath').lean();
  const referenced = new Set();
  for (const d of dreams) {
    if (d.audioPath) referenced.add(d.audioPath);
    if (d.imagePath) referenced.add(d.imagePath);
  }

  const candidates = [...enumerateFiles('audio'), ...enumerateFiles('images')];

  const orphans = candidates.filter(
    (c) => !referenced.has(c.relPath) && c.ageMs >= maxAgeMs
  );

  const totalBytes = orphans.reduce((s, o) => s + o.bytes, 0);
  console.log(
    `Found ${orphans.length} orphan file(s) totaling ${(totalBytes / 1024 / 1024).toFixed(2)} MB (older than ${maxAgeDays} day${maxAgeDays === 1 ? '' : 's'}, not referenced by any Dream).`
  );

  for (const o of orphans) {
    const ageDays = (o.ageMs / (24 * 60 * 60 * 1000)).toFixed(1);
    if (apply) {
      try {
        fs.unlinkSync(o.absPath);
        console.log(`  deleted  ${o.relPath}  (${(o.bytes / 1024).toFixed(1)} KB, ${ageDays}d old)`);
      } catch (err) {
        console.error(`  failed   ${o.relPath}:`, err.message);
      }
    } else {
      console.log(`  orphan   ${o.relPath}  (${(o.bytes / 1024).toFixed(1)} KB, ${ageDays}d old)`);
    }
  }

  if (!apply && orphans.length) {
    console.log('\nDry run. Re-run with --apply to delete.');
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exitCode = 1;
});
