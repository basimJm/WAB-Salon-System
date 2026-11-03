import type { Language, NotificationRecipientType, Platform } from '../../constants/enums';
import { CAMPAIGN_EVENT } from '../../constants/campaigns';
import { LANGUAGES } from '../../constants/i18n';
import {
  NOTIFICATION_EVENTS,
  PUSH_RESULTS,
  CLOSE_PUSH,
  REQUEST_PUSH,
  type Audience,
  type EventDefinition,
  type NotificationEvent,
} from '../../constants/notifications';
import type { PushApp } from '../../constants/providers';
import type { NotificationRaw, NotificationText } from '../../models/notification.model';
import type { Notifier } from '../../providers';
import type { PushRequest } from '../../providers/notifier/types';
import type {
  CustomersRepository,
  InstallationsRepository,
  MembersRepository,
} from '../../repositories/identity.repository';
import type { NotificationsRepository } from '../../repositories/notifications.repository';
import { isDuplicateKeyError } from '../../utils/database/errors';
import { toObjectId } from '../../utils/database/ids';
import { translate } from '../../utils/i18n';
import type { Logger } from '../../utils/logger';
import type { AccessEvents } from '../access/accessEvents';
import { effectivePermissions } from '../permissions/permissions';

/** A placeholder value: text, or a function that prints it in the recipient's language (dates, decisions). */
export type ParamValue = string | number | ((language: Language) => string);

export interface NotifyInput {
  /** Identifies this one occurrence (`booking.approved:<bookingId>`): a repeat is stored and pushed once. */
  readonly key: string;
  readonly params?: Readonly<Record<string, ParamValue>>;
  /** Opens the right screen: ids and a deep link, as strings (FCM data). */
  readonly data?: { bookingId?: string; salonId?: string; deepLink?: string };
  /** Customer audience: who. */
  readonly customerId?: string;
  /** Members audiences: the salon, and the staff named by the event (assigned / old / new). */
  readonly salonId?: string;
  /** The booking's or branch's branch: non-owner members of other branches are left out (§8). */
  readonly branchId?: string;
  readonly staffIds?: readonly string[];
  /** Extra FCM data in the recipient's language (the details of a booking request). */
  readonly pushData?: (language: Language) => Record<string, string>;
}

export interface NotificationService {
  /** Delivers one event to every audience it defines. Never throws: a failed delivery is logged. */
  notify(event: NotificationEvent, input: NotifyInput): Promise<void>;
  /**
   * One promotional message to one account: the in-app copy (PROMOTION) plus the push, both once per
   * `key`. A repeated key stores and sends nothing (`stored: false`).
   */
  deliverCampaign(input: {
    key: string;
    account: {
      type: NotificationRecipientType;
      id: string;
      language: Language;
      pushAllowed: boolean;
      devices: readonly { token: string; platform: Platform }[];
    };
    title: NotificationText;
    body: NotificationText;
    data: NotifyInput['data'];
  }): Promise<{ stored: boolean; sent: boolean }>;
  /** Unread notifications of an account: the bell badge. */
  unreadCount(recipientType: NotificationRecipientType, recipientId: string): Promise<number>;
}

interface Recipient {
  readonly type: NotificationRecipientType;
  readonly id: string;
  readonly language: Language;
  readonly app: PushApp;
  readonly tokens: readonly string[];
  /** Platform of each token: merchant booking requests are sent differently to Android and iOS. */
  readonly platforms: ReadonlyMap<string, Platform>;
  /** Customers and members can switch push off in the app (in-app copies are kept). */
  readonly pushAllowed: boolean;
}

export interface NotificationDeps {
  readonly notifications: NotificationsRepository;
  readonly customers: Pick<CustomersRepository, 'findById'>;
  readonly members: Pick<MembersRepository, 'findMany'>;
  readonly installations: Pick<InstallationsRepository, 'devicesOf' | 'dropTokens'>;
  readonly notifier: Notifier;
  readonly access: Pick<AccessEvents, 'unreadChanged'>;
  readonly logger: Logger;
}

