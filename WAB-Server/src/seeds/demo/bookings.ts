import type { Types } from 'mongoose';
import { AUTO_CANCEL_REASON, CUSTOMER_CANCEL_REASON_CODE } from '../../constants/bookings';
import {
  DEMO_APP_VERSION,
  DEMO_BOOKINGS_PER_SALON_DAY,
  DEMO_BRIDE_SHARE,
  DEMO_COMPANION_SHARE,
  DEMO_CUSTOMER_CANCEL_TEXT,
  DEMO_DAYS_AHEAD,
  DEMO_DAYS_BACK,
  DEMO_FAILED_PAYMENTS,
  DEMO_FUTURE_OUTCOMES,
  DEMO_GATEWAY_FEE_PERCENT,
  DEMO_MAX_COMPANIONS,
  DEMO_PAST_OUTCOMES,
  DEMO_PAYMENT_PROVIDER,
  DEMO_REJECTION_REASON_CODE,
  DEMO_REJECTION_REASON_TEXT,
  DEMO_REVIEW_COMMENTS,
  DEMO_REVIEW_RATINGS,
  DEMO_REVIEW_SHARE,
  DEMO_SALON_CANCEL_REASON_CODE,
  DEMO_SALON_CANCEL_REASON_TEXT,
  DEMO_SLOT_STEP_MINUTES,
  DEMO_STAFF_REVIEW_SHARE,
  DEMO_TWO_SERVICES_SHARE,
} from '../../constants/demoSeed';
import type { ActorType, BookingStatus, Language } from '../../constants/enums';
import { EVENT_BY_BOOKING_STATUS } from '../../constants/notifications';
import { PAYMENT_CURRENCY } from '../../constants/payments';
import type { LocalizedName } from '../../constants/referenceData';
import { FAKE_SEEDED_REFUND_PREFIX, FAKE_SEEDED_SESSION_PREFIX } from '../../constants/providers';
import type { PAYMENT_OPTIONS } from '../../constants/salon';
import { MINUTES_PER_HOUR, MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE } from '../../constants/time';
import { customerCancelRefund, fullRefund, noShowRefund } from '../../domain/bookings/refunds';
import { calculateAmounts } from '../../domain/pricing/pricing';
import { formatDateTime } from '../../utils/format/localized';
import { translate } from '../../utils/i18n';
import { percentOf } from '../../utils/money';
import { addDays, dayOfWeek, localDateOf, parseHHmm, zonedTimeToUtc } from '../../utils/time';
import type { DemoCustomer } from './customers';
import { demoId, demoReference, type DemoRandom } from './random';
import type { DemoSalon, DemoService, DemoStaff } from './salons';
import type { DemoContext, DemoDataset } from './types';

type PaymentOption = (typeof PAYMENT_OPTIONS)[number];
interface HistoryEntry {
  status: BookingStatus;
  actorType: ActorType;
  actorId?: Types.ObjectId;
  reason?: string;
  at: Date;
}
interface PlannedPerson {
  name: string;
  isMain: boolean;
  isBride: boolean;
  services: DemoService[];
  staff: DemoStaff;
  start: Date;
  end: Date;
}

/** Minutes after the action before the next step happens (approval, completion, no-show). */
const RESPONSE_MINUTES = { min: 5, max: 120 } as const;
const NO_SHOW_AFTER_START_MINUTES = 30;
const AUTO_CANCEL_AFTER_START_MINUTES = 60;
const BOOKED_AHEAD_HOURS = { min: 6, max: 96 } as const;
const CUSTOMER_CANCEL_BEFORE_HOURS = 24;
const REVIEW_AFTER_HOURS = 3;
const NOTIFICATION_READ_AFTER_HOURS = 2;
/** Each outcome below happens on the first few refunds only, so the admin sees every state. */
const FAILED_REFUNDS = 1;
const PENDING_REFUNDS = 1;
const PENDING_REVIEW_SHARE = 0.25;
const REJECTED_REVIEW_SHARE = 0.05;
const RATING_DECIMALS = 10;
const START_TRIES = 6;
const SETTLED_AFTER_END_MINUTES = 120;
const READ_SHARE = 0.7;
const PENDING_CANCEL_SHARE = 0.5;
const SPECIFIC_STAFF_SHARE = 0.5;

