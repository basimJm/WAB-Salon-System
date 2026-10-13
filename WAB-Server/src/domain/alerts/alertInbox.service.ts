import { createHash } from 'node:crypto';
import {
  ALERT_DIGEST_AFTER_MIN,
  ALERT_DIGEST_KEY_LENGTH,
  ALERT_DIGEST_MAX_ITEMS,
  ALERT_EMAIL_BATCH_LIMIT,
  type AlertKind,
  type AlertStatus,
} from '../../constants/alerts';
import { ERROR_CODES } from '../../constants/errorCodes';
import { DEFAULT_LANGUAGE } from '../../constants/i18n';
import { MS_PER_MINUTE } from '../../constants/time';
import type { AlertRaw } from '../../models/alert.model';
import type { Notifier } from '../../providers/notifier';
import type { AdminsRepository } from '../../repositories/identity.repository';
import type { AlertsRepository } from '../../repositories/alerts.repository';
import type { Entity } from '../../utils/database/plain';
import { NotFoundError } from '../../utils/errors';
import { translate } from '../../utils/i18n';
import type { Logger } from '../../utils/logger';
import type { PaginationParams } from '../../utils/pagination';

export interface AlertInbox {
  list(input: {
    params: PaginationParams;
    status?: AlertStatus | undefined;
    kind?: AlertKind | undefined;
  }): Promise<{ items: Entity<AlertRaw>[]; total: number }>;
  /** Alerts nobody has acknowledged yet (the bell badge). */
  newCount(): Promise<number>;
  /** NEW → ACKNOWLEDGED; acknowledging again is a 404-free no-op for a known alert. */
  acknowledge(id: string, now: Date): Promise<Entity<AlertRaw>>;
  /** The `alerts:email` run: mails what is due; resolves to the number of alerts mailed. */
  deliverEmails(now: Date): Promise<number>;
}

export const createAlertInbox = (deps: {
  alerts: AlertsRepository;
  admins: Pick<AdminsRepository, 'findMany'>;
  notifier: Notifier;
  logger: Logger;
}): AlertInbox => {
  const { alerts, admins, notifier, logger } = deps;

  const recipients = async (): Promise<string[]> => {
    const all = await admins.findMany({});
    return [...new Set(all.flatMap((a) => (a.alertEmails.length > 0 ? a.alertEmails : [a.email])))];
  };

  const sendOne = async (to: string[], alert: Entity<AlertRaw>): Promise<void> => {
    const title = translate(DEFAULT_LANGUAGE, `alerts.${alert.kind}.title`);
    await notifier.sendEmail({
      to,
      subject: translate(DEFAULT_LANGUAGE, 'emails.alert.subject', { title }),
      text: translate(DEFAULT_LANGUAGE, 'emails.alert.body', {
        title,
        severity: alert.severity,
        time: alert.createdAt.toISOString(),
      }),
      idempotencyKey: `alert:${alert.id}`,
    });
  };

  const sendDigest = async (to: string[], items: Entity<AlertRaw>[]): Promise<void> => {
    const lines = items
      .map(
        (a) =>
          `- ${translate(DEFAULT_LANGUAGE, `alerts.${a.kind}.title`)} (${a.createdAt.toISOString()})`,
      )
      .join('\n');
    await notifier.sendEmail({
      to,
      subject: translate(DEFAULT_LANGUAGE, 'emails.alertDigest.subject', {
        count: String(items.length),
      }),
      text: translate(DEFAULT_LANGUAGE, 'emails.alertDigest.body', {
        count: String(items.length),
        lines,
      }),
      idempotencyKey: `alert-digest:${createHash('sha256')
        .update(items.map((a) => a.id).join(','))
        .digest('hex')
        .slice(0, ALERT_DIGEST_KEY_LENGTH)}`,
    });
  };

  return {
    async list({ params, status, kind }) {
      const filter: Record<string, unknown> = {};
      if (status !== undefined) filter.status = status;
      if (kind !== undefined) filter.kind = kind;
      const page = await alerts.findPage(filter, params, { createdAt: -1 });
      return { items: page.items, total: page.meta.total };
    },

    newCount: () => alerts.count({ status: 'NEW' }),

    async acknowledge(id, now) {
      const done = await alerts.acknowledge(id, now);
      if (done !== null) return done;
      const existing = await alerts.findById(id);
      if (existing === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      return existing;
    },

    async deliverEmails(now) {
      const pending = await alerts.unemailed(ALERT_EMAIL_BATCH_LIMIT);
      if (pending.length === 0) return 0;
      const to = await recipients();
      if (to.length === 0) {
        logger.warn('alerts are due for email but no admin address exists');
        return 0;
      }
      let mailed = 0;
      const urgent = pending.filter((a) => a.severity !== 'INFO');
      for (const alert of urgent) {
        try {
          await sendOne(to, alert);
          await alerts.markEmailed([alert.id], now);
          mailed += 1;
        } catch (error) {
          logger.warn({ err: error, alertId: alert.id }, 'alert email failed, will retry');
        }
      }
      const quiet = pending.filter((a) => a.severity === 'INFO');
      const oldest = quiet.reduce<Entity<AlertRaw> | undefined>(
        (min, a) => (min === undefined || a.createdAt < min.createdAt ? a : min),
        undefined,
      );
      if (
        oldest !== undefined &&
        now.getTime() - oldest.createdAt.getTime() >= ALERT_DIGEST_AFTER_MIN * MS_PER_MINUTE
      ) {
        const batch = quiet.slice(0, ALERT_DIGEST_MAX_ITEMS);
        try {
          await sendDigest(to, batch);
          await alerts.markEmailed(
            batch.map((a) => a.id),
            now,
          );
          mailed += batch.length;
        } catch (error) {
          logger.warn({ err: error }, 'alert digest email failed, will retry');
        }
      }
      return mailed;
    },
  };
};
