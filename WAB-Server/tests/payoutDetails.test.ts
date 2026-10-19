import type { RequestHandler } from 'express';
import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { loadConfig, ConfigError } from '../src/config';
import { createPayoutDetailsService } from '../src/domain/salons/payoutDetails.service';
import { MembersRepository } from '../src/repositories/identity.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { createFieldEncryption, isEncryptionKey } from '../src/utils/crypto/aesGcm';
import { UnauthorizedError } from '../src/utils/errors';
import { isValidIban, normalizeIban } from '../src/utils/iban';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const KEY = Buffer.alloc(32, 7).toString('base64');
const OTHER_KEY = Buffer.alloc(32, 9).toString('base64');
const JO_IBAN = 'JO94CBJO0010000000000131000302';
const GB_IBAN = 'GB82WEST12345698765432';

describe('field encryption', () => {
  const crypto = createFieldEncryption(KEY);
  it('round-trips any text, with a different ciphertext every time', () => {
    const a = crypto.encrypt(JO_IBAN);
    const b = crypto.encrypt(JO_IBAN);
    expect(a).not.toBe(b);
    expect(a).not.toContain(JO_IBAN);
    expect(a.startsWith('v1:')).toBe(true);
    expect(crypto.decrypt(a)).toBe(JO_IBAN);
    expect(crypto.decrypt(crypto.encrypt('اسم البنك ✓'))).toBe('اسم البنك ✓');
    expect(crypto.decrypt(crypto.encrypt(''))).toBe('');
  });
  it('detects tampering, another key and malformed values', () => {
    const stored = crypto.encrypt(JO_IBAN);
    const [v, iv, tag, body] = stored.split(':');
    const flipped = Buffer.from(body ?? '', 'base64');
    flipped[0] = (flipped[0] ?? 0) ^ 1;
    expect(() => crypto.decrypt([v, iv, tag, flipped.toString('base64')].join(':'))).toThrow();
    expect(() => createFieldEncryption(OTHER_KEY).decrypt(stored)).toThrow();
    for (const bad of ['', 'x', 'v2:a:b:c', 'v1:a:b', `${stored}:extra`, 'v1::::']) {
      expect(() => crypto.decrypt(bad)).toThrow();
    }
  });
  it('accepts only a base64 key of exactly 32 bytes', () => {
    expect(isEncryptionKey(KEY)).toBe(true);
    expect(isEncryptionKey(Buffer.alloc(31).toString('base64'))).toBe(false);
    expect(isEncryptionKey(Buffer.alloc(33).toString('base64'))).toBe(false);
    expect(isEncryptionKey('not base64!')).toBe(false);
    expect(isEncryptionKey('')).toBe(false);
    expect(() => createFieldEncryption('short')).toThrow();
  });
});

describe('IBAN validation', () => {
  it('accepts correct IBANs in any spacing and case', () => {
    expect(isValidIban(JO_IBAN)).toBe(true);
    expect(isValidIban('jo94 cbjo 0010 0000 0000 0131 0003 02')).toBe(true);
    expect(isValidIban(GB_IBAN)).toBe(true);
    expect(normalizeIban(' jo94-cbjo 0010 ')).toBe('JO94CBJO0010');
  });
  it('rejects wrong checksums, lengths, characters and shapes', () => {
    for (const bad of [
      'JO95CBJO0010000000000131000302', // checksum
      'JO94CBJO001000000000013100030', // Jordan IBANs have 30 characters
      'JO94CBJO00100000000001310003022',
      'GB82WEST1234569876543', // too short for its checksum
      'GB82WEST1234569876543!',
      '1234567890123456',
      'JO',
      '',
      'ZZ00ABCDEFGHIJKLMNOP',
    ]) {
      expect(isValidIban(bad)).toBe(false);
    }
  });
});

