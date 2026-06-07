#!/usr/bin/env node
// log-friction — append one timestamped markdown bullet to the friction log.
//
// Usage:
//   pnpm log:friction "VP Marketing brief did not surface the open Lab-OS P1"
//   pnpm log:friction -- "directive form lacks per-executive override checkbox"
//
// Hard constraints (do not relax without CEO directive):
//   - Filesystem append only. No DB. No network. No external telemetry.
//   - One file: ./instances/yoni-company/FRICTION_LOG.md
//   - One line written per invocation. Timestamp is local-time ISO seconds.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = path.join(repoRoot, 'instances', 'yoni-company', 'FRICTION_LOG.md');

// pnpm forwards trailing args after `--`; npm and direct node invocation pass
// them directly. Collect everything after the script name and treat the joined
// remainder as the message. Empty message → exit non-zero so it's obvious.
const args = process.argv.slice(2);
const message = args.join(' ').trim();
if (!message) {
  console.error('log-friction: message is required');
  console.error('  usage: pnpm log:friction "your friction narrative here"');
  process.exit(2);
}

// Local-time ISO-ish stamp: YYYY-MM-DD HH:MM:SS — readable, sortable, no TZ
// math at write time.
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const stamp =
  `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
  `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

// Sanitize message to keep the markdown clean: collapse newlines, trim.
const safe = message.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
const line = `- [${stamp}] ${safe}\n`;

// Ensure target directory exists; create file with a header on first write so
// the markdown renders sensibly when opened.
fs.mkdirSync(path.dirname(TARGET), { recursive: true });
if (!fs.existsSync(TARGET)) {
  fs.writeFileSync(
    TARGET,
    '# Friction Log\n\n' +
      'Living log of management problems hit while operating AI-Company.\n' +
      'Append-only. Entries written by `pnpm log:friction "..."`.\n\n',
  );
}
fs.appendFileSync(TARGET, line);

console.log(`logged → ${path.relative(repoRoot, TARGET)}`);
console.log(`  ${line.trimEnd()}`);
