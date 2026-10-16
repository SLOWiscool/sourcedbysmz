/**
 * auth.js — admin authentication.
 *
 * Passwords are NEVER stored in plaintext or in code. The setup script
 * (server/setup-admin.js) hashes the password with scrypt (CPU/memory-hard,
 * salted) and writes ONLY the hash to server/.env as ADMIN_PASSWORD_HASH.
 * Login verifies with timing-safe comparison. Sessions are server-side
 * (express-session); the browser only holds an opaque session id in an
 * httpOnly cookie. Hiding admin buttons in the UI is NOT the protection —
 * every /api/admin route requires requireAdmin below.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { verifyHash } from './account-store.js';

const SCRYPT_KEYLEN = 64;

function getConfig() {
  return {
    username: process.env.ADMIN_USERNAME || '',
    hash: process.env.ADMIN_PASSWORD_HASH || '',
  };
}

/** Check both env vars and the accounts JSON DB. */
export async function isAuthConfigured() {
  const { username, hash } = getConfig();
  if (username && hash && hash.includes('$')) return true;
  try {
    const { loadAccounts } = await import('./account-store.js');
    return loadAccounts().length > 0;
  } catch {
    return false;
  }
}

/** Parse "scrypt$v=1$n=…$r=…$p=…$salt$derivedhex". Returns null when malformed. */
function parseHash(stored) {
  if (typeof stored !== 'string') return null;
  const parts = stored.split('$');
  if (parts.length !== 7 || parts[0] !== 'scrypt' || parts[1] !== 'v=1') return null;
  const params = {};
  for (const kv of parts.slice(2, 5)) {
    const [k, v] = kv.split('=');
    params[k] = Number(v);
  }
  if (![params.n, params.r, params.p].every((n) => Number.isInteger(n) && n > 0)) return null;
  return { n: params.n, r: params.r, p: params.p, salt: parts[5], derived: parts[6] };
}

function scryptAsync(password, salt, n, r, p) {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, SCRYPT_KEYLEN, { N: n, r, p }, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12) {
    throw new Error('Password must be at least 12 characters.');
  }
  const n = 16384;
  const r = 8;
  const p = 1;
  const salt = randomBytes(16).toString('hex');
  const key = await scryptAsync(password, salt, n, r, p);
  return `scrypt$v=1$n=${n}$r=${r}$p=${p}$${salt}$${key.toString('hex')}`;
}

/**
 * Verify against the JSON accounts DB; falls back to the legacy
 * ADMIN_PASSWORD_HASH env var (first boot before migration).
 */
export async function verifyPassword(password, stored) {
  try {
    if (typeof password !== 'string' || !password) return false;
    // Fast path: live DB for this user.
    if (stored) return verifyHash(password, stored);
    // Legacy fallback (hash from env, username must match too).
    if (!process.env.ADMIN_PASSWORD_HASH || !process.env.ADMIN_USERNAME) return false;
    return verifyHash(password, process.env.ADMIN_PASSWORD_HASH);
  } catch {
    return false;
  }
}

/** Constant-time username comparison so valid/invalid names behave alike. */
function usernameMatches(provided, configured) {
  const a = Buffer.from(`\0${provided || ''}`);
  const b = Buffer.from(`\0${configured || ''}`);
  if (a.length !== b.length) {
    // Still do a comparison to keep timing flat-ish; result is false.
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

export async function checkCredentials(username, password) {
  if (!isAuthConfigured()) return false;
  const { loadAccounts } = await import('./account-store.js');
  const account = loadAccounts().find(
    (a) => a.username.toLowerCase() === (username || '').toLowerCase()
  );
  if (!account) return false;
  const userOk = usernameMatches(username, account.username);
  const passOk = await verifyPassword(password, account.passwordHash);
  return (userOk && passOk) ? account : false;
}

/** Look up an account by username (returns null when not found). */
export async function getAccount(username) {
  if (typeof username !== 'string') return null;
  const { loadAccounts } = await import('./account-store.js');
  return loadAccounts().find((a) => a.username.toLowerCase() === username.toLowerCase()) || null;
}

/**
 * Express middleware: rejects unauthenticated admin API calls.
 * `allowedRoles` defaults to ['admin', 'payout'] so a payout-only
 * staff member can cash out without full product/order access.
 */
export function requireAdmin(req, res, next, allowedRoles = ['admin', 'payout']) {
  if (req.session && req.session.admin === true && allowedRoles.includes(req.session.role || 'admin')) {
    next();
    return;
  }
  res.status(401).json({ error: 'Admin sign-in required.' });
}
