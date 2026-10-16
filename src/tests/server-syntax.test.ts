import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const files = [
  '../../server/index.js',
  '../../server/auth.js',
  '../../server/account-store.js',
  '../../server/setup-admin.js',
  '../../server/validate.js',
  '../../server/store.js',
  '../../server/orders.js',
  '../../launcher.js',
  '../../start.js',
  '../../find-ip.js',
].map((f) => join(here, f));

describe('server entry points parse (tsc never checks plain JS)', () => {
  for (const file of files) {
    const name = file.split(/[\\/]/).pop();
    it(`parses ${name}`, () => {
      expect(() => execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' })).not.toThrow();
    });
  }
});
