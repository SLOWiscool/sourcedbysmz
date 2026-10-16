#!/usr/bin/env node
/**
 * find-ip.js — prints this machine's IPv4 addresses.
 * Run: `node find-ip.js` (or `npm run find:ip`)
 *
 * Use the PUBLIC IPv4 for your domain's DNS A record
 * (e.g. shop.yourdomain.com -> 123.45.67.89).
 * Local addresses are just for your own network reference.
 */

import { networkInterfaces } from 'node:os';

console.log('--- Local IPv4 addresses (your own network) ---');
let foundLocal = false;
for (const [name, addrs] of Object.entries(networkInterfaces())) {
  for (const a of addrs || []) {
    if (a.family === 'IPv4' && !a.internal) {
      console.log(`  ${name}: ${a.address}`);
      foundLocal = true;
    }
  }
}
if (!foundLocal) console.log('  (none found)');

console.log('--- Public IPv4 address (put THIS in your DNS A record) ---');
const services = ['https://api.ipify.org', 'https://icanhazip.com', 'https://ifconfig.me/ip'];
for (const url of services) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) continue;
    const ip = (await res.text()).trim();
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
      console.log(`  ${ip}   (via ${url})`);
      process.exit(0);
    }
  } catch {
    // Try the next service.
  }
}
console.error('  Could not reach any IP echo service. Check internet access and try again.');
process.exit(1);
