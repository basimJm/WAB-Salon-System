import { APNS, DATA_KEYS, TRUE_STRING } from '../../constants/defaults';
import type { PushMessage } from '../../types';

/** Subset of the firebase-admin message shape we build (kept structural to avoid vendor leaks). */
export interface FcmBaseMessage {
  data?: Record<string, string>;
  notification?: { title: string; body: string };
  android: {
    priority: 'high' | 'normal';
    collapseKey?: string;
    notification?: { channelId?: string; sound?: string };
  };
  apns: {
    headers: Record<string, string>;
    payload: { aps: Record<string, unknown> };
  };
}

const isHigh = (message: PushMessage): boolean =>
  message.priority === 'HIGH' || message.interruption === 'TIME_SENSITIVE';

/** Maps the vendor-neutral message to FCM for both platforms (Android overlay, iOS time-sensitive). */
export const buildFcmMessage = (message: PushMessage): FcmBaseMessage => {
  const visible = message.kind === 'VISIBLE';
  const high = isHigh(message);

  const data: Record<string, string> = { ...message.data };
  if (message.androidFullScreenIntent === true) data[DATA_KEYS.fullScreenIntent] = TRUE_STRING;
  // Data-only messages draw nothing by themselves: ship the text so the app can build its own UI.
  if (!visible && message.title !== undefined) data[DATA_KEYS.titleFallback] = message.title;
  if (!visible && message.body !== undefined) data[DATA_KEYS.bodyFallback] = message.body;

  const aps: Record<string, unknown> = {};
  if (message.badge !== undefined) aps.badge = message.badge;
  if (visible) {
    aps.sound = message.sound ?? APNS.defaultSound;
    if (message.actionCategory !== undefined) aps.category = message.actionCategory;
    if (message.interruption === 'TIME_SENSITIVE') {
      aps['interruption-level'] = APNS.interruptionTimeSensitive;
    }
  } else {
    aps.contentAvailable = true;
  }

  const headers: Record<string, string> = {
    'apns-priority': visible ? APNS.priorityHigh : APNS.priorityLow,
    'apns-push-type': visible ? APNS.pushTypeAlert : APNS.pushTypeBackground,
  };
  if (message.collapseKey !== undefined) headers['apns-collapse-id'] = message.collapseKey;

  const androidNotification: { channelId?: string; sound?: string } = {};
  if (visible && message.androidChannelId !== undefined) {
    androidNotification.channelId = message.androidChannelId;
  }
  if (visible && message.sound !== undefined) androidNotification.sound = message.sound;

  const result: FcmBaseMessage = {
    android: { priority: high ? 'high' : 'normal' },
    apns: { headers, payload: { aps } },
  };
  if (Object.keys(data).length > 0) result.data = data;
  if (visible) result.notification = { title: message.title ?? '', body: message.body ?? '' };
  if (message.collapseKey !== undefined) result.android.collapseKey = message.collapseKey;
  if (Object.keys(androidNotification).length > 0)
    result.android.notification = androidNotification;
  return result;
};
