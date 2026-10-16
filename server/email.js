/**
 * email.js — outgoing mail, sent directly from your own domain.
 *
 * No paid provider needed. Uses nodemailer either through:
 *   1. SMTP_URL relay (e.g. your host's relay) when set — most reliable.
 *   2. Direct delivery (port 25) otherwise — works only if the host allows
 *      outbound SMTP. Many container/VPS hosts block port 25; failures are
 *      recorded with the reason instead of silently dropping mail.
 *
 * Deliverability needs three DNS records on your domain (printed on first
 * boot and in instructions.md): SPF, DKIM (keys auto-generated into
 * server/data/dkim.json — NEVER commit or share the private key) and DMARC.
 * New IPs start with a weak reputation: Gmail/Outlook may spam-folder mail
 * at first no matter what. That is a mail-reputation fact, not a bug.
 */

import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateKeyPairSync } from 'node:crypto';
import nodemailer from 'nodemailer';

const here = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(here, 'data');
const OUTBOX_FILE = join(DATA_DIR, 'outbox.json');
const DKIM_FILE = join(DATA_DIR, 'dkim.json');

let OUTBOX_OVERRIDE = null;

/** Override outbox path (tests). */
export function setOutboxFile(path) {
  OUTBOX_OVERRIDE = path;
}

function outboxFile() {
  return OUTBOX_OVERRIDE || OUTBOX_FILE;
}

function readOutbox() {
  try {
    const parsed = JSON.parse(readFileSync(outboxFile(), 'utf8'));
    if (parsed && Array.isArray(parsed.messages)) return parsed.messages;
  } catch {
    // Missing/corrupt → empty outbox.
  }
  return [];
}

export function getOutbox() {
  return readOutbox();
}

function appendOutbox(entry) {
  mkdirSync(DATA_DIR, { recursive: true });
  const messages = readOutbox();
  messages.push({ ...entry, createdAt: new Date().toISOString() });
  const tmp = `${outboxFile()}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify({ messages }, null, 2));
  renameSync(tmp, outboxFile());
}

export function getFromDomain() {
  const domain = (process.env.MAIL_FROM_DOMAIN || 'sourcedbysmz.co.uk').trim().toLowerCase();
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain) ? domain : 'sourcedbysmz.co.uk';
}

export function getFromAddress() {
  return `"SOURCEDBYSMZ" <alerts@${getFromDomain()}>`;
}

/**
 * Load DKIM keys, generating + printing DNS records on first run.
 * Returns { selector, privateKey, dnsTxt } or null when unavailable.
 */
export function ensureDkim() {
  try {
    const existing = JSON.parse(readFileSync(DKIM_FILE, 'utf8'));
    if (existing && existing.privateKey && existing.selector) return existing;
  } catch {
    // Generate below.
  }
  try {
    const selector = 'sbmz1';
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const dnsKey = publicKey
      .replace('-----BEGIN PUBLIC KEY-----', '')
      .replace('-----END PUBLIC KEY-----', '')
      .replace(/\s+/g, '');
    const record = { selector, privateKey, dnsTxt: `v=DKIM1; k=rsa; p=${dnsKey}` };
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DKIM_FILE, JSON.stringify(record, null, 2), { mode: 0o600 });
    console.log(`[mail] DKIM keys generated. Add this DNS TXT record at ${selector}._domainkey.${getFromDomain()}:`);
    console.log(`[mail] ${record.dnsTxt}`);
    return record;
  } catch {
    return null;
  }
}

function buildTransport(dkim) {
  if (process.env.SMTP_URL) {
    // Relay (host-provided SMTP or any SMTP_URL) — most reliable path.
    return nodemailer.createTransport(process.env.SMTP_URL);
  }
  // Direct delivery from this server (needs outbound port 25 open).
  const options = {
    direct: true,
    name: getFromDomain(),
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  };
  if (dkim) {
    options.dkim = {
      domainName: getFromDomain(),
      keySelector: dkim.selector,
      privateKey: dkim.privateKey,
    };
  }
  return nodemailer.createTransport(options);
}

/** SendPulse API base URL (override for tests/proxies). */
export function sendPulseBase() {
  return (process.env.SENDPULSE_API_BASE_URL || 'https://api.sendpulse.com').replace(/\/$/, '');
}

/**
 * Verified sender for the SendPulse API. New accounts start on the SMTP
 * Test plan whose pre-verified sender works immediately — the shop default
 * is the owner's verified sender@sourcedbysmz.co.uk (override with
 * SENDPULSE_API_FROM_EMAIL).
 */
export function sendPulseFrom() {
  const email = (process.env.SENDPULSE_API_FROM_EMAIL || 'sender@sourcedbysmz.co.uk').trim();
  const name = (process.env.SENDPULSE_API_FROM_NAME || 'SOURCEDBYSMZ').trim() || 'SOURCEDBYSMZ';
  return { email, name };
}

/**
 * verifyAuth() — GET /user/info. Proves the API key works before anything
 * tries to send. Throws with SendPulse's message on failure.
 */
export async function verifySendPulseAuth(fetchImpl) {
  const key = process.env.SENDPULSE_API_KEY;
  if (!key) throw new Error('SENDPULSE_API_KEY is not set in server/.env.');
  const get = fetchImpl || fetch;
  const res = await get(`${sendPulseBase()}/user/info`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`SendPulse auth failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  return res.json().catch(() => ({}));
}