const DEFAULT_LANGUAGE_FOR_MEMBERS: Language = 'ar';

const text = (key: string, params: NotifyInput['params'], language: Language): string => {
  const resolved = Object.fromEntries(
    Object.entries(params ?? {}).map(([name, value]) => [
      name,
      typeof value === 'function' ? value(language) : value,
    ]),
  );
  return translate(language, key, resolved);
};

/**
 * Close pushes (§5.21, SRV-187): Android gets a data message so the app draws Completed / No-show; iOS a
 * time-sensitive alert with the `BOOKING_CLOSE` category. One per booking on screen (collapse key).
 */
const closePushes = (
  recipient: Pick<Recipient, 'app' | 'id' | 'tokens' | 'platforms'>,
  input: NotifyInput,
  data: Record<string, string>,
  shown: { title: string; body: string },
  priority: Pick<PushRequest['message'], 'priority'>,
): PushRequest[] => {
  const android = recipient.tokens.filter((t) => recipient.platforms.get(t) !== 'IOS');
  const ios = recipient.tokens.filter((t) => recipient.platforms.get(t) === 'IOS');
  const collapse = input.data?.bookingId === undefined ? {} : { collapseKey: input.data.bookingId };
  const withActions = { ...data, actions: CLOSE_PUSH.actions };
  return [
    ...(android.length === 0
      ? []
      : [
          {
            target: { tokens: android },
            message: {
              app: recipient.app,
              kind: 'DATA_ONLY' as const,
              data: { ...withActions, ...shown },
              ...priority,
              ...collapse,
            },
            idempotencyKey: `${input.key}:${recipient.id}:android`,
          },
        ]),
    ...(ios.length === 0
      ? []
      : [
          {
            target: { tokens: ios },
            message: {
              app: recipient.app,
              kind: 'VISIBLE' as const,
              ...shown,
              data: withActions,
              ...priority,
              interruption: 'TIME_SENSITIVE' as const,
              actionCategory: CLOSE_PUSH.iosActionCategory,
              ...collapse,
            },
            idempotencyKey: `${input.key}:${recipient.id}:ios`,
          },
        ]),
  ];
};

