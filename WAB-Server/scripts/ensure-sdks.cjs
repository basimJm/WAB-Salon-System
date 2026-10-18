'use strict';
// Builds the sibling wab-* SDKs that WAB-Server consumes through `file:` dependencies, when their
// `dist` folder is missing (fresh clone, CI, Docker build). No-op when they are already built.
const { existsSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

const SDKS = ['wab-notifications', 'wab-otp', 'wab-payments', 'wab-storage', 'wab-analytics'];
const root = resolve(__dirname, '..', '..');

const run = (cwd, args) => {
  const result = spawnSync('npm', args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

for (const name of SDKS) {
  const directory = join(root, name);
  if (existsSync(join(directory, 'dist', 'index.js'))) continue;
  if (!existsSync(join(directory, 'package.json'))) {
    console.error(`SDK folder not found: ${name}`);
    process.exit(1);
  }
  run(directory, ['ci']);
  run(directory, ['run', 'build']);
}
