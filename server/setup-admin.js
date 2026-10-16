#!/usr/bin/env node
/**
 * setup-admin.js — create or update the owner account in server/data/accounts.json
 * (JSON "DB"). Run: `npm run setup:admin` (from server/ or repo root).
 *
 * Interactive mode asks for username + password typed blind and stores a
 * salted scrypt hash — never the plaintext. Piped mode takes three lines:
 * username, password, password again (for scripts/CI).
 *
 * Existing account file shape:
 *   { "accounts": [ { "id": "...", "username": "...", "passwordHash": "scrypt$v=1$...", "role": "admin", "createdAt": "..." } ] }
 */

import { createInterface } from 'node:readline';
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { hashPassword } from './auth.js';

const here = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(here, 'data');
const DB_FILE = join(DATA_DIR, 'accounts.json');
const ENV_FILE = join(here, '.env');
const ENV_EXAMPLE = join(here, '.env.example');

const CTRL_C = 3;
const CTRL_D = 4;
const CTRL_BS = 8;
const CTRL_DEL = 127;

function loadDb() {
  try {
    const parsed = JSON.parse(readFileSync(DB_FILE, 'utf8'));
    if (parsed && Array.isArray(parsed.accounts)) return parsed;
  } catch {
    // Missing or corrupt: start fresh.
  }
  return { accounts: [] };
}

function saveDb(db) {
  mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(db, null, 2));
  renameSync(tmp, DB_FILE);
}

function upsertEnv(content, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(content)) return content.replace(re, line);
  if (!content.endsWith('\n') && content.length > 0) content += '\n';
  return content + line + '\n';
}

function setRawSafe(stdin, mode) {
  try {
    if (stdin.setRawMode) stdin.setRawMode(mode);
  } catch {
    // Piped input has no TTY raw mode; line-buffered reading still works.
  }
}

function ask(rl, prompt) {
  return new Promise((resolve) => rl.question(prompt, (answer) => resolve(answer.trim())));
}

/** Blind password prompt: keystrokes are captured raw, never echoed. */
function askHidden(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    let value = '';
    const onData = (buf) => {
      const text = buf.toString('utf8');
      for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        const code = ch.charCodeAt(0);
        if (ch === '\n' || ch === '\r' || code === CTRL_D) {
          stdin.removeListener('data', onData);
          setRawSafe(stdin, !!wasRaw);
          stdin.pause();
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (code === CTRL_C) process.exit(130);
        if (code === CTRL_BS || code === CTRL_DEL || ch === '\b') {
          value = value.slice(0, -1);
          continue;
        }
        value += ch;
      }
    };
    setRawSafe(stdin, true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

/** Add or update the admin account. Returns { created, updated, username }. */
async function saveAccount(username, password) {
  if (username.length < 2) throw new Error('Username must be at least 2 characters.');
  if (password.length < 12) throw new Error('Password must be at least 12 characters.');
  const db = loadDb();
  const existing = db.accounts.find((a) => a.username.toLowerCase() === username.toLowerCase());
  const hash = await hashPassword(password);
  const now = new Date().toISOString();
  if (existing) {
    existing.passwordHash = hash;
    existing.role = 'admin';
    existing.updatedAt = now;
    saveDb(db);
    return { created: false, updated: true, username };
  }
  db.accounts.push({ id: `admin_${randomUUID().slice(0, 8)}`, username, passwordHash: hash, role: 'admin', createdAt: now, updatedAt: now });
  saveDb(db);
  return { created: true, updated: false, username };
}

async function writeEnv(username) {
  let content = '';
  if (existsSync(ENV_FILE)) content = readFileSync(ENV_FILE, 'utf8');
  else if (existsSync(ENV_EXAMPLE)) content = readFileSync(ENV_EXAMPLE, 'utf8');
  content = upsertEnv(content, 'ADMIN_USERNAME', username);
  writeFileSync(ENV_FILE, content, { mode: 0o600 });
}

/** Import hashes stored only in legacy .env into the accounts DB (one-time). */
function migrateFromEnv() {
  try {
    if (!existsSync(ENV_FILE)) return null;
    const content = readFileSync(ENV_FILE, 'utf8');
    const username = content.match(/^ADMIN_USERNAME=(.+)$/m);
    const hash = content.match(/^ADMIN_PASSWORD_HASH=(.+)$/m);
    if (username && hash && parseStoredHash(hash[1])) {
      return { username: username[1].trim(), hash: hash[1].trim() };
    }
  } catch {
    // ignore — start from scratch
  }
  return null;
}

async function main() {
  // Non-interactive mode (piped stdin, e.g. deployment scripts): three
  // lines — username, password, password confirmation.
  if (!process.stdin.isTTY) {
    const { readFileSync: readStdin } = await import('node:fs');
    const lines = readStdin(0, 'utf8').split(/\r?\n/);
    const [username, password, confirm] = lines;
    if (!username || !password || password.length < 12 || confirm !== password) {
      console.error('Piped setup needs three lines: username, password (12+ chars), same password again.');
      process.exitCode = 1;
      return;
    }
    const result = await saveAccount(username, password);
    await writeEnv(username);
    console.log(`Admin account "${username}" saved (${result.created ? 'created' : 'updated'}) to server/data/accounts.json.`);
    return;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const username = await ask(rl, 'Admin username: ');
    const password = await askHidden('Admin password (12+ characters, typed blind): ');
    const confirm = await askHidden('Repeat password: ');
    if (!username || !password || password.length < 12 || confirm !== password) {
      console.error('Need a username, a password of 12+ characters, and a matching repeat.');
      process.exitCode = 1;
      return;
    }
    const result = await saveAccount(username, password);
    await writeEnv(username);
    console.log(`Admin account "${username}" saved (${result.created ? 'created' : 'updated'}) to server/data/accounts.json (hash only).`);
    console.log('Restart the server, then sign in at /admin/login.');
  } finally {
    rl.close();
  }
}

main();
