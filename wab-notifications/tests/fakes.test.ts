import { FakeEmailChannel } from '../src/adapters/email/fake';
import { FakePushChannel } from '../src/adapters/push/fake';
import { ERROR_CODES } from '../src/constants/codes';
import { NotificationError } from '../src/errors';
import { emailRequest, pushRequest } from './helpers';

describe('FakePushChannel', () => {
  it('records pushes and reports SENT for every token', async () => {
    const fake = new FakePushChannel();
    const request = pushRequest();
    const result = await fake.send(request);
    expect(fake.sent).toEqual([request]);
    expect(result).toMatchObject({ sent: 2, invalidTokens: [] });
  });
  it('lets tests script invalid and failing tokens', async () => {
    const fake = new FakePushChannel();
    fake.markTokenInvalid('token-1');
    fake.markTokenFailing('token-2');
    const result = await fake.send(pushRequest());
    expect(result.tokens.map((t) => t.result)).toEqual(['INVALID_TOKEN', 'FAILED']);
    expect(result.invalidTokens).toEqual(['token-1']);
    expect(result.sent).toBe(0);
  });
  it('counts a topic push as one sent message', async () => {
    await expect(
      new FakePushChannel().send(pushRequest({ target: { topic: 'news' } })),
    ).resolves.toEqual({
      tokens: [],
      sent: 1,
      invalidTokens: [],
    });
  });
  it('fails the next call once on request', async () => {
    const fake = new FakePushChannel();
    fake.failNextWith(
      new NotificationError(ERROR_CODES.NETWORK_ERROR, 'down', { retryable: true }),
    );
    await expect(fake.send(pushRequest())).rejects.toMatchObject({
      code: ERROR_CODES.NETWORK_ERROR,
    });
    expect(fake.sent).toHaveLength(0);
    await expect(fake.send(pushRequest())).resolves.toMatchObject({ sent: 2 });
  });
});

describe('FakeEmailChannel', () => {
  it('records emails and accepts every address', async () => {
    const fake = new FakeEmailChannel();
    const result = await fake.send(emailRequest({ to: ['a@example.com', 'b@example.com'] }));
    expect(result).toEqual({ accepted: ['a@example.com', 'b@example.com'], rejected: [] });
    expect(fake.sent).toHaveLength(1);
  });
  it('rejects scripted addresses case-insensitively', async () => {
    const fake = new FakeEmailChannel();
    fake.markAddressRejected('Bad@Example.com');
    const result = await fake.send(emailRequest({ to: ['bad@example.com', 'good@example.com'] }));
    expect(result).toEqual({ accepted: ['good@example.com'], rejected: ['bad@example.com'] });
  });
  it('fails the next call once on request', async () => {
    const fake = new FakeEmailChannel();
    fake.failNextWith(new NotificationError(ERROR_CODES.TIMEOUT, 'slow', { retryable: true }));
    await expect(fake.send(emailRequest())).rejects.toMatchObject({ code: ERROR_CODES.TIMEOUT });
    await expect(fake.send(emailRequest())).resolves.toMatchObject({
      accepted: ['admin@example.com'],
    });
  });
});
