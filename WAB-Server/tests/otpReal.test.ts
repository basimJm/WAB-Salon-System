import {
  createEmulatorToken,
  ERROR_CODES,
  OtpError,
  type OtpOptions,
  type ProofVerifier,
} from '@wab/otp';
import type { Redis } from 'ioredis';
import { loadConfig, type AppConfig, type OtpSettings } from '../src/config';
import { createProviders, ProviderUnavailableError } from '../src/providers';
import {
  createRealOtp,
  mapSdkError,
  toServerResult,
  type ClosableOtpProvider,
} from '../src/providers/otp/real';
import { ExternalServiceError } from '../src/utils/errors';
import { createLogger } from '../src/utils/logger';

const logger = createLogger({ level: 'silent' });
const PHONE = '+962791234567';
const PROJECT = 'wab-dev-test';
const SETTINGS: OtpSettings = {
  firebase: { projectId: PROJECT, authEmulatorHost: 'localhost:9099' },
};
const INPUT = { proof: 'p', expectedPhone: PHONE, purpose: 'LOGIN' } as const;

const withVerifier = (
  verify: ProofVerifier['verify'],
  close?: () => Promise<void>,
): { provider: ClosableOtpProvider; options: () => OtpOptions | undefined } => {
  let seen: OtpOptions | undefined;
  const provider = createRealOtp({
    settings: SETTINGS,
    logger,
    isProduction: false,
    build: (options) => {
      seen = options;
      return { verify, ...(close === undefined ? {} : { close }) };
    },
  });
  return { provider, options: () => seen };
};

describe('createRealOtp (wab-otp SDK)', () => {
  it('verifies an emulator-shaped Firebase token end to end through the real SDK', async () => {
    const provider = createRealOtp({ settings: SETTINGS, logger, isProduction: false });
    const proof = createEmulatorToken({ projectId: PROJECT, phone: PHONE });
    await expect(provider.verify({ ...INPUT, proof })).resolves.toEqual({
      outcome: 'VERIFIED',
      phone: PHONE,
    });
    await expect(
      provider.verify({ ...INPUT, proof, expectedPhone: '+962781234567' }),
    ).resolves.toEqual({ outcome: 'PHONE_MISMATCH' });
    await expect(
      provider.verify({
        ...INPUT,
        proof: createEmulatorToken({ projectId: PROJECT, phone: PHONE, expiresInSec: -3600 }),
      }),
    ).resolves.toEqual({ outcome: 'EXPIRED' });
    await expect(provider.verify({ ...INPUT, proof: 'garbage' })).resolves.toEqual({
      outcome: 'INVALID_PROOF',
    });
    await provider.close();
  });

  it('passes the environment, project and logger to the SDK', async () => {
    const dev = withVerifier(() => Promise.resolve({ outcome: 'INVALID_PROOF' }));
    await dev.provider.verify(INPUT);
    expect(dev.options()).toMatchObject({
      environment: 'dev',
      provider: 'firebase',
      firebase: { projectId: PROJECT, authEmulatorHost: 'localhost:9099' },
    });
    expect(dev.options()?.logger).toBeDefined();
    let production: OtpOptions | undefined;
    createRealOtp({
      settings: { firebase: { projectId: 'wab-prod-test' } },
      logger,
      isProduction: true,
      build: (options) => {
        production = options;
        return { verify: () => Promise.resolve({ outcome: 'INVALID_PROOF' }) };
      },
    });
    expect(production).toMatchObject({
      environment: 'prod',
      firebase: { projectId: 'wab-prod-test' },
    });
    expect(production?.firebase).not.toHaveProperty('authEmulatorHost');
  });

  it('refuses the emulator host in production at the SDK too', () => {
    expect(() => createRealOtp({ settings: SETTINGS, logger, isProduction: true })).toThrow(
      'forbidden in production',
    );
  });

  it('maps outage errors to ExternalServiceError and caller errors to RangeError', async () => {
    const outage = new OtpError(ERROR_CODES.VENDOR_ERROR, 'down secret-host', { retryable: true });
    const down = withVerifier(() => Promise.reject(outage));
    const failure = await down.provider.verify(INPUT).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ExternalServiceError);
    const caller = withVerifier(() =>
      Promise.reject(new OtpError(ERROR_CODES.VALIDATION_FAILED, 'bad phone')),
    );
    await expect(caller.provider.verify(INPUT)).rejects.toBeInstanceOf(RangeError);
    const config = withVerifier(() =>
      Promise.reject(new OtpError(ERROR_CODES.CONFIG_INVALID, 'bad config')),
    );
    await expect(config.provider.verify(INPUT)).rejects.toBeInstanceOf(RangeError);
    const bug = new TypeError('programmer error');
    expect(() => mapSdkError(bug)).toThrow(bug);
    expect(() => mapSdkError(new OtpError(ERROR_CODES.UNKNOWN, 'x'))).toThrow(ExternalServiceError);
  });

  it('never reads an unexpected outcome as success', () => {
    expect(toServerResult({ outcome: 'VERIFIED', phone: PHONE })).toEqual({
      outcome: 'VERIFIED',
      phone: PHONE,
    });
    expect(toServerResult({ outcome: 'VERIFIED' })).toEqual({ outcome: 'INVALID_PROOF' });
    expect(toServerResult({ outcome: 'EXPIRED' })).toEqual({ outcome: 'EXPIRED' });
    expect(toServerResult({ outcome: 'PHONE_MISMATCH' })).toEqual({ outcome: 'PHONE_MISMATCH' });
    for (const outcome of ['PURPOSE_MISMATCH', 'BLOCKED', 'INVALID_PROOF', 'SOMETHING_NEW']) {
      expect(toServerResult({ outcome })).toEqual({ outcome: 'INVALID_PROOF' });
    }
  });

  it('closes the SDK verifier, and tolerates one without a close hook', async () => {
    const close = jest.fn().mockResolvedValue(undefined);
    const closable = withVerifier(() => Promise.resolve({ outcome: 'INVALID_PROOF' }), close);
    await closable.provider.close();
    expect(close).toHaveBeenCalledTimes(1);
    const plain = withVerifier(() => Promise.resolve({ outcome: 'INVALID_PROOF' }));
    await expect(plain.provider.close()).resolves.toBeUndefined();
  });
});

