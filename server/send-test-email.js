#!/usr/bin/env node
/**
 * send-test-email.js — verify the SendPulse key, then send one test email.
 * Run from the repo root:  node server/send-test-email.js you@example.com
 * Reads server/.env automatically (same loader as the backend).
 *
 * NOTE (Test plan): SendPulse rewrites demo mail to sender
 * "SP test <devtest@sendpulseemail.com>" and prefixes the subject with
 * "For development purposes only: " no matter what you pass. Expected.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

// Same minimal .env loader as server/index.js (real environment wins).
try {
  const { readFileSync } = await import('node:fs');
  const text = readFileSync(join(here, '.env'), 'utf8');
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const eq = line.indexOf('=');
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && !(key in process.env)) process.env[key] = value;
  }
} catch {
  // No server/.env — env vars must already be set.
}

const { verifySendPulseAuth, sendStockAlert, sendPulseFrom } = await import('./email.js');

const to = process.argv[2];
if (!to || !to.includes('@')) {
  console.error('Usage: node server/send-test-email.js you@example.com');
  process.exit(1);
}

try {
  const me = await verifySendPulseAuth();
  console.log('Authenticated with SendPulse.');
  if (me && typeof me === 'object') {
    const preview = JSON.stringify(me).slice(0, 200);
    console.log(`Account info: ${preview}`);
  }
} catch (err) {
  console.error(`Auth failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}

try {
  const { listSendPulseSenders } = await import('./email.js');
  const senders = await listSendPulseSenders();
  const flat = Array.isArray(senders) ? senders : senders.result || senders.data || [];
  console.log('Verified senders on this account:');
  for (const s of Array.isArray(flat) ? flat : [flat]) {
    console.log(`  - ${typeof s === 'string' ? s : s.email || s.from_email || JSON.stringify(s)}`);
  }
  console.log('If your sender is not listed, add/verify it in SendPulse first — anything else gets HTTP 422.');
} catch (err) {
  console.error(`Could not list senders: ${err instanceof Error ? err.message : err}`);
  console.error('Continuing anyway — the send attempt below will show the real error.');
}

try {
  const from = sendPulseFrom();
  console.log(`Sending test email to ${to} from ${from.email} …`);
  await sendStockAlert({
    to,
    productSlug: '',
    productTitle: 'Test Product',
    unsubscribeToken: 'test-token',
  });
  console.log('Sent. Check inbox AND spam.');
  console.log('Test-plan note: expect sender "SP test <devtest@sendpulseemail.com>" and subject prefix "For development purposes only: ".');
} catch (err) {
  console.error(`Send failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
