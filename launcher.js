#!/usr/bin/env node
/**
 * launcher.js — boots the ENTIRE shop with one command (Pterodactyl-friendly).
 *
 *   node launcher.js          → git pull (keeps products, uploads, accounts),
 *                                npm install, rebuild, start on PORT (default 25609).
 *   node launcher.js --fresh  → full wipe + clean clone (recovery only:
 *                                DELETES products, uploads and accounts
 *                                created on the server).
 *
 * Data safety: server/data/ (products, accounts, settings), server/.env and
 * uploaded images are NEVER touched by the normal path — git pull leaves
 * untracked/ignored files alone, and the build only refreshes dist/.
 *
 * No secrets in this file. Admin + Stripe keys come from server/.env.
 */

import { spawnSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const DEFAULT_PORT = 25609;
const REPO = 'https://github.com/SLOWiscool/sourcedbysmz.git';

function fail(message) {
  console.error(`[launcher] ${message}`);
  process.exit(1);
}

function run(cmd, args, cwd, label, allowFail = false) {
  console.log(`[launcher] ${label}…`);
  const result = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: false });
  if (result.status !== 0 && !allowFail) {
    fail(`"${cmd} ${args.join(' ')}" exited with code ${result.status ?? 'unknown'}.`);
  }
  return result.status === 0;
}

function main() {
  console.log('=== SOURCEDBYSMZ launcher ===');

  const nodeMajor = Number(process.versions.node.split('.')[0] || 0);
  if (!Number.isInteger(nodeMajor) || nodeMajor < 18) fail(`Node.js 18+ is required (found ${process.versions.node}).`);

  const port = Number(process.env.PORT || process.env.SERVER_PORT || DEFAULT_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) fail(`Bad port "${process.env.PORT || process.env.SERVER_PORT || ''}".`);

  if (process.argv.includes('--fresh')) {
    console.log('[launcher] --fresh: FULL WIPE (products, uploads and server accounts WILL BE DELETED)…');
    run('git', ['clone', REPO, join(ROOT, '.clone-tmp')], ROOT, 'cloning fresh copy from GitHub');
    spawnSync('bash', ['-c', `cd "${ROOT}" && find . -maxdepth 1 ! -name launcher.js ! -name . -exec rm -rf {} +`], { stdio: 'inherit' });
    spawnSync('bash', ['-c', `cd "${ROOT}" && find .clone-tmp -maxdepth 1 ! -name . -exec mv {} . \\; && rmdir .clone-tmp`], { stdio: 'inherit' });
  } else if (existsSync(join(ROOT, '.git'))) {
    // Hard-sync to GitHub: the live container must match the repo exactly.
    // Untracked files (server/data, uploads, server/.env) are never touched.
    run('git', ['fetch', 'origin', 'main'], ROOT, 'fetching latest code', true);
    run('git', ['reset', '--hard', 'origin/main'], ROOT, 'syncing to latest code', true);
    const head = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' });
    console.log(`[launcher] now on commit ${((head.stdout || '').trim() || 'unknown')}`);
  } else {
    console.log('[launcher] No git checkout found — using files as-is.');
  }

  run(NPM, ['install'], ROOT, 'installing storefront dependencies');
  run(NPM, ['install'], join(ROOT, 'server'), 'installing backend dependencies');
  run(NPM, ['run', 'build'], ROOT, 'building the storefront');

  if (!existsSync(join(ROOT, 'server', '.env'))) {
    console.warn('[launcher] WARNING: server/.env missing — live payments unconfigured (admin uses accounts.json).');
  }

  process.env.PORT = String(port);
  console.log(`[launcher] starting the shop on port ${port}…`);

  const child = spawn(process.execPath, [join(ROOT, 'server', 'index.js')], {
    stdio: 'inherit',
    env: process.env,
  });

  const stop = (signal) => {
    try { child.kill(signal); } catch { process.exit(1); }
  };
  process.on('SIGINT', () => stop('SIGINT'));
  process.on('SIGTERM', () => stop('SIGTERM'));
  child.on('exit', (code, signal) => {
    process.exit(signal ? 1 : (code ?? 0));
  });
}

main();
