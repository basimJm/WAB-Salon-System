import {
  BOOKING_JOB_NAMES,
  JOB_RECONCILE_PAGE_SIZE,
  REMINDER_EVENT_BY_MINUTES,
} from '../constants/bookings';
import { ERROR_CODES } from '../constants/errorCodes';
import { MS_PER_MINUTE } from '../constants/time';
import type { BookingActionsService } from '../domain/bookings/bookingActions.service';
import type { BookingCreatedHook } from '../domain/bookings/bookingCreation.service';
import type { BookingChangedHook } from '../domain/bookings/bookingActions.service';
import type { NotificationProducers } from '../domain/notifications/producers';
import type { SettingsService } from '../domain/settings';
import type { BookingRaw } from '../models/booking.model';
import type { BookingsRepository } from '../repositories/bookings.repository';
import type { Entity } from '../utils/database/plain';
import { BaseError } from '../utils/errors';
import type { Logger } from '../utils/logger';
import { jobId, type DelayedJob, type JobHandler, type JobScheduler } from './jobs';

export interface BookingJobsDeps {
  readonly scheduler: Pick<JobScheduler, 'schedule' | 'remove'>;
  readonly bookings: Pick<BookingsRepository, 'findById' | 'jobCandidates'>;
  readonly actions: Pick<BookingActionsService, 'autoCancel'>;
  readonly notify: NotificationProducers['bookingJobEvent'];
  readonly settings: Pick<SettingsService, 'get'>;
  readonly logger: Logger;
  readonly now?: () => Date;
}

export interface BookingJobs {
  /** Makes the queued jobs match the booking's status: removes the ones that no longer apply. */
  sync(booking: Entity<BookingRaw>): Promise<void>;
  /** Rebuilds the jobs of every active booking (start-up, or after Redis lost its data). */
  reconcile(): Promise<number>;
  /** The processors, keyed by job name, for `JobScheduler.work`. */
  readonly handlers: Readonly<Record<string, JobHandler>>;
  /** Plugs into the booking created / changed hooks. Best effort: a failure is logged, never thrown. */
  readonly hook: BookingCreatedHook & Required<Pick<BookingChangedHook, 'changed'>>;
}

const reminderId = (bookingId: string, minutes: number): string =>
  jobId('booking', 'reminder', bookingId, minutes);
const pendingAlertId = (bookingId: string): string => jobId('booking', 'pending-alert', bookingId);
const autoCancelId = (bookingId: string): string => jobId('booking', 'auto-cancel', bookingId);

const KNOWN_REMINDER_MINUTES = Object.keys(REMINDER_EVENT_BY_MINUTES).map(Number);
const reminderEventOf = (minutes: number): string | undefined =>
  (REMINDER_EVENT_BY_MINUTES as Record<number, string | undefined>)[minutes];

