import { describe, expect, it, vi } from 'vitest';

import { createSessionStore } from '@/app/session';
import { MIN_PASSWORD_LENGTH, MOCK_OTP_CODE } from '@/constants/auth';

import { MockAuthRepository } from '@/data/auth/MockAuthRepository';
import { RemoteAuthRepository } from '@/data/auth/RemoteAuthRepository';
import { AppError } from '@/infrastructure/errors/AppError';
import { HttpClient, type FetchFn } from '@/infrastructure/http/HttpClient';
import { createLogger, type LogSink } from '@/infrastructure/logger/logger';
import { registerGlobalErrorHandlers } from '@/infrastructure/observability/globalErrors';

const PASSWORD = 'p'.repeat(MIN_PASSWORD_LENGTH);

describe('data layer', () => {
  it('mock repository enforces challenge + code', async () => {
    const repo = new MockAuthRepository(0);
    await expect(repo.verifyOtp('missing', MOCK_OTP_CODE)).rejects.toMatchObject({
      kind: 'unauthorized',
    });
    const { challengeId } = await repo.login('a@b.co');
    await expect(repo.verifyOtp(challengeId, '000000')).rejects.toMatchObject({
      kind: 'validation',
    });
    expect((await repo.verifyOtp(challengeId, MOCK_OTP_CODE)).admin.email).toBe('a@b.co');
  });

  it('remote repository talks the admin auth endpoints through the http client', async () => {
    const envelope = (data: unknown) =>
      new Response(JSON.stringify({ success: true, message: 'ok', data }), { status: 200 });
    const fetchFn = vi
      .fn<FetchFn>()
      .mockResolvedValueOnce(envelope({ challengeId: 'c1' }))
      .mockResolvedValueOnce(
        envelope({ accessToken: 't', admin: { id: '1', name: 'A', email: 'a@b.co' } }),
      )
      .mockResolvedValueOnce(envelope(null));
    const http = new HttpClient({
      baseUrl: 'https://api.example.test',
      fetchFn,
      getToken: () => null,
      getLanguage: () => 'ar',
    });
    const repo = new RemoteAuthRepository(http);
    expect(await repo.login('a@b.co', PASSWORD)).toEqual({ challengeId: 'c1' });
    expect((await repo.verifyOtp('c1', MOCK_OTP_CODE)).accessToken).toBe('t');
    await repo.logout();
    expect(fetchFn.mock.calls.map((c) => new URL(c[0]).pathname)).toEqual([
      '/admin/v1/auth/login',
      '/admin/v1/auth/verify-otp',
      '/admin/v1/auth/logout',
    ]);
  });

  it('a 401 from any call clears the session store', async () => {
    const session = createSessionStore();
    session.set({ accessToken: 't', admin: { id: '1', name: 'A', email: 'a@b.co' } });
    const fetchFn: FetchFn = () =>
      Promise.resolve(
        new Response(
          JSON.stringify({ success: false, message: 'x', error: { code: 'UNAUTHORIZED' } }),
          { status: 401 },
        ),
      );
    const http = new HttpClient({
      baseUrl: 'https://api.example.test',
      fetchFn,
      getToken: () => 't',
      getLanguage: () => 'ar',
      onUnauthorized: session.clear,
    });
    await expect(new RemoteAuthRepository(http).logout()).rejects.toBeInstanceOf(AppError);
    expect(session.get()).toBeNull();
  });

  it('session store notifies subscribers and stops after unsubscribe', () => {
    const store = createSessionStore();
    const listener = vi.fn();
    const off = store.subscribe(listener);
    store.set({ accessToken: 't', admin: { id: '1', name: 'A', email: 'e' } });
    store.clear();
    store.clear();
    expect(listener).toHaveBeenCalledTimes(2);
    off();
    store.set({ accessToken: 't', admin: { id: '1', name: 'A', email: 'e' } });
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('global error handlers', () => {
  it('log window errors and unhandled rejections (redacted) and can be removed', () => {
    const sink = vi.fn<LogSink>();
    const off = registerGlobalErrorHandlers(window, createLogger('debug', sink));
    window.dispatchEvent(new ErrorEvent('error', { message: 'boom' }));
    const rejection = new Event('unhandledrejection') as Event & { reason: unknown };
    rejection.reason = new TypeError('Failed to fetch');
    window.dispatchEvent(rejection);
    expect(sink.mock.calls.map((c) => c[1])).toEqual(['window.error', 'unhandled.rejection']);
    expect(sink.mock.calls[1]?.[2]).toMatchObject({ kind: 'network' });
    off();
    window.dispatchEvent(new ErrorEvent('error', { message: 'again' }));
    expect(sink).toHaveBeenCalledTimes(2);
  });
});
