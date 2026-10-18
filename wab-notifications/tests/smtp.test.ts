import { SmtpEmailChannel } from '../src/adapters/email/smtp';
import { ERROR_CODES } from '../src/constants/codes';
import {
  FAST_RETRY,
  emailRequest,
  instantDeps,
  scriptedTransport,
  smtpError,
  spyLogger,
} from './helpers';

const FROM = { name: 'WAB', address: 'no-reply@example.com' };

const build = (
  transport: ReturnType<typeof scriptedTransport>,
): { channel: SmtpEmailChannel; sleeps: number[]; created: () => number } => {
  const { deps, sleeps } = instantDeps();
  let created = 0;
  const channel = new SmtpEmailChannel({
    transport: () => {
      created += 1;
      return transport;
    },
    from: FROM,
    logger: spyLogger().logger,
    retry: FAST_RETRY,
    retryDeps: deps,
  });
  return { channel, sleeps, created: () => created };
};

describe('SmtpEmailChannel', () => {
  it('sends with the configured sender and normalises address objects', async () => {
    const transport = scriptedTransport([
      {
        accepted: ['a@example.com', { address: 'b@example.com', name: '' }],
        rejected: [{ address: 'c@example.com' }, 'd@example.com', 42],
      },
    ]);
    const { channel } = build(transport);
    const result = await channel.send(
      emailRequest({ to: ['a@example.com', 'b@example.com', 'c@example.com'], html: '<p>x</p>' }),
    );
    expect(result).toEqual({
      accepted: ['a@example.com', 'b@example.com'],
      rejected: ['c@example.com', 'd@example.com', '42'],
    });
    expect(transport.mails[0]).toMatchObject({
      from: FROM,
      subject: 'Subject',
      text: 'Body',
      html: '<p>x</p>',
    });
  });

  it('omits html when not given', async () => {
    const transport = scriptedTransport([]);
    await build(transport).channel.send(emailRequest());
    expect(transport.mails[0]).not.toHaveProperty('html');
  });

  it('creates the transport lazily and once', async () => {
    const transport = scriptedTransport([]);
    const { channel, created } = build(transport);
    expect(created()).toBe(0);
    await channel.send(emailRequest());
    await channel.send(emailRequest());
    expect(created()).toBe(1);
  });

  it('retries transient failures with backoff', async () => {
    const transport = scriptedTransport([
      smtpError({ code: 'ECONNECTION' }),
      smtpError({ responseCode: 451 }),
    ]);
    const { channel, sleeps } = build(transport);
    const result = await channel.send(emailRequest());
    expect(result.accepted).toEqual(['admin@example.com']);
    expect(transport.mails).toHaveLength(3);
    expect(sleeps).toEqual([10, 20]);
  });

  it('gives up after the last attempt', async () => {
    const transport = scriptedTransport([
      smtpError({ code: 'ETIMEDOUT' }),
      smtpError({ code: 'ETIMEDOUT' }),
      smtpError({ code: 'ETIMEDOUT' }),
    ]);
    await expect(build(transport).channel.send(emailRequest())).rejects.toMatchObject({
      code: ERROR_CODES.TIMEOUT,
    });
  });

  it('does not retry auth failures or quota errors', async () => {
    const auth = scriptedTransport([smtpError({ code: 'EAUTH' })]);
    await expect(build(auth).channel.send(emailRequest())).rejects.toMatchObject({
      code: ERROR_CODES.AUTH_FAILED,
    });
    expect(auth.mails).toHaveLength(1);
    const quota = scriptedTransport([
      smtpError({ responseCode: 550, response: '550 5.4.5 Daily user sending limit exceeded' }),
    ]);
    await expect(build(quota).channel.send(emailRequest())).rejects.toMatchObject({
      code: ERROR_CODES.QUOTA_EXCEEDED,
    });
    expect(quota.mails).toHaveLength(1);
  });

  it('reports every recipient as rejected when the server refuses them all (no throw)', async () => {
    const transport = scriptedTransport([smtpError({ code: 'EENVELOPE', responseCode: 550 })]);
    const result = await build(transport).channel.send(
      emailRequest({ to: ['a@example.com', 'b@example.com'] }),
    );
    expect(result).toEqual({ accepted: [], rejected: ['a@example.com', 'b@example.com'] });
  });

  it('works with the default retry policy', async () => {
    const transport = scriptedTransport([]);
    const channel = new SmtpEmailChannel({
      transport: () => transport,
      from: FROM,
      logger: spyLogger().logger,
    });
    await expect(channel.send(emailRequest())).resolves.toMatchObject({
      accepted: ['admin@example.com'],
    });
  });

  it('closes the transport and recreates it on the next send', async () => {
    const transport = scriptedTransport([]);
    const { channel, created } = build(transport);
    await channel.send(emailRequest());
    await channel.close();
    expect(transport.closed).toBe(1);
    await channel.send(emailRequest());
    expect(created()).toBe(2);
  });

  it('close is safe before any send and without a transport close method', async () => {
    const { channel } = build(scriptedTransport([]));
    await expect(channel.close()).resolves.toBeUndefined();
    const bare = new SmtpEmailChannel({
      transport: () => ({ sendMail: () => Promise.resolve({ accepted: [], rejected: [] }) }),
      from: FROM,
      logger: spyLogger().logger,
    });
    await bare.send(emailRequest());
    await expect(bare.close()).resolves.toBeUndefined();
  });
});