const at = (instant: Date, minutes: number): Date =>
  new Date(instant.getTime() + minutes * MS_PER_MINUTE);
const earliest = (...dates: Date[]): Date => new Date(Math.min(...dates.map((d) => d.getTime())));

export interface BookingsResult {
  readonly bookings: number;
}

/** Volume knobs: extra branches book at least one appointment a day and skip failed payments. */
export interface BookingsOptions {
  readonly perDay?: { readonly min: number; readonly max: number };
  readonly failedPayments?: number;
}

export const buildBookings = (
  ctx: DemoContext,
  random: DemoRandom,
  data: DemoDataset,
  salons: readonly DemoSalon[],
  customers: readonly DemoCustomer[],
  options: BookingsOptions = {},
): BookingsResult => {
  const perDay = options.perDay ?? { min: 0, max: DEMO_BOOKINGS_PER_SALON_DAY };
  const failedPayments = options.failedPayments ?? DEMO_FAILED_PAYMENTS;
  const busy = new Map<string, [number, number][]>();
  const isFree = (staff: DemoStaff, start: Date, end: Date): boolean =>
    (busy.get(staff.id.toString()) ?? []).every(
      ([s, e]) => end.getTime() <= s || start.getTime() >= e,
    );
  const reserve = (staff: DemoStaff, start: Date, end: Date): void => {
    const list = busy.get(staff.id.toString()) ?? [];
    list.push([start.getTime(), end.getTime()]);
    busy.set(staff.id.toString(), list);
  };
  const today = localDateOf(ctx.now, ctx.timeZone);
  const counters = { failedRefunds: 0, pendingRefunds: 0, bookings: 0 };
  const customerName = new Map(customers.map((c) => [c.id.toString(), c]));
  const staffStats = new Map<string, { sum: number; count: number; customers: number }>();
  const salonStats = new Map<string, { sum: number; count: number }>();

  const notify = (input: {
    recipientType: 'CUSTOMER' | 'MEMBER';
    recipientId: Types.ObjectId;
    language: Language;
    event: string;
    who: 'customer' | 'members';
    booking: {
      id: Types.ObjectId;
      reference: string;
      salonId: Types.ObjectId;
      /** The place as notifications name it (`DemoSalon.title`). */
      salonName: LocalizedName;
      customer: string;
      start: Date;
    };
    when: Date;
  }): void => {
    const params = (language: Language): Record<string, string> => ({
      reference: input.booking.reference,
      salon: input.booking.salonName[language],
      customer: input.booking.customer,
      when: formatDateTime(input.booking.start, ctx.timeZone, language),
    });
    const text = (part: 'title' | 'body'): { ar: string; en: string } => ({
      ar: translate('ar', `notifications.${input.event}.${input.who}.${part}`, params('ar')),
      en: translate('en', `notifications.${input.event}.${input.who}.${part}`, params('en')),
    });
    const readAt = at(input.when, NOTIFICATION_READ_AFTER_HOURS * MINUTES_PER_HOUR);
    data.Notification.push({
      _id: demoId(
        `notification:${input.event}:${input.booking.id.toString()}:${input.recipientId.toString()}`,
      ),
      recipientType: input.recipientType,
      recipientId: input.recipientId,
      type: 'BOOKING',
      event: input.event,
      title: text('title'),
      body: text('body'),
      data: { bookingId: input.booking.id.toString(), salonId: input.booking.salonId.toString() },
      ...(readAt < ctx.now && random.chance(READ_SHARE) ? { readAt } : {}),
      pushSent: false,
      dedupeKey: `${input.event}:${input.booking.id.toString()}`,
      createdAt: input.when,
    });
  };
  const track = (name: string, ts: Date, extra: Record<string, unknown>): void => {
    data.ServerEvent.push({
      _id: demoId(`event:${name}:${JSON.stringify(extra)}:${String(ts.getTime())}`),
      ts,
      name,
      actorType: 'SYSTEM',
      params: {},
      ...extra,
    });
  };

  for (const salon of salons.filter((s) => s.takesBookings)) {
    const lastDay = salon.spec.state === 'OFFLINE' ? -4 : DEMO_DAYS_AHEAD;
    const regular = salon.services.filter((s) => !s.brideOnly);
    const bridal = salon.services.filter((s) => s.brideOnly);
    const pool = customers.filter((c) => c.gender === salon.gender);
    for (let offset = -DEMO_DAYS_BACK; offset <= lastDay; offset += 1) {
      const date = addDays(today, offset);
      const day = salon.schedule.find((d) => d.day === dayOfWeek(date));
      if (day === undefined || day.isOff) continue;
      const openMin = parseHHmm(day.open);
      const closeMin = parseHHmm(day.close);
      const wanted = random.int(perDay.min, perDay.max);
      for (let n = 0; n < wanted; n += 1) {
        const customer = random.pick(pool);
        const bride =
          salon.gender === 'FEMALE' && bridal.length > 0 && random.chance(DEMO_BRIDE_SHARE);
        const companions = random.chance(DEMO_COMPANION_SHARE)
          ? random.int(1, DEMO_MAX_COMPANIONS)
          : 0;
        const wishes = Array.from({ length: companions + 1 }, (_, index) => {
          const isBride = bride && index === 0;
          const services = isBride
            ? [...bridal]
            : random.sample(regular, random.chance(DEMO_TWO_SERVICES_SHARE) ? 2 : 1);
          return { isBride, services, isMain: index === 0 };
        });
        const longest = Math.max(
          ...wishes.map((w) => w.services.reduce((m, s) => m + s.durationMinutes, 0)),
        );
        const lastStart = closeMin - longest;
        if (lastStart < openMin) continue;
        let planned: PlannedPerson[] | undefined;
        for (let tryIndex = 0; tryIndex < START_TRIES && planned === undefined; tryIndex += 1) {
          const steps = Math.floor((lastStart - openMin) / DEMO_SLOT_STEP_MINUTES);
          const startMin = openMin + random.int(0, steps) * DEMO_SLOT_STEP_MINUTES;
          const start = zonedTimeToUtc(date, startMin, ctx.timeZone);
          const taken = new Set<string>();
          const people: PlannedPerson[] = [];
          for (const [index, wish] of wishes.entries()) {
            const duration = wish.services.reduce((m, s) => m + s.durationMinutes, 0);
            const end = at(start, duration);
            const staff = salon.staff.find(
              (member) =>
                !taken.has(member.id.toString()) &&
                member.days.has(dayOfWeek(date)) &&
                (!wish.isBride || member.brideQualified) &&
                wish.services.every((s) => member.serviceIds.has(s.id.toString())) &&
                isFree(member, start, end),
            );
            if (staff === undefined) break;
            taken.add(staff.id.toString());
            const name =
              index === 0 ? customer.firstName : `${customer.firstName} +${String(index)}`;
            people.push({
              name,
              isMain: wish.isMain,
              isBride: wish.isBride,
              services: wish.services,
              staff,
              start,
              end,
            });
          }
          if (people.length === wishes.length) planned = people;
        }
        if (planned === undefined) continue;
        for (const person of planned) reserve(person.staff, person.start, person.end);
        counters.bookings += 1;
        writeBooking(salon, customer, planned);
      }
    }
  }

  function writeBooking(salon: DemoSalon, customer: DemoCustomer, persons: PlannedPerson[]): void {
    const label = `booking:${salon.spec.key}:${String(counters.bookings)}`;
    const id = demoId(label);
    const reference = demoReference(label);
    const appointmentStart = earliest(...persons.map((p) => p.start));
    const appointmentEnd = new Date(Math.max(...persons.map((p) => p.end.getTime())));
    const createdAt = earliest(
      new Date(
        appointmentStart.getTime() -
          random.int(BOOKED_AHEAD_HOURS.min, BOOKED_AHEAD_HOURS.max) * MS_PER_HOUR,
      ),
      new Date(
        ctx.now.getTime() - random.int(RESPONSE_MINUTES.min, RESPONSE_MINUTES.max) * MS_PER_MINUTE,
      ),
    );
    const paymentMethod: PaymentOption = random.pick(salon.policy.paymentOptions);
    const amounts = calculateAmounts({
      persons: persons.map((p) => ({ services: p.services })),
      paymentOption: paymentMethod,
      depositPercentage: salon.policy.depositPercentage,
    });
    const paidOnline = amounts.dueOnline;
    const responder = random.pick(salon.responders);
    // Past outcomes need every later step (completion, auto-cancel) to lie before the seed run.
    const past = at(appointmentEnd, SETTLED_AFTER_END_MINUTES) < ctx.now;
    const outcome: BookingStatus = past
      ? random.band(DEMO_PAST_OUTCOMES)
      : random.band(DEMO_FUTURE_OUTCOMES);
    const history: HistoryEntry[] = [
      { status: 'PENDING', actorType: 'CUSTOMER', actorId: customer.id, at: createdAt },
    ];
    const responseAt = earliest(
      at(createdAt, random.int(RESPONSE_MINUTES.min, RESPONSE_MINUTES.max)),
      ctx.now,
      appointmentStart,
    );
    const step = (
      status: BookingStatus,
      actorType: ActorType,
      when: Date,
      actorId?: Types.ObjectId,
      reason?: string,
    ): void => {
      history.push({
        status,
        actorType,
        ...(actorId === undefined ? {} : { actorId }),
        ...(reason === undefined ? {} : { reason }),
        at: when,
      });
    };
    let rejection: Record<string, unknown> | undefined;
    let cancellation: Record<string, unknown> | undefined;
    let completedAt: Date | undefined;
    let noShowAt: Date | undefined;
    let cancelledWhilePending = false;
    switch (outcome) {
      case 'APPROVED':
        step('APPROVED', 'MEMBER', responseAt, responder);
        break;
      case 'REJECTED':
        step('REJECTED', 'MEMBER', responseAt, responder, DEMO_REJECTION_REASON_TEXT);
        rejection = {
          by: 'MEMBER',
          actorId: responder,
          reasonCode: DEMO_REJECTION_REASON_CODE,
          reasonText: DEMO_REJECTION_REASON_TEXT,
          at: responseAt,
        };
        break;
      case 'CANCELLED_BY_CUSTOMER': {
        cancelledWhilePending = random.chance(PENDING_CANCEL_SHARE);
        if (!cancelledWhilePending) step('APPROVED', 'MEMBER', responseAt, responder);
        const before = new Date(
          appointmentStart.getTime() - CUSTOMER_CANCEL_BEFORE_HOURS * MS_PER_HOUR,
        );
        const when = earliest(
          new Date(Math.max(at(responseAt, 1).getTime(), before.getTime())),
          ctx.now,
        );
        step('CANCELLED_BY_CUSTOMER', 'CUSTOMER', when, customer.id, DEMO_CUSTOMER_CANCEL_TEXT);
        cancellation = {
          by: 'CUSTOMER',
          actorId: customer.id,
          reasonCode: CUSTOMER_CANCEL_REASON_CODE,
          reasonText: DEMO_CUSTOMER_CANCEL_TEXT,
          at: when,
        };
        break;
      }
      case 'CANCELLED_BY_SALON': {
        step('APPROVED', 'MEMBER', responseAt, responder);
        const when = earliest(at(responseAt, RESPONSE_MINUTES.max), appointmentStart, ctx.now);
        step('CANCELLED_BY_SALON', 'MEMBER', when, responder, DEMO_SALON_CANCEL_REASON_TEXT);
        cancellation = {
          by: 'MEMBER',
          actorId: responder,
          reasonCode: DEMO_SALON_CANCEL_REASON_CODE,
          reasonText: DEMO_SALON_CANCEL_REASON_TEXT,
          at: when,
        };
        break;
      }
      case 'AUTO_CANCELLED': {
        const when = at(appointmentStart, AUTO_CANCEL_AFTER_START_MINUTES);
        step('AUTO_CANCELLED', 'SYSTEM', when, undefined, AUTO_CANCEL_REASON);
        cancellation = { by: 'SYSTEM', reasonCode: AUTO_CANCEL_REASON, at: when };
        break;
      }
      case 'COMPLETED':
        step('APPROVED', 'MEMBER', responseAt, responder);
        completedAt = at(appointmentEnd, random.int(RESPONSE_MINUTES.min, RESPONSE_MINUTES.max));
        step('COMPLETED', 'MEMBER', completedAt, responder);
        break;
      case 'NO_SHOW':
        step('APPROVED', 'MEMBER', responseAt, responder);
        noShowAt = at(appointmentStart, NO_SHOW_AFTER_START_MINUTES);
        step('NO_SHOW', 'MEMBER', noShowAt, responder);
        break;
      default:
        break;
    }

    const facts = {
      paymentMethod,
      money: { total: amounts.total, paidOnline },
      policy: salon.policy,
    };
    const refundDue =
      outcome === 'REJECTED' || outcome === 'CANCELLED_BY_SALON' || outcome === 'AUTO_CANCELLED'
        ? fullRefund(facts)
        : outcome === 'CANCELLED_BY_CUSTOMER'
          ? cancelledWhilePending
            ? fullRefund(facts)
            : customerCancelRefund(facts)
          : outcome === 'NO_SHOW'
            ? noShowRefund(facts)
            : 0;
    const endedAt = history[history.length - 1]?.at ?? createdAt;
    let refundStatus: 'NONE' | 'REFUND_PENDING' | 'REFUNDED' | 'REFUND_FAILED' = 'NONE';
    if (refundDue > 0) {
      refundStatus =
        counters.failedRefunds < FAILED_REFUNDS
          ? 'REFUND_FAILED'
          : counters.pendingRefunds < PENDING_REFUNDS
            ? 'REFUND_PENDING'
            : 'REFUNDED';
      if (refundStatus === 'REFUND_FAILED') counters.failedRefunds += 1;
      if (refundStatus === 'REFUND_PENDING') counters.pendingRefunds += 1;
    }
    const refunded = refundStatus === 'REFUNDED' ? refundDue : 0;
    const paymentStatus =
      outcome === 'COMPLETED'
        ? 'PAID'
        : paymentMethod === 'DEPOSIT'
          ? 'DEPOSIT_PAID'
          : paymentMethod === 'FULL_ONLINE'
            ? 'FULLY_PAID'
            : 'PAY_ON_ARRIVAL';
    data.Booking.push({
      _id: id,
      referenceNumber: reference,
      customerId: customer.id,
      salonId: salon.id,
      ...(salon.branch === undefined
        ? {}
        : { branchId: salon.branch.id, branchSnapshot: salon.branch.snapshot }),
      salonGender: salon.gender,
      persons: persons.map((p, index) => ({
        name: p.name,
        isMain: p.isMain,
        isBride: p.isBride,
        services: p.services.map((s) => ({
          salonServiceId: s.id,
          catalogServiceId: s.catalogServiceId,
          name: s.name,
          price: s.price,
          durationMinutes: s.durationMinutes,
        })),
        staffId: p.staff.id,
        staffSelection: random.chance(SPECIFIC_STAFF_SHARE) ? 'SPECIFIC' : 'ANY',
        start: p.start,
        end: p.end,
        subtotal: amounts.persons[index]?.subtotal ?? 0,
      })),
      appointmentStart,
      appointmentEnd,
      hasBride: persons.some((p) => p.isBride),
      status: outcome,
      statusHistory: history,
      paymentMethod,
      money: {
        total: amounts.total,
        dueOnline: amounts.dueOnline,
        paidOnline,
        remaining: amounts.total - paidOnline,
        refunded,
      },
      paymentStatus,
      refundStatus,
      policySnapshot: salon.policy,
      respondBy: at(appointmentStart, AUTO_CANCEL_AFTER_START_MINUTES),
      ...(rejection === undefined ? {} : { rejection }),
      ...(cancellation === undefined ? {} : { cancellation }),
      ...(completedAt === undefined ? {} : { completedAt }),
      ...(noShowAt === undefined ? {} : { noShowAt }),
      ratingPromptSent: completedAt !== undefined,
      createdAt,
    });

    // Online money: the payment, its ledger lines and any refund.
    const salonRef = {
      salonId: salon.id,
      ...(salon.branch === undefined ? {} : { branchId: salon.branch.id }),
    };
    if (paidOnline > 0) {
      const transactionId = demoId(`transaction:${label}`);
      const gatewayFee = percentOf(paidOnline, DEMO_GATEWAY_FEE_PERCENT);
      data.Transaction.push({
        _id: transactionId,
        bookingId: id,
        customerId: customer.id,
        ...salonRef,
        type: paymentMethod === 'DEPOSIT' ? 'DEPOSIT' : 'FULL',
        amount: paidOnline,
        currency: PAYMENT_CURRENCY,
        idempotencyKey: `${label}:1`,
        attempt: 1,
        provider: DEMO_PAYMENT_PROVIDER,
        providerRef: `${FAKE_SEEDED_SESSION_PREFIX}${reference}`,
        status: 'SUCCEEDED',
        gatewayFee,
        chargedAt: createdAt,
        platform: 'ANDROID',
        appVersion: DEMO_APP_VERSION,
        createdAt,
      });
      data.LedgerEntry.push(
        {
          _id: demoId(`ledger:charge:${label}`),
          ...salonRef,
          type: 'CHARGE',
          amount: paidOnline,
          bookingId: id,
          transactionId,
          createdAt,
        },
        {
          _id: demoId(`ledger:fee:${label}`),
          ...salonRef,
          type: 'GATEWAY_FEE',
          amount: -gatewayFee,
          bookingId: id,
          transactionId,
          note: 'gateway fee',
          createdAt,
        },
      );
      track('payment.succeeded', createdAt, {
        bookingId: id,
        salonId: salon.id,
        params: { amount: paidOnline },
      });
      if (refundDue > 0) {
        const refundId = demoId(`refund:${label}`);
        const source =
          outcome === 'REJECTED'
            ? 'SALON_REJECT'
            : outcome === 'CANCELLED_BY_SALON'
              ? 'SALON_CANCEL'
              : outcome === 'AUTO_CANCELLED'
                ? 'AUTO_CANCEL'
                : outcome === 'NO_SHOW'
                  ? 'NO_SHOW_POLICY'
                  : 'CUSTOMER_CANCEL';
        const done = refundStatus === 'REFUNDED';
        const completedRefundAt = at(endedAt, RESPONSE_MINUTES.min);
        data.Refund.push({
          _id: refundId,
          bookingId: id,
          transactionId,
          ...salonRef,
          customerId: customer.id,
          amount: refundDue,
          source,
          status: refundStatus,
          idempotencyKey: `refund:${id.toString()}:${source}`,
          ...(done
            ? {
                providerRef: `${FAKE_SEEDED_REFUND_PREFIX}${reference}`,
                completedAt: completedRefundAt,
                ledgeredAt: completedRefundAt,
              }
            : {}),
          attempts: refundStatus === 'REFUND_PENDING' ? 0 : 1,
          gatewayRound: 1,
          ...(refundStatus === 'REFUND_FAILED' ? { lastError: 'Gateway timeout (demo)' } : {}),
          ...(refundStatus === 'REFUND_PENDING'
            ? { nextAttemptAt: at(ctx.now, RESPONSE_MINUTES.max) }
            : {}),
          createdAt: endedAt,
        });
        if (done) {
          data.LedgerEntry.push({
            _id: demoId(`ledger:refund:${label}`),
            ...salonRef,
            type: 'REFUND',
            amount: -refundDue,
            bookingId: id,
            refundId,
            createdAt: completedRefundAt,
          });
        }
        track('refund.created', endedAt, {
          bookingId: id,
          salonId: salon.id,
          params: { amount: refundDue },
        });
      }
    }

    // Notifications and server events, as the real hooks would have written them.
    const ctxBooking = {
      id,
      reference,
      salonId: salon.id,
      salonName: salon.title,
      customer: customerName.get(customer.id.toString())?.firstName ?? '',
      start: appointmentStart,
    };
    notify({
      recipientType: 'CUSTOMER',
      recipientId: customer.id,
      language: customer.language,
      event: 'booking.created',
      who: 'customer',
      booking: ctxBooking,
      when: createdAt,
    });
    for (const member of salon.responders) {
      notify({
        recipientType: 'MEMBER',
        recipientId: member,
        language: 'ar',
        event: 'booking.requested',
        who: 'members',
        booking: ctxBooking,
        when: createdAt,
      });
    }
    track('booking.created', createdAt, {
      actorType: 'CUSTOMER',
      actorId: customer.id,
      bookingId: id,
      salonId: salon.id,
      platform: 'ANDROID',
      appVersion: DEMO_APP_VERSION,
    });
    if (outcome !== 'PENDING') {
      const event = EVENT_BY_BOOKING_STATUS[outcome];
      notify({
        recipientType: 'CUSTOMER',
        recipientId: customer.id,
        language: customer.language,
        event,
        who: 'customer',
        booking: ctxBooking,
        when: endedAt,
      });
      const analytics = outcome.startsWith('CANCELLED')
        ? 'booking.cancelled'
        : `booking.${outcome.toLowerCase()}`;
      track(analytics, endedAt, { bookingId: id, salonId: salon.id });
    }

    if (outcome === 'COMPLETED') {
      for (const person of persons) {
        const stats = staffStats.get(person.staff.id.toString()) ?? {
          sum: 0,
          count: 0,
          customers: 0,
        };
        stats.customers += 1;
        staffStats.set(person.staff.id.toString(), stats);
      }
      if (completedAt !== undefined && customer.active && random.chance(DEMO_REVIEW_SHARE)) {
        writeReviews(salon, customer, id, persons[0]?.staff, completedAt, label);
      }
    }
  }

  function writeReviews(
    salon: DemoSalon,
    customer: DemoCustomer,
    bookingId: Types.ObjectId,
    staff: DemoStaff | undefined,
    completedAt: Date,
    label: string,
  ): void {
    const createdAt = earliest(at(completedAt, REVIEW_AFTER_HOURS * MINUTES_PER_HOUR), ctx.now);
    const status = random.chance(REJECTED_REVIEW_SHARE)
      ? 'REJECTED'
      : random.chance(PENDING_REVIEW_SHARE)
        ? 'PENDING'
        : 'APPROVED';
    const rating = random.pick(DEMO_REVIEW_RATINGS);
    const moderation =
      status === 'PENDING' ? {} : { moderation: { by: ctx.adminId, at: createdAt } };
    data.Review.push({
      _id: demoId(`review:salon:${label}`),
      target: 'SALON',
      salonId: salon.id,
      ...(salon.branch === undefined ? {} : { branchId: salon.branch.id }),
      customerId: customer.id,
      bookingId,
      rating,
      comment: random.pick(DEMO_REVIEW_COMMENTS),
      status,
      ...moderation,
      createdAt,
    });
    if (status === 'APPROVED') {
      const stats = salonStats.get(salon.id.toString()) ?? { sum: 0, count: 0 };
      stats.sum += rating;
      stats.count += 1;
      salonStats.set(salon.id.toString(), stats);
    }
    if (staff !== undefined && random.chance(DEMO_STAFF_REVIEW_SHARE)) {
      const staffRating = random.pick(DEMO_REVIEW_RATINGS);
      data.Review.push({
        _id: demoId(`review:staff:${label}`),
        target: 'STAFF',
        salonId: salon.id,
        ...(salon.branch === undefined ? {} : { branchId: salon.branch.id }),
        staffId: staff.id,
        customerId: customer.id,
        bookingId,
        rating: staffRating,
        status,
        ...moderation,
        createdAt,
      });
      if (status === 'APPROVED') {
        const stats = staffStats.get(staff.id.toString()) ?? { sum: 0, count: 0, customers: 0 };
        stats.sum += staffRating;
        stats.count += 1;
        staffStats.set(staff.id.toString(), stats);
      }
    }
  }

  // Failed payment attempts (no booking is created for them).
  const paying = salons.filter(
    (s) => s.takesBookings && s.policy.paymentOptions.some((o) => o !== 'PAY_ON_ARRIVAL'),
  );
  for (let n = 0; n < failedPayments && paying.length > 0; n += 1) {
    const salon = paying[n % paying.length];
    const customer = customers.find((c) => salon !== undefined && c.gender === salon.gender);
    if (salon === undefined || customer === undefined) continue;
    const when = new Date(ctx.now.getTime() - (n + 1) * MS_PER_DAY);
    data.Transaction.push({
      _id: demoId(`transaction:failed:${String(n)}`),
      customerId: customer.id,
      salonId: salon.id,
      type: 'DEPOSIT',
      amount: salon.services[0]?.price ?? 0,
      currency: PAYMENT_CURRENCY,
      idempotencyKey: `demo-failed-${String(n)}:1`,
      attempt: 1,
      provider: DEMO_PAYMENT_PROVIDER,
      status: n % 2 === 0 ? 'FAILED' : 'CANCELLED',
      gatewayCode: n % 2 === 0 ? 'DECLINED' : 'USER_CANCELLED',
      gatewayMessage:
        n % 2 === 0 ? 'Card declined (demo)' : 'Customer closed the payment page (demo)',
      platform: 'IOS',
      appVersion: DEMO_APP_VERSION,
      createdAt: when,
    });
    track(n % 2 === 0 ? 'payment.failed' : 'payment.cancelled', when, { salonId: salon.id });
  }

  // Public ratings follow the approved reviews; staff counters follow completed bookings.
  const oneDecimal = (value: number): number =>
    Math.round(value * RATING_DECIMALS) / RATING_DECIMALS;
  for (const salon of data.Salon) {
    const stats = salonStats.get(salon._id.toString());
    if (stats !== undefined)
      salon['rating'] = { avg: oneDecimal(stats.sum / stats.count), count: stats.count };
  }
  for (const member of data.Member) {
    const stats = staffStats.get(member._id.toString());
    const staff = member['staff'] as Record<string, unknown> | undefined;
    if (stats === undefined || staff === undefined) continue;
    staff['rating'] = {
      avg: stats.count === 0 ? 0 : oneDecimal(stats.sum / stats.count),
      count: stats.count,
    };
    staff['customersCount'] = stats.customers;
  }
  return { bookings: counters.bookings };
};