describe('configuration', () => {
  const base = {
    MONGODB_URI: 'mongodb://localhost/x',
    REDIS_URL: 'redis://localhost',
    JWT_ACCESS_SECRET: 'a'.repeat(48),
  };
  const production = {
    ...base,
    NODE_ENV: 'production',
    OTP_PROVIDER: 'real',
    STORAGE_PROVIDER: 'real',
    NOTIFIER_PROVIDER: 'real',
    PAYMENT_PROVIDER: 'disabled',
    FIREBASE_PROJECT_ID: 'wab-prod-test',
    FCM_SERVICE_ACCOUNT_JSON: '{}',
    SMTP_HOST: 'smtp.example.test',
    EMAIL_FROM_ADDRESS: 'noreply@example.test',
    S3_REGION: 'eu-central-1',
    S3_PUBLIC_BUCKET: 'wab-public',
    S3_PRIVATE_BUCKET: 'wab-private',
    CDN_BASE_URL: 'https://cdn.example.test',
  };
  const invalidKeys = (env: NodeJS.ProcessEnv): readonly string[] => {
    try {
      loadConfig(env);
    } catch (error) {
      if (error instanceof ConfigError) return error.invalidKeys;
      throw error;
    }
    return [];
  };
  it('is optional outside production and exposed once valid', () => {
    expect(loadConfig(base).secrets.payoutEncryptionKey).toBeUndefined();
    expect(loadConfig({ ...base, PAYOUT_ENCRYPTION_KEY: KEY }).secrets.payoutEncryptionKey).toBe(
      KEY,
    );
  });
  it('a malformed key fails fast naming the key only', () => {
    expect(invalidKeys({ ...base, PAYOUT_ENCRYPTION_KEY: 'short' })).toEqual([
      'PAYOUT_ENCRYPTION_KEY',
    ]);
    expect(
      invalidKeys({ ...base, PAYOUT_ENCRYPTION_KEY: Buffer.alloc(16).toString('base64') }),
    ).toEqual(['PAYOUT_ENCRYPTION_KEY']);
  });
  it('production cannot start without it', () => {
    expect(invalidKeys(production)).toEqual(['PAYOUT_ENCRYPTION_KEY']);
    expect(invalidKeys({ ...production, PAYOUT_ENCRYPTION_KEY: KEY })).toEqual([]);
  });
});

