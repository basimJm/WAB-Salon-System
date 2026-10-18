/* Consumer smoke test: packs the built SDK, installs the tarball in a temp project and uses it
 * through both `require` (CJS) and `import` (ESM) . */
const { execFileSync } = require('node:child_process');
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const work = mkdtempSync(join(tmpdir(), 'wab-otp-smoke-'));
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
      const phone = '+962791234567';
      const otp = lib.createOtpService({ environment: 'dev', provider: 'fake', limits: { requestMax: 2 }, resendAfterSec: 0 });
      const pre = await otp.precheck({ phone, purpose: 'LOGIN' });
      const ok = await otp.verify({ proof: lib.fakeProof(phone), expectedPhone: phone, purpose: 'LOGIN' });
      const emu = lib.createOtpService({ environment: 'dev', provider: 'firebase', firebase: { projectId: 'p', authEmulatorHost: 'localhost:9099' } });
      const viaEmulator = await emu.verify({ proof: lib.createEmulatorToken({ projectId: 'p', phone }), expectedPhone: phone, purpose: 'LOGIN' });
      await otp.close();
      await emu.close();
      if (lib.SDK_NAME !== 'wab-otp' || !pre.allowed || ok.outcome !== 'VERIFIED' || viaEmulator.outcome !== 'VERIFIED' || typeof lib.OtpError !== 'function')
        throw new Error('smoke failed');
    };
  `;
  writeFileSync(
    join(work, 'cjs.cjs'),
    `${body}\nrun(require('wab-otp')).then(() => console.log('cjs ok'));`,
  );
  writeFileSync(
    join(work, 'esm.mjs'),
    `import * as lib from 'wab-otp';\n${body}\nrun(lib).then(() => console.log('esm ok'));`,
  );
  process.stdout.write(run('node', ['cjs.cjs'], work));
  process.stdout.write(run('node', ['esm.mjs'], work));
} finally {
  rmSync(work, { recursive: true, force: true });
}
