import {
  ALERT_BATCH_LIMIT,
  ALERT_NEW_ENTITY_LOOKBACK_MIN,
  type AlertEntityType,
  type AlertKind,
  type AlertSeverity,
} from '../../constants/alerts';
import { MS_PER_MINUTE } from '../../constants/time';
import type { RefundRaw } from '../../models/refund.model';
import type { AlertRaw } from '../../models/alert.model';
import type { AlertsRepository } from '../../repositories/alerts.repository';
import type { CatalogRequestsRepository } from '../../repositories/catalogRequests.repository';
import type { RefundsRepository } from '../../repositories/refunds.repository';
import type { ReviewsRepository } from '../../repositories/reviews.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import type { TransactionsRepository } from '../../repositories/transactions.repository';
import { toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import type { Logger } from '../../utils/logger';
import type { SettingsService } from '../settings';
import type { SubscriptionAlert } from '../subscriptions/subscriptions.service';
import { titlesOf } from './alertText';

export interface RaiseInput {
  readonly kind: AlertKind;
  readonly severity: AlertSeverity;
  /** One alert per occurrence: raising the same key again does nothing. */
  readonly dedupeKey: string;
  readonly entityType?: AlertEntityType;
  readonly entityId?: string;
  readonly data?: Record<string, unknown>;
}

export interface AlertsService {
  /** Stores a NEW alert unless the occurrence was already raised; resolves to whether it is new. */
  raise(input: RaiseInput): Promise<boolean>;
  refundsDelayed(refunds: readonly Entity<RefundRaw>[]): Promise<void>;
  subscription(
    event: 'subscription.ending_7d' | 'subscription.expired',
    alert: SubscriptionAlert,
  ): Promise<void>;
  /** The `alerts:evaluate` run: every threshold check; resolves to the number of new alerts. */
  evaluate(now: Date): Promise<number>;
}

export interface AlertsDeps {
  readonly alerts: AlertsRepository;
  readonly transactions: TransactionsRepository;
  readonly refunds: RefundsRepository;
  readonly salons: SalonsRepository;
  readonly reviews: ReviewsRepository;
  readonly catalogRequests: CatalogRequestsRepository;
  readonly settings: Pick<SettingsService, 'get'>;
  /** Told about every new alert (live admin feed); failures are logged, never thrown. */
  readonly onRaised?: (alert: Entity<AlertRaw>) => Promise<void> | void;
  readonly logger: Logger;
}

export const createAlertsService = (deps: AlertsDeps): AlertsService => {
  const { alerts, transactions, refunds, salons, reviews, catalogRequests, settings, logger } =
    deps;

  const raise = async (input: RaiseInput): Promise<boolean> => {
    const created = await alerts.createOnce({
      kind: input.kind,
      severity: input.severity,
      // Both languages: the admin reads alerts in Arabic or English (SRV-150).
      title: titlesOf(input.kind),
      ...(input.entityType === undefined ? {} : { entityType: input.entityType }),
      ...(input.entityId === undefined ? {} : { entityId: toObjectId(input.entityId) }),
      data: input.data ?? {},
      status: 'NEW',
      dedupeKey: input.dedupeKey,
    });
    if (created === null) return false;
    try {
      await deps.onRaised?.(created);
    } catch (error) {
      logger.warn({ err: error, alertId: created.id }, 'alert feed notification failed');
    }
    return true;
  };

  const paymentSpikes = async (now: Date): Promise<number> => {
    const rule = await settings.get('alerts.paymentFailures');
    const nowMs = now.getTime();
    const since = (min: number): { $gte: Date } => ({
      $gte: new Date(nowMs - min * MS_PER_MINUTE),
    });
    const bucket = (min: number): number => Math.floor(nowMs / (min * MS_PER_MINUTE));
    let raised = 0;

    const failedRecently = await transactions.count({
      status: 'FAILED',
      createdAt: since(rule.windowMin),
    });
    if (failedRecently >= rule.count) {
      const created = await raise({
        kind: 'PAYMENT_FAILURE_SPIKE',
        severity: 'CRITICAL',
        dedupeKey: `payment-spike:count:${String(bucket(rule.windowMin))}`,
        data: { failed: failedRecently, windowMin: rule.windowMin, limit: rule.count },
      });
      if (created) raised += 1;
    }

    const [failed, succeeded] = await Promise.all([
      transactions.count({ status: 'FAILED', createdAt: since(rule.rateWindowMin) }),
      transactions.count({ status: 'SUCCEEDED', createdAt: since(rule.rateWindowMin) }),
    ]);
    const attempts = failed + succeeded;
    // A rate over a handful of attempts is noise: it needs as many attempts as the count rule.
    if (attempts >= rule.count && (failed * 100) / attempts >= rule.ratePct) {
      const created = await raise({
        kind: 'PAYMENT_FAILURE_SPIKE',
        severity: 'CRITICAL',
        dedupeKey: `payment-spike:rate:${String(bucket(rule.rateWindowMin))}`,
        data: { failed, attempts, ratePct: rule.ratePct, windowMin: rule.rateWindowMin },
      });
      if (created) raised += 1;
    }
    return raised;
  };

  const failedRefunds = async (): Promise<number> => {
    const page = await refunds.findPage(
      { status: 'REFUND_FAILED' },
      { page: 1, pageSize: ALERT_BATCH_LIMIT },
      { updatedAt: -1 },
    );
    let raised = 0;
    for (const refund of page.items) {
      const created = await raise({
        kind: 'REFUND_FAILED',
        severity: 'CRITICAL',
        dedupeKey: `refund-failed:${refund.id}`,
        entityType: 'REFUND',
        entityId: refund.id,
        data: { amount: refund.amount, transactionId: refund.transactionId },
      });
      if (created) raised += 1;
    }
    return raised;
  };

  /** Announces what was submitted lately and still waits (the admin also sees the queues). */
  const newSubmissions = async (now: Date): Promise<number> => {
    const cutoff = new Date(now.getTime() - ALERT_NEW_ENTITY_LOOKBACK_MIN * MS_PER_MINUTE);
    const paging = { page: 1, pageSize: ALERT_BATCH_LIMIT };
    const [applications, pendingReviews, requests] = await Promise.all([
      salons.findPage(
        { state: 'APPLICATION_PENDING', 'application.submittedAt': { $gte: cutoff } },
        paging,
      ),
      reviews.findPage({ status: 'PENDING', createdAt: { $gte: cutoff } }, paging),
      catalogRequests.findPage({ status: 'PENDING', createdAt: { $gte: cutoff } }, paging),
    ]);
    let raised = 0;
    for (const salon of applications.items) {
      // A resubmission is a new occurrence of the same salon.
      const created = await raise({
        kind: 'SALON_APPLICATION',
        severity: 'INFO',
        dedupeKey: `application:${salon.id}:${String(salon.application.submittedAt.getTime())}`,
        entityType: 'SALON',
        entityId: salon.id,
      });
      if (created) raised += 1;
    }
    for (const review of pendingReviews.items) {
      const created = await raise({
        kind: 'REVIEW_PENDING',
        severity: 'INFO',
        dedupeKey: `review:${review.id}`,
        entityType: 'REVIEW',
        entityId: review.id,
      });
      if (created) raised += 1;
    }
    for (const request of requests.items) {
      const created = await raise({
        kind: 'CATALOG_REQUEST',
        severity: 'INFO',
        dedupeKey: `catalog-request:${request.id}`,
        entityType: 'CATALOG_REQUEST',
        entityId: request.id,
      });
      if (created) raised += 1;
    }
    return raised;
  };

  return {
    raise,

    async refundsDelayed(delayed) {
      for (const refund of delayed) {
        await raise({
          kind: 'REFUND_DELAYED',
          severity: 'WARNING',
          dedupeKey: `refund-delayed:${refund.id}`,
          entityType: 'REFUND',
          entityId: refund.id,
          data: { amount: refund.amount, transactionId: refund.transactionId },
        });
      }
    },

    async subscription(event, alert) {
      const expired = event === 'subscription.expired';
      await raise({
        kind: expired ? 'SUBSCRIPTION_EXPIRED' : 'SUBSCRIPTION_ENDING',
        severity: expired ? 'WARNING' : 'INFO',
        dedupeKey: `${event}:${alert.subscriptionId}:${String(alert.endsAt.getTime())}`,
        entityType: 'SALON',
        entityId: alert.salonId,
        data: { endsAt: alert.endsAt.toISOString(), status: alert.status },
      });
    },

    async evaluate(now) {
      // One failing check must not hide the others.
      const checks = [paymentSpikes(now), failedRefunds(), newSubmissions(now)];
      const results = await Promise.allSettled(checks);
      let raised = 0;
      for (const result of results) {
        if (result.status === 'fulfilled') raised += result.value;
        else logger.error({ err: result.reason }, 'alert check failed');
      }
      return raised;
    },
  };
};
