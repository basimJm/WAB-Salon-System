import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hostingFiles, originsFromEnv, type HostingTarget } from './lib/hosting.ts';

/**
 * node scripts/write-hosting.ts <variant> [--target netlify|vercel] [--out <dir>]
 * Writes the host's header and routing files from the same public env values the build used
 * (VITE_API_BASE_URL, VITE_SOCKET_URL; optional CSP_CONNECT_EXTRA = comma list of extra https origins).
 */
const args = process.argv.slice(2);
const variant = args[0];
const option = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
if (!variant) {
  console.error('usage: write-hosting.ts <variant> [--target netlify|vercel] [--out <dir>]');
  process.exit(1);
}
const target: HostingTarget = option('--target') === 'vercel' ? 'vercel' : 'netlify';
const out = option('--out') ?? join('dist', variant);
const requireRemote = variant.startsWith('prod');
const files = hostingFiles(target, originsFromEnv(process.env, requireRemote));
mkdirSync(out, { recursive: true });
for (const [name, content] of Object.entries(files)) writeFileSync(join(out, name), content);
console.log(`hosting: wrote ${Object.keys(files).join(', ')} for ${target} into ${out}`);