/**
 * listSendPulseSenders() — GET /smtp/from-list. Returns the sender
 * addresses this account is actually allowed to send from. This is the
 * ground truth when SendPulse answers 422: whatever is NOT on this list
 * will be rejected, no matter what the docs say about defaults.
 */
export async function listSendPulseSenders(fetchImpl) {
  const key = process.env.SENDPULSE_API_KEY;
  if (!key) throw new Error('SENDPULSE_API_KEY is not set in server/.env.');
  const get = fetchImpl || fetch;
  const res = await get(`${sendPulseBase()}/smtp/from-list`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Could not list SendPulse senders (${res.status}): ${detail.slice(0, 200)}`);
  }
  return res.json().catch(() => ([]));
}

/**
 * Send via the SendPulse SMTP API (POST /smtp/emails).
 * Needs SENDPULSE_API_KEY in server/.env. Throws with SendPulse's message
 * on failure so the outbox records the real reason.
 */
async function sendViaSendPulse({ to, subject, text, html, fetchImpl }) {
  const post = fetchImpl || fetch;
  const from = sendPulseFrom();
  const res = await post(`${sendPulseBase()}/smtp/emails`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SENDPULSE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: {
        subject,
        html: Buffer.from(html || `<p>${text || subject}</p>`, 'utf8').toString('base64'),
        text: text || subject,
        from: { email: from.email, name: from.name },
        to: [{ email: to }],
      },
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    if (res.status === 422 && /sender is not valid/i.test(detail)) {
      throw new Error(
        `SendPulse rejected the sender (${from.email}). That address is not verified on your SendPulse account — verify it under SendPulse SMTP settings (run node server/send-test-email.js to list your allowed senders), then retry.`
      );
    }
    if (res.status === 429) {
      throw new Error('SendPulse rate limit reached — quota may be exhausted. Wait and retry; do not resend in a loop.');
    }
    throw new Error(`SendPulse refused the message (${res.status}): ${detail.slice(0, 200)}`);
  }
  return res.json().catch(() => ({}));
}

/**
 * Send one email. Transport priority: injected test transport, SendPulse API
 * key, SMTP_URL relay, direct port 25. Throws with a human reason on failure.
 * Every attempt is recorded in the outbox with which path was used.
 */
export async function sendMail({ to, subject, text, html, listUnsubscribe, transportOverride, fetchImpl }) {
  // Preferred path: SendPulse API key in server env (works even when the
  // host blocks outbound port 25).
  if (!transportOverride && process.env.SENDPULSE_API_KEY) {
    try {
      await sendViaSendPulse({ to, subject, text, html, fetchImpl });
      appendOutbox({ to, subject, status: 'sent', via: 'sendpulse' });
      return { sent: true, via: 'sendpulse' };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      appendOutbox({ to, subject, status: 'failed', via: 'sendpulse', reason });
      throw new Error(`Email to ${to} failed: ${reason}`);
    }
  }
  const transport = transportOverride || buildTransport(ensureDkim());
  const via = transportOverride ? 'test' : process.env.SMTP_URL ? 'smtp-relay' : 'direct';
  try {
    const info = await transport.sendMail({
      from: getFromAddress(),
      to,
      subject,
      text: text || subject,
      html,
      headers: listUnsubscribe ? { 'List-Unsubscribe': `<${listUnsubscribe}>` } : undefined,
    });
    const accepted = info && info.accepted && info.accepted.length > 0;
    appendOutbox({ to, subject, status: accepted ? 'sent' : 'sent-unconfirmed', via, messageId: info?.messageId || null });
    return { sent: true, via, messageId: info?.messageId || null };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    appendOutbox({ to, subject, status: 'failed', via, reason });
    throw new Error(`Email to ${to} failed: ${reason}`);
  }
}

/** Back-in-stock alert for one subscriber. Returns { sent } or throws. */
export async function sendStockAlert({ to, productSlug, productTitle, unsubscribeToken, transportOverride, fetchImpl }) {
  const base = (process.env.PUBLIC_SHOP_URL || `https://${getFromDomain()}`).replace(/\/$/, '');
  const productUrl = `${base}/products/${productSlug}`;
  const unsubscribeUrl = `${base}/api/watchlist/unsubscribe/${unsubscribeToken}`;
  const subject = `Back in stock: ${productTitle} – SOURCEDBYSMZ`;
  const text =
    `Good news — ${productTitle} is available again at SOURCEDBYSMZ.\n\n` +
    `See it here: ${productUrl}\n\n` +
    `You got this because you asked for a stock alert. Unsubscribe any time: ${unsubscribeUrl}`;
  const html =
    `<p>Good news — <strong>${productTitle}</strong> is available again at SOURCEDBYSMZ.</p>` +
    `<p><a href="${productUrl}">See it here</a></p>` +
    `<p style="color:#666;font-size:12px;">You got this because you asked for a stock alert. ` +
    `<a href="${unsubscribeUrl}">Unsubscribe any time</a>.</p>`;
  return sendMail({ to, subject, text, html, listUnsubscribe: unsubscribeUrl, transportOverride, fetchImpl });
}
