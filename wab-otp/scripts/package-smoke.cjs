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
      const store = new lib.MemoryCodeStore();
      const channel = new lib.FakeOtpChannel();
      const codes = lib.createCodeOtp({ environment: 'dev', channel, store, codeSecret: 'c'.repeat(32), proofSecret: 'p'.repeat(32) });
      await codes.sendCode({ phone, purpose: 'LOGIN', language: 'ar' });
      const viaCode = await codes.verifyCode({ phone, purpose: 'LOGIN', code: channel.lastCode(phone) });
      const signed = lib.createOtpService({ environment: 'dev', provider: 'signed', proof: { secret: 'p'.repeat(32), store } });
      const viaToken = await signed.verify({ proof: viaCode.otpToken, expectedPhone: phone, purpose: 'LOGIN' });
      const wa = lib.createWhatsAppChannel({ environment: 'dev', phoneNumberId: '1', accessToken: 't', templateName: 'otp', languageCodes: { ar: 'ar' },
        fetch: async () => ({ status: 200, text: async () => JSON.stringify({ messages: [{ id: 'wamid.1' }] }) }) });
      const sent = await wa.send({ to: phone, code: '123456', language: 'ar', purpose: 'LOGIN', ttlSec: 300 });
      await otp.close();
      await signed.close();
      if (lib.SDK_NAME !== 'wab-otp' || !pre.allowed || ok.outcome !== 'VERIFIED' || viaToken.outcome !== 'VERIFIED' || sent.id !== 'wamid.1' || lib.ERROR_CODES.DELIVERY_FAILED !== 'OTP_DELIVERY_FAILED' || typeof lib.OtpError !== 'function')
        throw new Error('smoke failed');
    };
  `;
  writeFileSync(
    join(work, 'cjs.cjs'),
    `${body}\nrun(require('@wab/otp')).then(() => console.log('cjs ok'));`,
  );
  writeFileSync(
    join(work, 'esm.mjs'),
    `import * as lib from '@wab/otp';\n${body}\nrun(lib).then(() => console.log('esm ok'));`,
  );
  process.stdout.write(run('node', ['cjs.cjs'], work));
  process.stdout.write(run('node', ['esm.mjs'], work));
} finally {
  rmSync(work, { recursive: true, force: true });
}
