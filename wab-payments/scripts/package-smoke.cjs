/* Consumer smoke test: packs the built SDK, installs the tarball in a temp project and uses it
 * through both `require` (CJS) and `import` (ESM) with the fake adapter. */
const { execFileSync } = require('node:child_process');
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const work = mkdtempSync(join(tmpdir(), 'wab-payments-smoke-'));
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
      if (lib.PACKAGE_NAME !== '@wab/payments' || typeof lib.createPayments !== 'function') throw new Error('smoke failed: exports');
      const payments = lib.createPayments({ environment: 'dev', provider: 'fake' });
      const request = { idempotencyKey: 'smoke:session:0001', amountFils: 12500, reference: 'draft-1' };
      const session = await payments.createSession(request);
      const again = await payments.createSession(request);
      const verified = await payments.verify(session.sessionId);
      if (session.sessionId !== again.sessionId || verified.status !== 'SUCCEEDED' || typeof lib.PaymentSdkError !== 'function') throw new Error('smoke failed');
      await payments.close();
    };
  `;
  writeFileSync(
    join(work, 'cjs.cjs'),
    `${body}\nrun(require('@wab/payments')).then(() => console.log('cjs ok'));`,
  );
  writeFileSync(
    join(work, 'esm.mjs'),
    `import * as lib from '@wab/payments';\n${body}\nrun(lib).then(() => console.log('esm ok'));`,
  );
  process.stdout.write(run('node', ['cjs.cjs'], work));
  process.stdout.write(run('node', ['esm.mjs'], work));
} finally {
  rmSync(work, { recursive: true, force: true });
}
