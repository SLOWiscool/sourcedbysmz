import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
process.env.PORT = process.env.PORT || process.env.SERVER_PORT || '25609';

spawnSync('npm', ['install'], { cwd: ROOT, stdio: 'inherit' });
spawnSync('npm', ['install'], { cwd: join(ROOT, 'server'), stdio: 'inherit' });

if (!existsSync(join(ROOT, 'dist', 'index.html'))) {
  spawnSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit' });
}

spawnSync(process.execPath, [join(ROOT, 'server', 'index.js')], { stdio: 'inherit', env: process.env });
