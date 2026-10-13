import { PERIODIC_JOBS } from '../constants/jobs';
import type { AccountLifecycleService } from '../domain/auth/accountLifecycle.service';
import type { LedgerService } from '../domain/ledger/ledger.service';
import type { NotificationProducers } from '../domain/notifications/producers';
import type { PaymentsService } from '../domain/payments/payments.service';
import type { RefundService } from '../domain/refunds/refunds.service';
import type { SettingsService } from '../domain/settings';
import type { SubscriptionsService } from '../domain/subscriptions/subscriptions.service';
import type { RefundRaw } from '../models/refund.model';
import type { Entity } from '../utils/database/plain';
import type { Logger } from '../utils/logger';
import type { JobHandler, JobScheduler } from './jobs';

export interface PeriodicJobsDeps {
  readonly scheduler: Pick<JobScheduler, 'repeat'>;
  readonly settings: Pick<SettingsService, 'get'>;
  readonly subscriptions: Pick<SubscriptionsService, 'expireDue' | 'endingSoon'>;
  readonly accounts: Pick<AccountLifecycleService, 'purgeDueCustomers'>;
  readonly refunds: Pick<RefundService, 'runDue' | 'delayed'>;
  readonly payments: Pick<PaymentsService, 'reconcilePending' | 'refundOrphans'>;
  readonly ledger: Pick<LedgerService, 'reconcile'>;
  readonly bookingJobs: { reconcile(): Promise<number> };
  readonly notifySubscription: NotificationProducers['subscriptionAlert'];
  /** Refunds stuck longer than `refund.delayAlertHours` (the admin alert engine plugs in here). */
  /** The `alerts:evaluate` run (SRV-106): resolves to the number of new alerts. */
  readonly evaluateAlerts?: (now: Date) => Promise<number>;
  /** The `alerts:email` run (SRV-107): resolves to the number of alerts mailed. */
  readonly emailAlerts?: (now: Date) => Promise<number>;
  readonly onDelayedRefunds?: (refunds: Entity<RefundRaw>[]) => Promise<void>;
  readonly logger: Logger;
}

export interface PeriodicJobs {
  /** The processors, keyed by job name, for `JobScheduler.work`. */
  readonly handlers: Readonly<Record<string, JobHandler>>;
  /** Registers every cron schedule in the business time zone (replaces earlier ones by id). */
  register(): Promise<void>;
}

export const createPeriodicJobs = (deps: PeriodicJobsDeps): PeriodicJobs => {
  const { scheduler, settings, subscriptions, accounts, refunds, payments, ledger, logger } = deps;

  const report = (job: string, outcome: Record<string, number>): void => {
    logger.info({ job, ...outcome }, 'periodic job finished');
  };

  // The status change is already stored (a retry would find nothing to alert), so one failed
  // notification must not drop the others: it is logged and the run goes on.
  const tell = async (
    event: Parameters<PeriodicJobsDeps['notifySubscription']>[0],
    alert: Parameters<PeriodicJobsDeps['notifySubscription']>[1],
  ): Promise<void> => {
    try {
      await deps.notifySubscription(event, alert);
    } catch (error) {
      logger.error({ err: error, event, salonId: alert.salonId }, 'subscription alert failed');
    }
  };

  const handlers: Record<string, JobHandler> = {
    [PERIODIC_JOBS.subscriptionsCheck.name]: async () => {
      // Expire first, then warn: a subscription that just ended is not told "ending soon".
      const expired = await subscriptions.expireDue();
      for (const alert of expired) await tell('subscription.expired', alert);
      const warned = await subscriptions.endingSoon();
      for (const alert of warned) await tell('subscription.ending_7d', alert);
      report(PERIODIC_JOBS.subscriptionsCheck.name, {
        expired: expired.length,
        warned: warned.length,
      });
    },
    [PERIODIC_JOBS.accountsPurge.name]: async () => {
      report(PERIODIC_JOBS.accountsPurge.name, { purged: await accounts.purgeDueCustomers() });
    },
    [PERIODIC_JOBS.refundsRetry.name]: async () => {
      report(PERIODIC_JOBS.refundsRetry.name, { attempted: await refunds.runDue() });
    },
    [PERIODIC_JOBS.refundsDelayed.name]: async () => {
      const delayed = await refunds.delayed();
      if (delayed.length === 0) return;
      logger.error(
        { refundIds: delayed.map((r) => r.id) },
        'refunds are delayed beyond the alert limit',
      );
      await deps.onDelayedRefunds?.(delayed);
    },
    [PERIODIC_JOBS.alertsEvaluate.name]: async () => {
      if (deps.evaluateAlerts === undefined) return;
      report(PERIODIC_JOBS.alertsEvaluate.name, { raised: await deps.evaluateAlerts(new Date()) });
    },
    [PERIODIC_JOBS.alertsEmail.name]: async () => {
      if (deps.emailAlerts === undefined) return;
      report(PERIODIC_JOBS.alertsEmail.name, { mailed: await deps.emailAlerts(new Date()) });
    },
    [PERIODIC_JOBS.paymentsReconcile.name]: async () => {
      const settled = await payments.reconcilePending();
      const refunded = await payments.refundOrphans();
      report(PERIODIC_JOBS.paymentsReconcile.name, { settled, refunded });
    },
    [PERIODIC_JOBS.ledgerReconcile.name]: async () => {
      report(PERIODIC_JOBS.ledgerReconcile.name, { repaired: await ledger.reconcile() });
    },
    [PERIODIC_JOBS.bookingJobsReconcile.name]: async () => {
      report(PERIODIC_JOBS.bookingJobsReconcile.name, {
        rebuilt: await deps.bookingJobs.reconcile(),
      });
    },
  };

  return {
    handlers,
    async register() {
      const timeZone = await settings.get('timezone');
      for (const job of Object.values(PERIODIC_JOBS)) {
        await scheduler.repeat({ id: job.name, name: job.name, cron: job.cron, timeZone });
      }
    },
  };
};
