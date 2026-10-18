import { DEEP_LINKS, EVENT_BY_BOOKING_STATUS } from '../../constants/notifications';
import type { Language } from '../../constants/i18n';
import type { BookingRaw } from '../../models/booking.model';
import type { RefundRaw } from '../../models/refund.model';
import type { PayoutRaw } from '../../models/payout.model';
import type { BookingsRepository } from '../../repositories/bookings.repository';
import type {
  CustomersRepository,
  MembersRepository,
} from '../../repositories/identity.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import type { Entity } from '../../utils/database/plain';
import { translate } from '../../utils/i18n';
import { formatDateTime } from '../../utils/format/localized';
import { formatJod } from '../../utils/money';
import type { Logger } from '../../utils/logger';
import type { BookingChangedHook } from '../bookings/bookingActions.service';
import type { BookingCreatedHook } from '../bookings/bookingCreation.service';
import type { CatalogRequestNotifier } from '../catalog/catalogRequests.service';
import type { PayoutNotifier } from '../payouts/payouts.service';
import type { RefundHooks } from '../refunds/refunds.service';
import type { ApplicationNotifier } from '../salons/salonReview.service';
import type { SubscriptionAlert } from '../subscriptions/subscriptions.service';
import type { SalonStateNotifier } from '../salons/salonState.service';
import type { SettingsService } from '../settings';
import type { NotificationService, ParamValue } from './notifications.service';

export interface ProducerDeps {
  readonly notifications: Pick<NotificationService, 'notify'>;
  readonly salons: Pick<SalonsRepository, 'findById'>;
  readonly customers: Pick<CustomersRepository, 'findById'>;
  readonly members: Pick<MembersRepository, 'findById'>;
  readonly bookings: Pick<BookingsRepository, 'findById'>;
  readonly settings: Pick<SettingsService, 'get'>;
  readonly logger: Logger;
}

type Params = Record<string, ParamValue>;

/**
 * Turns what happens in the business (bookings, refunds, payouts, reviews of applications, salon
 * state) into notification events. Each adapter plugs into the hook or notifier interface its
 * domain service already offers, and none of them can break the business action: failures are logged.
 */
/** The booking events that background jobs raise (SRV-096). */
export type JobBookingEvent =
  'booking.reminder_1h' | 'booking.reminder_15m' | 'booking.pending_30m';

export interface NotificationProducers {
  readonly bookingCreated: BookingCreatedHook;
  /** Sends a reminder / pending alert; one delivery per booking and event even if the job repeats. */
  readonly bookingJobEvent: (event: JobBookingEvent, booking: Entity<BookingRaw>) => Promise<void>;
  /** Tells a salon owner that the subscription is ending soon or has expired (once per end date). */
  readonly subscriptionAlert: (
    event: 'subscription.ending_7d' | 'subscription.expired',
    alert: SubscriptionAlert,
  ) => Promise<void>;
  readonly bookingChanged: Required<BookingChangedHook>;
  readonly refundHooks: Required<Pick<RefundHooks, 'started' | 'refunded' | 'failed'>>;
  readonly applicationNotifier: ApplicationNotifier;
  readonly salonStateNotifier: SalonStateNotifier;
  readonly catalogRequestNotifier: CatalogRequestNotifier;
  readonly payoutNotifier: PayoutNotifier;
}

