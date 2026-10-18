/* Consumer smoke test: packs the built SDK, installs the tarball in a temp project and uses it
 * through both `require` (CJS) and `import` (ESM) with the fake adapters. */
const { execFileSync } = require('node:child_process');
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const work = mkdtempSync(join(tmpdir(), 'wab-storage-smoke-'));
const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });

try {
  const packed = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', work], root));
  const tarball = join(work, packed[0].filename);
  writeFileSync(
    join(work, 'package.json'),
    JSON.stringify({ name: 'consumer', version: '1.0.0', private: true }),
  );
  run('npm', ['install', '--no-audit', '--no-fund', '--silent', tarball], work);

  const body = `
    const run = async (lib) => {
      const store = lib.createStorage({ environment: 'dev', provider: 'memory', cdn: { baseUrl: 'http://localhost:9000/cdn' } });
      const target = await store.createUploadUrl({ key: 'smoke/a.jpg', visibility: 'PUBLIC', contentType: 'image/jpeg', maxBytes: 100, expiresInSec: 30 });
      const missing = await store.confirmUpload({ key: 'smoke/a.jpg', visibility: 'PUBLIC', contentType: 'image/jpeg', maxBytes: 100 });
      let rejected = false;
      try { await store.createUploadUrl({ key: '../x', visibility: 'PUBLIC', contentType: 'image/jpeg', maxBytes: 1, expiresInSec: 1 }); } catch (e) { rejected = e instanceof lib.StorageError; }
      if (target.method !== 'PUT' || missing.reason !== 'NOT_FOUND' || !rejected || store.variantKey('a/b.jpg', 'thumb') !== 'a/b_thumb.webp' || lib.SDK_NAME !== 'wab-storage') throw new Error('smoke failed');
    };
  `;
  writeFileSync(
    join(work, 'cjs.cjs'),
    `${body}\nrun(require('@wab/storage')).then(() => console.log('cjs ok'));`,
  );
  writeFileSync(
    join(work, 'esm.mjs'),
    `import * as lib from '@wab/storage';\n${body}\nrun(lib).then(() => console.log('esm ok'));`,
  );
  process.stdout.write(run('node', ['cjs.cjs'], work));
  process.stdout.write(run('node', ['esm.mjs'], work));
} finally {
  rmSync(work, { recursive: true, force: true });
}