describe('createProviders with OTP_PROVIDER=real', () => {
  const ALL_FAKE = {
    otp: 'real',
    storage: 'fake',
    notifier: 'fake',
    payments: 'fake',
    analytics: 'fake',
  } as const;
  const config = (otp?: OtpSettings): AppConfig =>
    ({ ...(otp === undefined ? {} : { otp }) }) as unknown as AppConfig;
  const deps = (otp?: OtpSettings): { redis: Redis; logger: typeof logger; config: AppConfig } => ({
    redis: {} as Redis,
    logger,
    config: config(otp),
  });

  it('builds the real provider from the config and closes it with the others', async () => {
    const providers = createProviders(ALL_FAKE, false, deps(SETTINGS));
    const proof = createEmulatorToken({ projectId: PROJECT, phone: PHONE });
    await expect(providers.otp.verify({ ...INPUT, proof })).resolves.toMatchObject({
      outcome: 'VERIFIED',
    });
    await expect(providers.close()).resolves.toBeUndefined();
  });

  it('fails loudly when the Firebase project or the runtime dependencies are missing', () => {
    expect(() => createProviders(ALL_FAKE, false, deps())).toThrow(ProviderUnavailableError);
    expect(() => createProviders(ALL_FAKE, false)).toThrow(ProviderUnavailableError);
  });

  it('loadConfig supplies the settings the provider needs', () => {
    const loaded = loadConfig({
      MONGODB_URI: 'mongodb://localhost/x',
      REDIS_URL: 'redis://localhost',
      JWT_ACCESS_SECRET: 'a'.repeat(48),
      OTP_PROVIDER: 'real',
      FIREBASE_PROJECT_ID: PROJECT,
    });
    expect(() =>
      createProviders(ALL_FAKE, false, {
        redis: {} as Redis,
        logger,
        config: loaded,
      }),
    ).not.toThrow();
  });
});
