/**
 * email.js — outgoing mail boundary.
 *
 * There is deliberately NO live email provider wired in yet: sending needs
 * owner credentials (SMTP or a transactional API), which do not exist.
 * Until then, sendStockAlert() records into server/data/outbox.json so no
 * subscription is ever silently dropped, and the admin panel can see the
 * queue. When the owner adds provider keys, replace recordOnly() with the
 * real transport and keep the outbox write as the audit trail.
 */

import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUTBOX_FILE = join(here, 'data', 'outbox.json');

function readOutbox() {
  try {
    const parsed = JSON.parse(readFileSync(OUTBOX_FILE, 'utf8'));
    if (parsed && Array.isArray(parsed.messages)) return parsed.messages;
  } catch {
    // Missing/corrupt → empty outbox.
  }
  return [];
}

export function getOutbox() {
  return readOutbox();
}

export function recordOnly(message) {
  mkdirSync(join(here, 'data'), { recursive: true });
  const messages = readOutbox();
  messages.push({ ...message, status: 'queued-no-provider', createdAt: new Date().toISOString() });
  const tmp = `${OUTBOX_FILE}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify({ messages }, null, 2));
  renameSync(tmp, OUTBOX_FILE);
  return { queued: true };
}

/**
 * Queue a back-in-stock alert. Returns { queued: true } in all cases —
 * delivery itself activates with provider credentials (see owner guide).
 */
export function sendStockAlert({ to, productId, productTitle, unsubscribeToken }) {
  const base = process.env.PUBLIC_SHOP_URL || '';
  return recordOnly({
    to,
    subject: `${productTitle} is back — SOURCEDBYSMZ`,
    productId,
    unsubscribeUrl: `${base}/api/watchlist/unsubscribe/${unsubscribeToken}`,
  });
}