export const createBookingJobs = (deps: BookingJobsDeps): BookingJobs => {
  const { scheduler, bookings, actions, notify, settings, logger } = deps;
  const now = deps.now ?? ((): Date => new Date());

  const wantedJobs = async (booking: Entity<BookingRaw>): Promise<DelayedJob[]> => {
    const at = now().getTime();
    const data = { bookingId: booking.id };
    const jobs: DelayedJob[] = [];
    if (booking.status === 'PENDING') {
      const alertBefore = await settings.get('booking.pendingAlertBeforeMinutes');
      const alertAt = booking.appointmentStart.getTime() - alertBefore * MS_PER_MINUTE;
      // A late alert is pointless: skip it instead of firing it at once.
      if (alertAt > at) {
        jobs.push({
          id: pendingAlertId(booking.id),
          name: BOOKING_JOB_NAMES.pendingAlert,
          data,
          runAt: new Date(alertAt),
        });
      }
      // The answer deadline is mandatory: overdue bookings are cancelled at once.
      jobs.push({
        id: autoCancelId(booking.id),
        name: BOOKING_JOB_NAMES.autoCancel,
        data,
        runAt: booking.respondBy,
      });
    }
    if (booking.status === 'APPROVED') {
      for (const minutes of await settings.get('booking.reminderMinutes')) {
        if (reminderEventOf(minutes) === undefined) {
          logger.warn({ minutes }, 'no reminder message exists for this reminderMinutes value');
          continue;
        }
        const reminderAt = booking.appointmentStart.getTime() - minutes * MS_PER_MINUTE;
        if (reminderAt > at) {
          jobs.push({
            id: reminderId(booking.id, minutes),
            name: BOOKING_JOB_NAMES.reminder,
            data: { ...data, minutes },
            runAt: new Date(reminderAt),
          });
        }
      }
    }
    return jobs;
  };

  const sync = async (booking: Entity<BookingRaw>): Promise<void> => {
    const wanted = await wantedJobs(booking);
    const wantedIds = new Set(wanted.map((job) => job.id));
    const configured = await settings.get('booking.reminderMinutes');
    const everyId = [
      pendingAlertId(booking.id),
      autoCancelId(booking.id),
      ...new Set([...KNOWN_REMINDER_MINUTES, ...configured]).values(),
    ].map((value) => (typeof value === 'number' ? reminderId(booking.id, value) : value));
    await Promise.all(everyId.filter((id) => !wantedIds.has(id)).map((id) => scheduler.remove(id)));
    await Promise.all(wanted.map((job) => scheduler.schedule(job)));
  };

  const safeSync = async (booking: Entity<BookingRaw>): Promise<void> => {
    try {
      await sync(booking);
    } catch (error) {
      // The booking itself is already saved; the periodic reconcile rebuilds the jobs.
      logger.error({ err: error, bookingId: booking.id }, 'booking jobs could not be scheduled');
    }
  };

  const bookingOf = async (
    data: Readonly<Record<string, unknown>>,
  ): Promise<Entity<BookingRaw> | null> =>
    typeof data['bookingId'] === 'string' ? bookings.findById(data['bookingId']) : null;

  const handlers: Record<string, JobHandler> = {
    [BOOKING_JOB_NAMES.reminder]: async (job) => {
      const booking = await bookingOf(job.data);
      const minutes = Number(job.data['minutes']);
      const event = reminderEventOf(minutes);
      if (booking?.status !== 'APPROVED' || event === undefined) return;
      if (booking.appointmentStart.getTime() <= now().getTime()) return;
      await notify(event as 'booking.reminder_1h' | 'booking.reminder_15m', booking);
    },
    [BOOKING_JOB_NAMES.pendingAlert]: async (job) => {
      const booking = await bookingOf(job.data);
      if (booking?.status !== 'PENDING') return;
      if (booking.appointmentStart.getTime() <= now().getTime()) return;
      await notify('booking.pending_30m', booking);
    },
    [BOOKING_JOB_NAMES.autoCancel]: async (job) => {
      const booking = await bookingOf(job.data);
      if (booking?.status !== 'PENDING') return;
      // Too early (clock skew): fail so the queue retries after its backoff.
      if (now().getTime() < booking.respondBy.getTime()) throw new Error('auto-cancel ran early');
      try {
        await actions.autoCancel(booking.id);
      } catch (error) {
        // Someone answered in the same moment: the booking is already settled.
        if (
          error instanceof BaseError &&
          (error.code === ERROR_CODES.ALREADY_HANDLED ||
            error.code === ERROR_CODES.INVALID_TRANSITION)
        ) {
          return;
        }
        throw error;
      }
    },
  };

  return {
    sync,
    handlers,
    async reconcile() {
      let count = 0;
      for (let page = 1; ; page += 1) {
        const result = await bookings.jobCandidates(now(), {
          page,
          pageSize: JOB_RECONCILE_PAGE_SIZE,
        });
        for (const booking of result.items) {
          await sync(booking);
          count += 1;
        }
        if (page * JOB_RECONCILE_PAGE_SIZE >= result.meta.total) return count;
      }
    },
    hook: {
      created: safeSync,
      changed: (booking) => safeSync(booking),
    },
  };
};
