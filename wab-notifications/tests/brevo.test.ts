import { BrevoEmailChannel, type FetchLike } from '../src/adapters/email/brevo';
import { ERROR_CODES } from '../src/constants/codes';
import { FAST_RETRY, emailRequest, instantDeps, spyLogger } from './helpers';

const FROM = { name: 'WAB', address: 'no-reply@example.com' };
interface Call {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

/** A fetch that answers from a script of `[status, body]` or throws a given error. */
const scripted = (answers: ([number, string] | Error)[]): { fetch: FetchLike; calls: Call[] } => {
  const calls: Call[] = [];
  const fetch: FetchLike = (url, init) => {
    calls.push({
      url,
      headers: init.headers,
      body: JSON.parse(init.body) as Record<string, unknown>,
    });
    const next = answers.shift();
    if (next === undefined) throw new Error('no scripted answer');
    if (next instanceof Error) return Promise.reject(next);
    const [status, text] = next;
    return Promise.resolve({ status, text: () => Promise.resolve(text) });
  };
  return { fetch, calls };
};

const build = (
  fetch: FetchLike,
  extra: { baseUrl?: string } = {},
): { channel: BrevoEmailChannel; sleeps: number[]; log: ReturnType<typeof spyLogger> } => {
  const { deps, sleeps } = instantDeps();
  const log = spyLogger();
  const channel = new BrevoEmailChannel({
    apiKey: 'key-1',
    from: FROM,
    fetch,
    logger: log.logger,
    retry: FAST_RETRY,
    retryDeps: deps,
    ...extra,
  });
  return { channel, sleeps, log };
};

describe('BrevoEmailChannel', () => {
  it('posts the message to the Brevo API with the key header and accepts every recipient', async () => {
    const { fetch, calls } = scripted([[201, '{"messageId":"<m1>"}']]);
    const { channel } = build(fetch);
    const request = emailRequest({ html: '<p>hi</p>' });
    const result = await channel.send(request);
    expect(result).toEqual({ accepted: [...request.to], rejected: [] });
    expect(calls[0]?.url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(calls[0]?.headers['api-key']).toBe('key-1');
    expect(calls[0]?.body).toMatchObject({
      sender: { name: 'WAB', email: 'no-reply@example.com' },
      to: request.to.map((email) => ({ email })),
      subject: request.subject,
      textContent: request.text,
      htmlContent: '<p>hi</p>',
    });
  });

  it('uses a custom base URL (local mock in dev) and leaves html out when absent', async () => {
    const { fetch, calls } = scripted([[202, '']]);
    const { channel } = build(fetch, { baseUrl: 'http://localhost:4010' });
    await channel.send(emailRequest());
    expect(calls[0]?.url).toBe('http://localhost:4010/smtp/email');
    expect(calls[0]?.body).not.toHaveProperty('htmlContent');
  });

  it('retries 429, 5xx, network errors and timeouts, then succeeds', async () => {
    const timeout = Object.assign(new Error('t'), { name: 'TimeoutError' });
    const { fetch, calls } = scripted([
      [429, '{"code":"too_many_requests"}'],
      [503, ''],
      [201, '{}'],
    ]);
    const { channel, sleeps, log } = build(fetch);
    await channel.send(emailRequest());
    expect(calls).toHaveLength(3);
    expect(sleeps).toHaveLength(2);
    expect(log.entries.filter((e) => e.message === 'brevo.retry')).toHaveLength(2);
    const second = scripted([new TypeError('fetch failed'), timeout, new TypeError('again')]);
    await expect(build(second.fetch).channel.send(emailRequest())).rejects.toMatchObject({
      code: ERROR_CODES.NETWORK_ERROR,
    });
    expect(second.calls).toHaveLength(3);
  });

  it('does not retry permanent failures and reports the vendor code', async () => {
    const { fetch, calls } = scripted([[401, '{"code":"unauthorized","message":"Key not found"}']]);
    await expect(build(fetch).channel.send(emailRequest())).rejects.toMatchObject({
      code: ERROR_CODES.AUTH_FAILED,
      details: { status: 401, vendorCode: 'unauthorized' },
    });
    expect(calls).toHaveLength(1);
    const quota = scripted([[402, 'not json']]);
    await expect(build(quota.fetch).channel.send(emailRequest())).rejects.toMatchObject({
      code: ERROR_CODES.QUOTA_EXCEEDED,
      details: { vendorCode: null },
    });
  });

  it('an unknown status is logged and never treated as success', async () => {
    const { fetch } = scripted([[418, '{}']]);
    const { channel, log } = build(fetch);
    await expect(channel.send(emailRequest())).rejects.toMatchObject({ code: ERROR_CODES.UNKNOWN });
    expect(log.entries.some((e) => e.level === 'error' && e.message === 'brevo.unknown')).toBe(
      true,
    );
  });

  it('an accepted status with an unreadable body is a malformed response', async () => {
    for (const body of ['<html>', '"text"']) {
      const { fetch } = scripted([[201, body]]);
      const { channel, log } = build(fetch);
      await expect(channel.send(emailRequest())).rejects.toMatchObject({
        code: ERROR_CODES.MALFORMED_RESPONSE,
      });
      expect(log.entries.some((e) => e.message === 'brevo.malformed')).toBe(true);
    }
  });

  it('defaults: the global fetch and the default retry policy', () => {
    const channel = new BrevoEmailChannel({ apiKey: 'k', from: FROM, logger: spyLogger().logger });
    expect(channel).toBeInstanceOf(BrevoEmailChannel);
  });
});