describe('bank details', () => {
  const m = { salons: createFakeModel(), members: createFakeModel() };
  const audits: Record<string, unknown>[] = [];
  const verified: { e164: string; purpose: string }[] = [];
  const resets: string[] = [];
  let proofOk = true;
  const salonId = new Types.ObjectId();
  const ownerId = new Types.ObjectId();
  const managerId = new Types.ObjectId();
  const adminId = new Types.ObjectId();

  const service = createPayoutDetailsService({
    salons: new SalonsRepository(m.salons.model as never),
    members: new MembersRepository(m.members.model as never),
    phones: {
      verify: (phone, _token, purpose) => {
        verified.push({ e164: phone.e164, purpose });
        return proofOk
          ? Promise.resolve()
          : Promise.reject(new UnauthorizedError({ code: 'OTP_INVALID' }));
      },
    },
    otpGate: {
      reset: (phone) => {
        resets.push(phone);
        return Promise.resolve();
      },
    },
    encryption: createFieldEncryption(KEY),
    audit: {
      record: (entry: Record<string, unknown>) => {
        audits.push(entry);
        return Promise.resolve(entry as never);
      },
    },
  });
  const merchantGuard: RequestHandler = (req, _res, next) => {
    const owner = req.header('x-role') !== 'MANAGER';
    req.member = {
      id: (owner ? ownerId : managerId).toHexString(),
      salonId: salonId.toHexString(),
      role: owner ? 'OWNER' : 'MANAGER',
      permissions: [],
    } as never;
    next();
  };
  const adminGuard: RequestHandler = (req, _res, next) => {
    req.auth = {
      subjectType: 'ADMIN',
      subjectId: adminId.toHexString(),
      scope: 'admin',
      expiresAt: new Date(Date.now() + 60_000),
    } as never;
    next();
  };
  const app = createApp({
    logger,
    services: {
      payoutDetails: service,
      adminGuard,
      salonProfile: { service: undefined as never, guard: [merchantGuard] },
    },
  });
  const put = (body: object, role = 'OWNER'): request.Test =>
    request(app)
      .put('/merchant/v1/salon/payout-details')
      .set('x-role', role)
      .send({
        bankName: 'Capital Bank',
        accountHolderName: 'Glow Salon',
        iban: JO_IBAN,
        idToken: 'proof',
        ...body,
      });
  const stored = (): Record<string, unknown> | undefined =>
    m.salons.docs[0]?.['payoutDetails'] as Record<string, unknown> | undefined;
  interface Body {
    data: Record<string, string> | null;
    error: { code: string };
  }
  const bodyOf = (res: { body: unknown }): Body => res.body as Body;

  beforeEach(() => {
    for (const f of Object.values(m)) f.docs.length = 0;
    audits.length = 0;
    verified.length = 0;
    resets.length = 0;
    proofOk = true;
    m.salons.docs.push({ _id: salonId, name: 'Glow' });
    m.members.docs.push(
      { _id: ownerId, salonId, role: 'OWNER', active: true, phone: '+962791111111' },
      { _id: managerId, salonId, role: 'MANAGER', active: true, phone: '+962792222222' },
    );
  });

  it('the owner saves details after an OTP; the IBAN is stored encrypted and only the last 4 come back', async () => {
    const res = await put({ iban: 'jo94 cbjo 0010 0000 0000 0131 0003 02' });
    expect(res.status).toBe(200);
    expect(bodyOf(res).data).toEqual({
      bankName: 'Capital Bank',
      accountHolderName: 'Glow Salon',
      ibanLast4: '0302',
    });
    expect(JSON.stringify(res.body)).not.toContain(JO_IBAN);
    expect(stored()?.['ibanLast4']).toBe('0302');
    expect(String(stored()?.['ibanEncrypted'])).not.toContain('CBJO');
    expect(verified).toEqual([{ e164: '+962791111111', purpose: 'BANK_DETAILS' }]);
    expect(resets).toEqual(['+962791111111']);
    const read = await request(app).get('/merchant/v1/salon/payout-details');
    expect(bodyOf(read).data).toMatchObject({ ibanLast4: '0302' });
    expect(JSON.stringify(read.body)).not.toContain('ibanEncrypted');
  });
  it('a wrong proof saves nothing; an invalid IBAN does not spend the code', async () => {
    proofOk = false;
    const wrong = await put({});
    expect(wrong.status).toBe(401);
    expect(stored()).toBeUndefined();
    proofOk = true;
    verified.length = 0;
    const bad = await put({ iban: 'JO95CBJO0010000000000131000302' });
    expect(bad.status).toBe(400);
    expect(verified).toEqual([]);
    expect(stored()).toBeUndefined();
    expect((await put({ bankName: '' })).status).toBe(400);
    expect((await put({ idToken: '' })).status).toBe(400);
  });
  it('only the owner: a manager cannot read or change them', async () => {
    expect((await put({}, 'MANAGER')).status).toBe(403);
    const read = await request(app)
      .get('/merchant/v1/salon/payout-details')
      .set('x-role', 'MANAGER');
    expect(read.status).toBe(403);
    expect(bodyOf(read).error.code).toBe('OWNER_REQUIRED');
    expect(stored()).toBeUndefined();
  });
  it('shows null before anything was saved', async () => {
    expect(bodyOf(await request(app).get('/merchant/v1/salon/payout-details')).data).toBeNull();
  });
  it('the admin reveals the full IBAN to transfer (audited) and edits with a reason (audit has no IBAN)', async () => {
    const none = await request(app).get(`/admin/v1/salons/${salonId.toHexString()}/payout-details`);
    expect(bodyOf(none).data).toBeNull();
    expect(audits).toHaveLength(0);
    await put({});
    const reveal = await request(app).get(
      `/admin/v1/salons/${salonId.toHexString()}/payout-details`,
    );
    expect(bodyOf(reveal).data).toMatchObject({ iban: JO_IBAN, ibanLast4: '0302' });
    expect(audits[0]).toMatchObject({
      action: 'PAYOUT_DETAILS_VIEW',
      entityId: salonId.toHexString(),
    });
    const edit = await request(app)
      .put(`/admin/v1/salons/${salonId.toHexString()}/payout-details`)
      .send({
        bankName: 'Arab Bank',
        accountHolderName: 'Glow LLC',
        iban: GB_IBAN,
        reason: 'Salon sent a new letter',
      });
    expect(edit.status).toBe(200);
    expect(bodyOf(edit).data).toMatchObject({ bankName: 'Arab Bank', ibanLast4: '5432' });
    expect(audits[1]).toMatchObject({
      action: 'PAYOUT_DETAILS_UPDATE',
      reason: 'Salon sent a new letter',
      before: { bankName: 'Capital Bank', ibanLast4: '0302' },
      after: { bankName: 'Arab Bank', ibanLast4: '5432' },
    });
    expect(JSON.stringify(audits)).not.toContain(JO_IBAN);
    expect(JSON.stringify(audits)).not.toContain(GB_IBAN);
    expect(verified).toHaveLength(1); // the admin edit needs no owner OTP
  });
  it('the admin edit needs a reason and a valid IBAN; unknown salons are 404', async () => {
    const url = `/admin/v1/salons/${salonId.toHexString()}/payout-details`;
    const body = { bankName: 'B', accountHolderName: 'H', iban: JO_IBAN };
    expect((await request(app).put(url).send(body)).status).toBe(400);
    expect(
      (
        await request(app)
          .put(url)
          .send({ ...body, reason: 'x', iban: 'nope' })
      ).status,
    ).toBe(400);
    expect(stored()).toBeUndefined();
    const missing = `/admin/v1/salons/${new Types.ObjectId().toHexString()}/payout-details`;
    expect((await request(app).get(missing)).status).toBe(404);
    expect(
      (
        await request(app)
          .put(missing)
          .send({ ...body, reason: 'x' })
      ).status,
    ).toBe(404);
  });
});
