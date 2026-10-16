/**
 * account-store.js — tiny JSON "DB" for owner accounts.
 *
 * File: server/data/accounts.json (git-ignored). Shape:
 *   { "accounts": [ { "id", "username", "passwordHash": "scrypt$v=1$...", "role": "admin", "createdAt", "updatedAt" } ] }
 *
 * Verification is timing-safe scrypt; reads are sync (fine at this scale),
 * writes are atomic via tmp + rename. Before high traffic, swap this module
 * for a database table — callers only use loadAccounts, saveAccounts,
 * getPasswordHash, upsertAccount, verifyHash.
 */

import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scryptSync as nodeScryptSync, timingSafeEqual } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(here, 'data');
const DB_FILE = join(DATA_DIR, 'accounts.json');

export function loadAccounts() {
  try {
    const parsed = JSON.parse(readFileSync(DB_FILE, 'utf8'));
    if (parsed && Array.isArray(parsed.accounts)) return parsed.accounts;
  } catch {
    // Missing/corrupt → empty store.
  }
  return [];
}

function mkdirSafe() {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
  } catch {
    // Directory already exists.
  }
}

export function saveAccounts(accounts) {
  mkdirSafe();
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify({ accounts }, null, 2));
  renameSync(tmp, DB_FILE);
}

/** Get the stored scrypt hash for a username (case-insensitive). */
export function getPasswordHash(username) {
  if (typeof username !== 'string') return null;
  const needle = username.toLowerCase();
  const account = loadAccounts().find((a) => (a.username || '').toLowerCase() === needle);
  return account ? account.passwordHash || null : null;
}

/**
 * Timing-safe verification against a stored scrypt hash.
 * Parses "scrypt$v=1$n=…$r=…$p=…$salt$derivedhex".
 */
export function verifyHash(password, stored) {
  try {
    if (typeof password !== 'string' || !password) return false;
    if (typeof stored !== 'string' || !stored.startsWith('scrypt$v=1$')) return false;
    const parts = stored.split('$');
    if (parts.length !== 7 || parts[1] !== 'v=1') return false;
    const params = {};
    for (const kv of parts.slice(2, 5)) {
      const [k, v] = kv.split('=');
      params[k] = Number(v);
    }
    if (![params.n, params.r, params.p].every((n) => Number.isInteger(n) && n > 0)) return false;
    const expected = Buffer.from(parts[6], 'hex');
    if (expected.length === 0) return false;
    const key = nodeScryptSync(password, parts[5], expected.length, { N: params.n, r: params.r, p: params.p });
    if (expected.length !== key.length) return false;
    return timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

/** Insert or update an account; keeps role/createdAt on update. */
export function upsertAccount(username, passwordHash, role = 'admin') {
  const accounts = loadAccounts();
  const needle = (username || '').toLowerCase();
  const now = new Date().toISOString();
  const existing = accounts.find((a) => (a.username || '').toLowerCase() === needle);
  if (existing) {
    existing.passwordHash = passwordHash;
    existing.role = role;
    existing.updatedAt = now;
    saveAccounts(accounts);
    return { created: false, account: existing };
  }
  const account = {
    id: `admin_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    username,
    passwordHash,
    role,
    createdAt: now,
    updatedAt: now,
  };
  accounts.push(account);
  saveAccounts(accounts);
  return { created: true, account };
}
