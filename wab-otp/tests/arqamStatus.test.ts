import { readAccount, readDeliveryStatus } from '../src/adapters/arqam/status';

describe('readAccount', () => {
  it('reads mode, balance and status at the top level or under account / data', () => {
    expect(readAccount({ mode: 'live', balance: 1200, status: 'active' })).toEqual({
      mode: 'LIVE',
      balance: 1200,
      status: 'active',
    });
    expect(readAccount({ success: true, account: { mode: 'TEST', credits: '75' } })).toEqual({
      mode: 'TEST',
      balance: 75,
      status: undefined,
    });
    expect(readAccount({ data: { mode: 'test', balance: 0 } })).toMatchObject({
      mode: 'TEST',
      balance: 0,
    });
  });

  it('maps unknown or missing values explicitly', () => {
    expect(readAccount({ mode: 'sandbox', balance: 'lots', status: '' })).toEqual({
      mode: 'UNKNOWN',
      balance: undefined,
      status: undefined,
    });
    expect(readAccount({ mode: 3, balance: Number.NaN })).toEqual({
      mode: 'UNKNOWN',
      balance: undefined,
      status: undefined,
    });
    expect(readAccount({ mode: 'toString', balance: ' ' })).toMatchObject({
      mode: 'UNKNOWN',
      balance: undefined,
    });
    expect(readAccount({})).toEqual({ mode: 'UNKNOWN', balance: undefined, status: undefined });
  });

  it('answers null for a malformed answer', () => {
    expect(readAccount(null)).toBeNull();
    expect(readAccount('x')).toBeNull();
    expect(readAccount([])).toBeNull();
  });
});

describe('readDeliveryStatus', () => {
  it('normalizes the current status and the history', () => {
    expect(
      readDeliveryStatus({
        messageId: 'm1',
        currentStatus: 'failed',
        history: [
          { status: 'sent', timestamp: '2026-10-26T10:00:00Z' },
          { status: 'delivered', timestamp: '2026-10-26T10:00:01Z' },
          { status: 'read' },
          { status: 'failed', errorCode: '131026', errorMessage: 'undeliverable' },
          { status: 'mystery' },
          null,
          'junk',
        ],
      }),
    ).toEqual({
      messageId: 'm1',
      state: 'FAILED',
      history: [
        {
          state: 'SENT',
          timestamp: '2026-10-26T10:00:00Z',
          errorCode: undefined,
          errorMessage: undefined,
        },
        {
          state: 'DELIVERED',
          timestamp: '2026-10-26T10:00:01Z',
          errorCode: undefined,
          errorMessage: undefined,
        },
        { state: 'READ', timestamp: undefined, errorCode: undefined, errorMessage: undefined },
        {
          state: 'FAILED',
          timestamp: undefined,
          errorCode: '131026',
          errorMessage: 'undeliverable',
        },
        { state: 'UNKNOWN', timestamp: undefined, errorCode: undefined, errorMessage: undefined },
      ],
    });
  });

  it('accepts a missing history and an unknown current status', () => {
    expect(readDeliveryStatus({ messageId: 'm2', currentStatus: 'queued' })).toEqual({
      messageId: 'm2',
      state: 'UNKNOWN',
      history: [],
    });
  });

  it('answers null without a message id', () => {
    expect(readDeliveryStatus(null)).toBeNull();
    expect(readDeliveryStatus({ currentStatus: 'sent' })).toBeNull();
    expect(readDeliveryStatus({ messageId: '' })).toBeNull();
  });
});
