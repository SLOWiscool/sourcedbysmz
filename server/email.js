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

/**
 * Send one email. Throws with a human reason on failure (port blocked, DNS
 * missing, refused by receiver). Every attempt is recorded in the outbox.
 */
export async function sendMail({ to, subject, text, html, listUnsubscribe, transportOverride }) {
  const transport = transportOverride || buildTransport(ensureDkim());
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
    appendOutbox({ to, subject, status: accepted ? 'sent' : 'sent-unconfirmed', messageId: info?.messageId || null });
    return { sent: true, messageId: info?.messageId || null };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    appendOutbox({ to, subject, status: 'failed', reason });
    throw new Error(`Email to ${to} failed: ${reason}`);
  }
}

/** Back-in-stock alert for one subscriber. Returns { sent } or throws. */
export async function sendStockAlert({ to, productSlug, productTitle, unsubscribeToken, transportOverride }) {
  const base = (process.env.PUBLIC_SHOP_URL || `https://${getFromDomain()}`).replace(/\/$/, '');
  const productUrl = `${base}/products/${productSlug}`;
  const unsubscribeUrl = `${base}/api/watchlist/unsubscribe/${unsubscribeToken}`;
  const subject = `${productTitle} is back — SOURCEDBYSMZ`;
  const text =
    `Good news — ${productTitle} is available again at SOURCEDBYSMZ.\n\n` +
    `See it here: ${productUrl}\n\n` +
    `You got this because you asked for a stock alert. Unsubscribe any time: ${unsubscribeUrl}`;
  return sendMail({ to, subject, text, listUnsubscribe: unsubscribeUrl, transportOverride });
}
