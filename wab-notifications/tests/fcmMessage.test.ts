import { buildFcmMessage } from '../src/adapters/push/fcmMessage';

describe('buildFcmMessage', () => {
  it('maps a visible push with defaults for both platforms', () => {
    const message = buildFcmMessage({ app: 'CUSTOMER', kind: 'VISIBLE', title: 'T', body: 'B' });
    expect(message.notification).toEqual({ title: 'T', body: 'B' });
    expect(message.data).toBeUndefined();
    expect(message.android).toEqual({ priority: 'normal' });
    expect(message.apns.headers).toEqual({ 'apns-priority': '10', 'apns-push-type': 'alert' });
    expect(message.apns.payload.aps).toEqual({ sound: 'default' });
  });

  it('maps every optional field of a visible push', () => {
    const message = buildFcmMessage({
      app: 'MERCHANT',
      kind: 'VISIBLE',
      title: 'T',
      body: 'B',
      data: { id: '1' },
      priority: 'HIGH',
      interruption: 'TIME_SENSITIVE',
      actionCategory: 'BOOKING_REQUEST',
      sound: 'request.wav',
      badge: 3,
      androidChannelId: 'requests',
      androidFullScreenIntent: true,
      collapseKey: 'booking-1',
    });
    expect(message.data).toEqual({ id: '1', fullScreenIntent: 'true' });
    expect(message.android).toEqual({
      priority: 'high',
      collapseKey: 'booking-1',
      notification: { channelId: 'requests', sound: 'request.wav' },
    });
    expect(message.apns.headers['apns-collapse-id']).toBe('booking-1');
    expect(message.apns.payload.aps).toEqual({
      badge: 3,
      sound: 'request.wav',
      category: 'BOOKING_REQUEST',
      'interruption-level': 'time-sensitive',
    });
  });

  it('treats TIME_SENSITIVE as high priority even without an explicit priority', () => {
    const message = buildFcmMessage({
      app: 'MERCHANT',
      kind: 'VISIBLE',
      title: 'T',
      body: 'B',
      interruption: 'TIME_SENSITIVE',
    });
    expect(message.android.priority).toBe('high');
  });

  it('maps a data-only push to a silent background message', () => {
    const message = buildFcmMessage({
      app: 'MERCHANT',
      kind: 'DATA_ONLY',
      data: { type: 'PERMISSIONS_UPDATED' },
      priority: 'HIGH',
      badge: 0,
      sound: 'ignored.wav',
      androidChannelId: 'ignored',
      actionCategory: 'IGNORED',
    });
    expect(message.notification).toBeUndefined();
    expect(message.data).toEqual({ type: 'PERMISSIONS_UPDATED' });
    expect(message.android).toEqual({ priority: 'high' });
    expect(message.apns.headers).toEqual({ 'apns-priority': '5', 'apns-push-type': 'background' });
    expect(message.apns.payload.aps).toEqual({ badge: 0, contentAvailable: true });
  });

  it('copies text into data for data-only pushes so the app can draw its own overlay', () => {
    const message = buildFcmMessage({
      app: 'MERCHANT',
      kind: 'DATA_ONLY',
      data: { a: '1' },
      title: 'T',
      body: 'B',
    });
    expect(message.data).toEqual({ a: '1', title: 'T', body: 'B' });
  });

  it('does not mutate the caller data', () => {
    const data = { a: '1' };
    buildFcmMessage({
      app: 'CUSTOMER',
      kind: 'VISIBLE',
      title: 'T',
      body: 'B',
      data,
      androidFullScreenIntent: true,
    });
    expect(data).toEqual({ a: '1' });
  });
});