export const createNotificationService = (deps: NotificationDeps): NotificationService => {
  const { notifications, customers, members, installations, notifier, access, logger } = deps;

  const customerRecipient = async (customerId: string): Promise<Recipient[]> => {
    const customer = await customers.findById(customerId);
    if (customer === null || customer.status === 'DELETED') return [];
    const devices = await installations.devicesOf({ customerId });
    return [
      {
        type: 'CUSTOMER',
        id: customer.id,
        language: customer.language,
        app: 'CUSTOMER',
        tokens: devices.map((d) => d.token),
        platforms: new Map(devices.map((d) => [d.token, d.platform])),
        pushAllowed: customer.pushEnabled,
      },
    ];
  };

  const memberRecipients = async (audience: Audience, input: NotifyInput): Promise<Recipient[]> => {
    if (input.salonId === undefined) return [];
    const team = await members.findMany({ salonId: input.salonId, active: true });
    const chosen = team.filter((member) => {
      if (audience.who === 'owner') return member.role === 'OWNER';
      if (audience.who !== 'members') return false;
      // Branch members only hear about their own branch; the owner hears about every branch.
      if (
        input.branchId !== undefined &&
        member.role !== 'OWNER' &&
        member.branchId !== input.branchId
      ) {
        return false;
      }
      const permissions = effectivePermissions(member);
      const byPermission = audience.permissions.some((p) => permissions.includes(p));
      const assigned =
        audience.assigned === true &&
        (input.staffIds ?? []).includes(member.id) &&
        (audience.permissions.length === 0 ||
          permissions.includes('BOOKINGS_VIEW_OWN') ||
          permissions.includes('BOOKINGS_VIEW_ALL'));
      return byPermission || assigned;
    });
    return Promise.all(
      chosen.map(async (member): Promise<Recipient> => {
        const devices = await installations.devicesOf({ memberId: member.id });
        return {
          type: 'MEMBER',
          id: member.id,
          language: devices[0]?.language ?? DEFAULT_LANGUAGE_FOR_MEMBERS,
          app: 'MERCHANT',
          tokens: devices.map((d) => d.token),
          platforms: new Map(devices.map((d) => [d.token, d.platform])),
          // Members can switch push off in the app (M25); older rows have no flag = on.
          pushAllowed: member.pushEnabled !== false,
        };
      }),
    );
  };

  const recipientsOf = async (audience: Audience, input: NotifyInput): Promise<Recipient[]> =>
    audience.who === 'customer'
      ? input.customerId === undefined
        ? []
        : customerRecipient(input.customerId)
      : memberRecipients(audience, input);

  const push = async (
    recipient: Recipient,
    event: NotificationEvent,
    id: string,
    title: NotificationText,
    body: NotificationText,
    input: NotifyInput,
  ): Promise<{ sent: boolean; result: string }> => {
    if (!recipient.pushAllowed) return { sent: false, result: PUSH_RESULTS.pushOff };
    if (recipient.tokens.length === 0) return { sent: false, result: PUSH_RESULTS.noToken };
    const definition: EventDefinition = NOTIFICATION_EVENTS[event];
    const data: Record<string, string> = {
      event,
      notificationId: id,
      ...(input.data?.bookingId === undefined ? {} : { bookingId: input.data.bookingId }),
      ...(input.data?.salonId === undefined ? {} : { salonId: input.data.salonId }),
      ...(input.data?.deepLink === undefined ? {} : { deepLink: input.data.deepLink }),
      ...(input.pushData?.(recipient.language) ?? {}),
    };
    const shown = { title: title[recipient.language], body: body[recipient.language] };
    const priority = definition.priority === undefined ? {} : { priority: definition.priority };
    const requests: PushRequest[] = [];
    const isRequest = definition.request === true && recipient.app === 'MERCHANT';
    const isClose = definition.closeActions === true && recipient.app === 'MERCHANT';
    if (isClose) {
      requests.push(...closePushes(recipient, input, data, shown, priority));
    } else if (isRequest) {
      // Android: a data message wakes the app so it can draw the overlay / full-screen alert.
      // iOS cannot run code for a visible alert: a time-sensitive notification with action buttons.
      const android = recipient.tokens.filter((t) => recipient.platforms.get(t) !== 'IOS');
      const ios = recipient.tokens.filter((t) => recipient.platforms.get(t) === 'IOS');
      const collapse =
        input.data?.bookingId === undefined ? {} : { collapseKey: input.data.bookingId };
      if (android.length > 0) {
        requests.push({
          target: { tokens: android },
          message: {
            app: recipient.app,
            kind: 'DATA_ONLY',
            data: { ...data, ...shown, actions: REQUEST_PUSH.actions },
            ...priority,
            androidChannelId: REQUEST_PUSH.androidChannelId,
            androidFullScreenIntent: true,
            ...collapse,
          },
          idempotencyKey: `${input.key}:${recipient.id}:android`,
        });
      }
      if (ios.length > 0) {
        requests.push({
          target: { tokens: ios },
          message: {
            app: recipient.app,
            kind: 'VISIBLE',
            ...shown,
            data: { ...data, actions: REQUEST_PUSH.actions },
            ...priority,
            interruption: 'TIME_SENSITIVE',
            actionCategory: REQUEST_PUSH.iosActionCategory,
            sound: REQUEST_PUSH.sound,
            ...collapse,
          },
          idempotencyKey: `${input.key}:${recipient.id}:ios`,
        });
      }
    } else {
      requests.push({
        target: { tokens: recipient.tokens },
        message: { app: recipient.app, kind: 'VISIBLE', ...shown, data, ...priority },
        idempotencyKey: `${input.key}:${recipient.id}`,
      });
    }
    try {
      let sent = 0;
      const invalid: string[] = [];
      for (const request of requests) {
        const result = await notifier.sendPush(request);
        sent += result.sent;
        invalid.push(...result.invalidTokens);
      }
      if (invalid.length > 0) await installations.dropTokens(invalid);
      return sent > 0
        ? { sent: true, result: PUSH_RESULTS.sent }
        : { sent: false, result: PUSH_RESULTS.failed };
    } catch (error) {
      logger.warn({ err: error, event, recipientId: recipient.id }, 'push delivery failed');
      return { sent: false, result: PUSH_RESULTS.failed };
    }
  };

  const deliver = async (
    recipient: Recipient,
    event: NotificationEvent,
    who: Audience['who'],
    input: NotifyInput,
  ): Promise<void> => {
    const render = (part: 'title' | 'body'): NotificationText => {
      const key = `notifications.${event}.${who}.${part}`;
      const [first, second] = LANGUAGES;
      return {
        [first]: text(key, input.params, first),
        [second]: text(key, input.params, second),
      };
    };
    await storeAndPush(recipient, event, render('title'), render('body'), input);
  };

  /** Stores the in-app copy once per occurrence, pushes it, and updates the live badge. */
  const storeAndPush = async (
    recipient: Recipient,
    event: NotificationEvent,
    title: NotificationText,
    body: NotificationText,
    input: NotifyInput,
  ): Promise<{ stored: boolean; sent: boolean }> => {
    const definition = NOTIFICATION_EVENTS[event];
    // The same occurrence was delivered before (a retried job, a repeated hook): nothing more to do.
    const already = await notifications.findOne({
      recipientType: recipient.type,
      recipientId: recipient.id,
      dedupeKey: input.key,
    });
    if (already !== null) return { stored: false, sent: false };
    let stored: NotificationRaw & { id: string };
    try {
      stored = (await notifications.create({
        recipientType: recipient.type,
        recipientId: toObjectId(recipient.id),
        type: definition.type,
        event,
        title,
        body,
        data: input.data ?? {},
        pushSent: false,
        dedupeKey: input.key,
      })) as never;
    } catch (error) {
      // The same occurrence was delivered before (a retried job): nothing more to do.
      if (isDuplicateKeyError(error)) return { stored: false, sent: false };
      throw error;
    }
    const outcome = await push(recipient, event, stored.id, title, body, input);
    await notifications.recordPush(stored.id, outcome.sent, outcome.result);
    // The badge is a live counter: tell the open app.
    const scope = recipient.type === 'CUSTOMER' ? 'customer' : 'merchant';
    await access.unreadChanged(
      { scope, id: recipient.id },
      await notifications.countUnread(recipient.type, recipient.id),
    );
    return { stored: true, sent: outcome.sent };
  };

  return {
    async deliverCampaign(input) {
      const { account, title, body } = input;
      return storeAndPush(
        {
          type: account.type,
          id: account.id,
          language: account.language,
          app: account.type === 'CUSTOMER' ? 'CUSTOMER' : 'MERCHANT',
          tokens: account.devices.map((d) => d.token),
          platforms: new Map(account.devices.map((d) => [d.token, d.platform])),
          pushAllowed: account.pushAllowed,
        },
        CAMPAIGN_EVENT,
        title,
        body,
        { key: input.key, data: input.data ?? {} },
      );
    },

    async notify(event, input) {
      for (const audience of NOTIFICATION_EVENTS[event].audiences) {
        try {
          for (const recipient of await recipientsOf(audience, input)) {
            try {
              await deliver(recipient, event, audience.who, input);
            } catch (error) {
              logger.error({ err: error, event, recipientId: recipient.id }, 'notification failed');
            }
          }
        } catch (error) {
          logger.error(
            { err: error, event, audience: audience.who },
            'notification audience failed',
          );
        }
      }
    },

    unreadCount: (recipientType, recipientId) =>
      notifications.countUnread(recipientType, recipientId),
  };
};