export const createNotificationProducers = (deps: ProducerDeps): NotificationProducers => {
  const { notifications, salons, customers, members, bookings, settings, logger } = deps;

  const guarded =
    <A extends unknown[]>(what: string, task: (...args: A) => Promise<void>) =>
    async (...args: A): Promise<void> => {
      try {
        await task(...args);
      } catch (error) {
        logger.error({ err: error, what }, 'notification producer failed');
      }
    };

  const salonName = async (salonId: string): Promise<string> =>
    (await salons.findById(salonId))?.name ?? '';

  const bookingParams = async (booking: Entity<BookingRaw>): Promise<Params> => {
    const [salon, customer, timeZone] = await Promise.all([
      salonName(booking.salonId),
      customers.findById(booking.customerId),
      settings.get('timezone'),
    ]);
    return {
      reference: booking.referenceNumber,
      salon,
      customer: customer?.firstName ?? '',
      when: (language: Language) => formatDateTime(booking.appointmentStart, timeZone, language),
    };
  };
  const bookingTarget = (
    booking: Entity<BookingRaw>,
  ): {
    customerId: string;
    salonId: string;
    staffIds: string[];
    data: { bookingId: string; salonId: string; deepLink: string };
  } => ({
    customerId: booking.customerId,
    salonId: booking.salonId,
    staffIds: [...new Set(booking.persons.map((p) => p.staffId))],
    data: {
      bookingId: booking.id,
      salonId: booking.salonId,
      deepLink: DEEP_LINKS.booking(booking.id),
    },
  });

  const bookingCreated: BookingCreatedHook = {
    created: guarded('booking.created', async (booking) => {
      const base = { ...bookingTarget(booking), params: await bookingParams(booking) };
      await notifications.notify('booking.created', {
        ...base,
        key: `booking.created:${booking.id}`,
      });
      const customer = await customers.findById(booking.customerId);
      const timeZone = await settings.get('timezone');
      const staff = await Promise.all(
        base.staffIds.map(async (staffId) => (await members.findById(staffId))?.firstName ?? ''),
      );
      await notifications.notify('booking.requested', {
        ...base,
        key: `booking.requested:${booking.id}`,
        // What the merchant app draws in its overlay / alert without a round trip (Merchant PRD M10).
        pushData: (language: Language) => ({
          reference: booking.referenceNumber,
          customer: customer?.firstName ?? '',
          persons: String(booking.persons.length),
          services: booking.persons
            .flatMap((person) => person.services.map((service) => service.name[language]))
            .join(', '),
          staff: staff.filter((name) => name !== '').join(', '),
          when: formatDateTime(booking.appointmentStart, timeZone, language),
          startsAt: booking.appointmentStart.toISOString(),
          respondBy: booking.respondBy.toISOString(),
          total: formatJod(booking.money.total),
          paymentMethod: booking.paymentMethod,
          isBride: String(booking.hasBride),
        }),
      });
    }),
  };

  const bookingChanged: Required<BookingChangedHook> = {
    changed: guarded('booking.changed', async (booking) => {
      const event = (
        EVENT_BY_BOOKING_STATUS as Record<
          string,
          (typeof EVENT_BY_BOOKING_STATUS)[keyof typeof EVENT_BY_BOOKING_STATUS]
        >
      )[booking.status];
      if (event === undefined) return;
      await notifications.notify(event, {
        ...bookingTarget(booking),
        params: await bookingParams(booking),
        // Every transition is one occurrence, so an admin revert and re-approval are announced again.
        key: `${event}:${booking.id}:${String(booking.statusHistory.length)}`,
      });
    }),
    reassigned: guarded('booking.reassigned', async (booking, change) => {
      const staff = await members.findById(change.to);
      await notifications.notify('booking.reassigned', {
        ...bookingTarget(booking),
        staffIds: [change.from, change.to],
        params: { ...(await bookingParams(booking)), staff: staff?.firstName ?? '' },
        key: `booking.reassigned:${booking.id}:${change.to}`,
      });
    }),
  };

  const bookingJobEvent: NotificationProducers['bookingJobEvent'] = async (event, booking) => {
    await notifications.notify(event, {
      ...bookingTarget(booking),
      params: await bookingParams(booking),
      key: `${event}:${booking.id}`,
    });
  };

  const subscriptionAlert: NotificationProducers['subscriptionAlert'] = async (event, alert) => {
    const timeZone = await settings.get('timezone');
    await notifications.notify(event, {
      key: `${event}:${alert.subscriptionId}:${String(alert.endsAt.getTime())}`,
      salonId: alert.salonId,
      params: {
        salon: await salonName(alert.salonId),
        when: (language: Language) => formatDateTime(alert.endsAt, timeZone, language),
      },
      data: { salonId: alert.salonId, deepLink: DEEP_LINKS.subscription },
    });
  };

  const refundParams = async (refund: Entity<RefundRaw>): Promise<Params | null> => {
    if (refund.bookingId === undefined) return null;
    const booking = await bookings.findById(refund.bookingId);
    return {
      reference: booking?.referenceNumber ?? '',
      amount: formatJod(refund.amount),
    };
  };
  const refundInput = (
    refund: Entity<RefundRaw>,
    event: string,
    params: Params,
  ): Parameters<NotificationService['notify']>[1] => ({
    key: `${event}:${refund.id}`,
    params,
    customerId: refund.customerId,
    salonId: refund.salonId,
    data: {
      salonId: refund.salonId,
      ...(refund.bookingId === undefined
        ? {}
        : { bookingId: refund.bookingId, deepLink: DEEP_LINKS.booking(refund.bookingId) }),
    },
  });
  const refundHooks: Required<Pick<RefundHooks, 'started' | 'refunded' | 'failed'>> = {
    started: guarded('refund.pending', async (refund) => {
      const params = await refundParams(refund);
      if (params !== null)
        await notifications.notify('refund.pending', refundInput(refund, 'refund.pending', params));
    }),
    refunded: guarded('refund.refunded', async (refund) => {
      const params = await refundParams(refund);
      if (params !== null)
        await notifications.notify(
          'refund.refunded',
          refundInput(refund, 'refund.refunded', params),
        );
    }),
    failed: guarded('refund.failed', async (refund) => {
      const params = await refundParams(refund);
      if (params !== null)
        await notifications.notify('refund.failed', refundInput(refund, 'refund.failed', params));
    }),
  };

  const applicationNotifier: ApplicationNotifier = {
    reviewed: guarded('application.reviewed', async ({ salonId, decision, reason }) => {
      const event = decision === 'approved' ? 'application.approved' : 'application.rejected';
      await notifications.notify(event, {
        key: `${event}:${salonId}:${reason}`,
        salonId,
        params: { salon: await salonName(salonId), reason },
        data: { salonId, deepLink: DEEP_LINKS.salonSetup },
      });
    }),
  };

  const salonStateNotifier: SalonStateNotifier = {
    changed: guarded('salon.state', async ({ salonId, event, reason }) => {
      await notifications.notify(event, {
        key: `${event}:${salonId}:${reason ?? ''}`,
        salonId,
        params: { salon: await salonName(salonId), reason: reason ?? '' },
        data: { salonId, deepLink: DEEP_LINKS.salonSetup },
      });
    }),
  };

  const catalogRequestNotifier: CatalogRequestNotifier = {
    decided: guarded('catalog_request.decided', async ({ salonId, requestId, decision, note }) => {
      await notifications.notify('catalog_request.decided', {
        key: `catalog_request.decided:${requestId}`,
        salonId,
        params: {
          decision: (language: Language) =>
            translate(language, `notifications.decision.${decision}`),
          reason: note,
        },
        data: { salonId, deepLink: DEEP_LINKS.services },
      });
    }),
  };

  const payoutNotifier: PayoutNotifier = {
    transferred: guarded('payout.transferred', async (payout: Entity<PayoutRaw>) => {
      await notifications.notify('payout.transferred', {
        key: `payout.transferred:${payout.id}`,
        salonId: payout.salonId,
        params: { amount: formatJod(payout.net), reference: payout.transferReference ?? '' },
        data: { salonId: payout.salonId, deepLink: DEEP_LINKS.finance },
      });
    }),
  };

  return {
    bookingCreated,
    bookingJobEvent,
    subscriptionAlert,
    bookingChanged,
    refundHooks,
    applicationNotifier,
    salonStateNotifier,
    catalogRequestNotifier,
    payoutNotifier,
  };
};
