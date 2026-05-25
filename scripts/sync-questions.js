#!/usr/bin/env node
/**
 * Copies state question JSONs from the sibling mobile-app repo
 * (../realready/data/questions/) into this site's content tree
 * (src/content/questions/).
 *
 * The synced files are committed to this repo so deploys are
 * self-contained and don't depend on the mobile-app repo being
 * present at build time.
 *
 * Run: npm run sync-questions
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REPO_ROOT = resolve(__dirname, '..');
const SOURCE_DIR = resolve(REPO_ROOT, '..', 'realready', 'data', 'questions');
const DEST_DIR = resolve(REPO_ROOT, 'src', 'content', 'questions');

function fail(message) {
  console.error(`\n  sync-questions: ${message}\n`);
  process.exit(1);
}

if (!existsSync(SOURCE_DIR)) {
  fail(
    `Source directory not found at ${SOURCE_DIR}.\n  ` +
      `Expected the mobile-app repo to be a sibling of this site repo.\n  ` +
      `If you cloned this repo standalone, you'll need to clone the realready app repo as a sibling.`,
  );
}

const sourceFiles = readdirSync(SOURCE_DIR).filter((f) => f.endsWith('.json'));

if (sourceFiles.length === 0) {
  fail(`No .json files found in ${SOURCE_DIR}`);
}

// Wipe and recreate dest so removed files are deleted too.
if (existsSync(DEST_DIR)) {
  rmSync(DEST_DIR, { recursive: true, force: true });
}
mkdirSync(DEST_DIR, { recursive: true });

let copied = 0;
let invalid = 0;
const stateFileCounts = new Map();

for (const file of sourceFiles) {
  const sourcePath = join(SOURCE_DIR, file);
  const destPath = join(DEST_DIR, file);
  const raw = readFileSync(sourcePath, 'utf8');

  try {
    JSON.parse(raw);
  } catch (err) {
    console.error(`  ! invalid JSON: ${file} — ${err.message}`);
    invalid++;
    continue;
  }

  writeFileSync(destPath, raw);
  copied++;

  const stateMatch = file.match(/^([A-Z]{2})-\d+\.json$/);
  if (stateMatch) {
    const state = stateMatch[1];
    stateFileCounts.set(state, (stateFileCounts.get(state) ?? 0) + 1);
  }
}

console.log(`\n  sync-questions: copied ${copied} files into src/content/questions/`);
console.log(`  states covered: ${stateFileCounts.size}`);
if (invalid > 0) {
  console.error(`  ! ${invalid} files failed JSON parse and were skipped`);
  process.exit(1);
}
console.log('');
