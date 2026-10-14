import {
  CAMPAIGN_AUDIT,
  CAMPAIGN_BATCH_SIZE,
  CAMPAIGN_DEDUPE_PREFIX,
  CAMPAIGN_EVENT,
  CAMPAIGN_JOB_NAME,
  CAMPAIGN_KINDS_BY_APP,
  CAMPAIGN_MAX_SCHEDULE_DAYS,
  type CampaignAudienceKind,
  type CampaignStatus,
} from '../../constants/campaigns';
import type { AppKind, Gender } from '../../constants/enums';
import { ERROR_CODES, errorMessageKey } from '../../constants/errorCodes';
import { MS_PER_DAY } from '../../constants/time';
import { jobId, type JobScheduler } from '../../jobs/jobs';
import type { CampaignStats, PushCampaignRaw } from '../../models/pushCampaign.model';
import type { NotificationText } from '../../models/notification.model';
import type { Notifier } from '../../providers';
import type { CampaignsRepository } from '../../repositories/campaigns.repository';
import type {
  CustomersRepository,
  InstallationsRepository,
  MembersRepository,
} from '../../repositories/identity.repository';
import type { NotificationsRepository } from '../../repositories/notifications.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import { toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import { BusinessRuleError, NotFoundError, ValidationError } from '../../utils/errors';
import type { Logger } from '../../utils/logger';
import type { PaginationParams } from '../../utils/pagination';
import type { AuditWriter } from '../audit/audit.service';
import type { AdminActor } from '../auth/accountLifecycle.service';
import type { NotificationService } from '../notifications/notifications.service';

/** Who a campaign is for. Ids are strings at this boundary. */
export interface AudienceInput {
  readonly kind: CampaignAudienceKind;
  readonly gender?: Gender | undefined;
  readonly cityIds?: readonly string[] | undefined;
  readonly salonId?: string | undefined;
  readonly customerIds?: readonly string[] | undefined;
}

export interface CampaignView {
  readonly id: string;
  readonly title: NotificationText;
  readonly body: NotificationText;
  readonly app: AppKind;
  readonly audience: AudienceInput;
  readonly link: string | null;
  readonly status: CampaignStatus;
  readonly scheduledAt: Date;
  readonly sentAt: Date | null;
  readonly cancelledAt: Date | null;
  readonly stats: CampaignStats;
  readonly createdBy: string;
}

export interface CampaignsService {
  create(input: {
    data: {
      title: NotificationText;
      body: NotificationText;
      app: AppKind;
      audience: AudienceInput;
      link?: string | undefined;
      scheduledAt?: Date | undefined;
    };
    reason: string;
    actor: AdminActor;
  }): Promise<CampaignView>;
  list(input: {
    params: PaginationParams;
    status?: CampaignStatus | undefined;
    app?: AppKind | undefined;
  }): Promise<{ items: CampaignView[]; total: number }>;
  get(id: string): Promise<CampaignView>;
  /** Cancels a campaign that has not started sending. */
  cancel(input: { id: string; reason: string; actor: AdminActor }): Promise<CampaignView>;
  /** How many accounts and devices an audience reaches (the "audience size" shown before sending). */
  audienceSize(input: { app: AppKind; audience: AudienceInput }): Promise<number>;
  /** Job: sends (or resumes) one campaign. Safe to run twice. */
  send(id: string): Promise<void>;
  /** Start-up: queues the job of every campaign that has not finished. */
  reconcile(): Promise<number>;
}

export interface CampaignsDeps {
  readonly campaigns: CampaignsRepository;
  readonly customers: Pick<CustomersRepository, 'findPage' | 'count'>;
  readonly members: Pick<MembersRepository, 'findPage' | 'count'>;
  readonly installations: Pick<
    InstallationsRepository,
    'devicesOfMany' | 'findPage' | 'count' | 'dropTokens'
  >;
  readonly salons: Pick<SalonsRepository, 'findById'>;
  readonly notifications: Pick<NotificationService, 'deliverCampaign'>;
  readonly notificationsRepository: Pick<NotificationsRepository, 'countOccurrence'>;
  readonly notifier: Pick<Notifier, 'sendPush'>;
  readonly scheduler: Pick<JobScheduler, 'schedule' | 'remove'>;
  readonly audit: AuditWriter;
  readonly logger: Logger;
  readonly now?: () => Date;
}

const dedupeKey = (campaignId: string): string => `${CAMPAIGN_DEDUPE_PREFIX}:${campaignId}`;
const sendJobId = (campaignId: string): string => jobId('campaign', 'send', campaignId);

export const createCampaignsService = (deps: CampaignsDeps): CampaignsService => {
  const {
    campaigns,
    customers,
    members,
    installations,
    salons,
    notifications,
    notificationsRepository,
    notifier,
    scheduler,
    audit,
    logger,
  } = deps;
  const now = deps.now ?? ((): Date => new Date());

  const audienceOf = (
    audience: PushCampaignRaw['audience'] | Entity<PushCampaignRaw>['audience'],
  ): AudienceInput => ({
    kind: audience.kind,
    ...(audience.gender === undefined ? {} : { gender: audience.gender }),
    ...(audience.cityIds === undefined ? {} : { cityIds: audience.cityIds.map(String) }),
    ...(audience.salonId === undefined ? {} : { salonId: String(audience.salonId) }),
    ...(audience.customerIds === undefined
      ? {}
      : { customerIds: audience.customerIds.map(String) }),
  });

  const view = async (campaign: Entity<PushCampaignRaw>): Promise<CampaignView> => {
    // Opens are the read copies in customers' lists; guests cannot be tracked.
    const { read } = await notificationsRepository.countOccurrence(
      CAMPAIGN_EVENT,
      dedupeKey(campaign.id),
    );
    return {
      id: campaign.id,
      title: campaign.title,
      body: campaign.body,
      app: campaign.app,
      audience: audienceOf(campaign.audience),
      link: campaign.link ?? null,
      status: campaign.status,
      scheduledAt: campaign.scheduledAt,
      sentAt: campaign.sentAt ?? null,
      cancelledAt: campaign.cancelledAt ?? null,
      stats: { ...campaign.stats, opened: read },
      createdBy: campaign.createdBy,
    };
  };

  /** The customer accounts an audience targets (ACTIVE accounts only). */
  const customerFilter = (audience: AudienceInput): Record<string, unknown> | null => {
    switch (audience.kind) {
      case 'ALL':
      case 'REGISTERED':
        return { status: 'ACTIVE' };
      case 'GENDER':
        return { status: 'ACTIVE', gender: audience.gender };
      case 'CITY':
        return { status: 'ACTIVE', cityId: { $in: (audience.cityIds ?? []).map(toObjectId) } };
      case 'SPECIFIC_USERS':
        return {
          status: 'ACTIVE',
          _id: { $in: (audience.customerIds ?? []).map(toObjectId) },
        };
      default:
        return null;
    }
  };
  const includesGuests = (audience: AudienceInput): boolean =>
    audience.kind === 'ALL' || audience.kind === 'GUESTS';
  const GUEST_FILTER = {
    app: 'CUSTOMER',
    fcmToken: { $exists: true },
    customerId: { $exists: false },
  } as const;
  const memberFilter = (audience: AudienceInput): Record<string, unknown> | null => {
    if (audience.kind === 'ALL') return { active: true };
    if (audience.kind === 'SALON_MEMBERS') {
      return { active: true, salonId: toObjectId(audience.salonId ?? '') };
    }
    return null;
  };

  const assertAudience = async (app: AppKind, audience: AudienceInput): Promise<void> => {
    if (!CAMPAIGN_KINDS_BY_APP[app].includes(audience.kind)) {
      throw new ValidationError({
        details: [
          {
            field: 'audience.kind',
            code: ERROR_CODES.VALIDATION_ERROR,
            messageKey: errorMessageKey(ERROR_CODES.VALIDATION_ERROR),
          },
        ],
      });
    }
    if (
      audience.kind === 'SALON_MEMBERS' &&
      (await salons.findById(audience.salonId ?? '')) === null
    ) {
      throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
    }
  };

  const audienceSize: CampaignsService['audienceSize'] = async ({ app, audience }) => {
    await assertAudience(app, audience);
    if (app === 'MERCHANT') return members.count(memberFilter(audience) ?? {});
    const accountFilter = customerFilter(audience);
    const [accounts, guests] = await Promise.all([
      accountFilter === null ? Promise.resolve(0) : customers.count(accountFilter),
      includesGuests(audience) ? installations.count(GUEST_FILTER) : Promise.resolve(0),
    ]);
    return accounts + guests;
  };

  const record = (
    actor: AdminActor,
    action: string,
    campaignId: string,
    reason: string,
    before: unknown,
    after: unknown,
  ): Promise<unknown> =>
    audit.record({
      adminId: actor.adminId,
      action,
      entityType: CAMPAIGN_AUDIT.entityType,
      entityId: campaignId,
      ...(before === undefined ? {} : { before }),
      after,
      reason,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

  const queue = (campaign: Pick<Entity<PushCampaignRaw>, 'id' | 'scheduledAt'>): Promise<boolean> =>
    scheduler.schedule({
      id: sendJobId(campaign.id),
      name: CAMPAIGN_JOB_NAME,
      data: { campaignId: campaign.id },
      runAt: campaign.scheduledAt,
    });

  return {
    audienceSize,

    async create({ data, reason, actor }) {
      await assertAudience(data.app, data.audience);
      const at = now();
      const scheduledAt = data.scheduledAt ?? at;
      if (scheduledAt.getTime() > at.getTime() + CAMPAIGN_MAX_SCHEDULE_DAYS * MS_PER_DAY) {
        throw new ValidationError({
          details: [
            {
              field: 'scheduledAt',
              code: ERROR_CODES.VALIDATION_ERROR,
              messageKey: errorMessageKey(ERROR_CODES.VALIDATION_ERROR),
            },
          ],
        });
      }
      const { audience } = data;
      const created = await campaigns.create({
        title: data.title,
        body: data.body,
        app: data.app,
        audience: {
          kind: audience.kind,
          ...(audience.gender === undefined ? {} : { gender: audience.gender }),
          ...(audience.cityIds === undefined ? {} : { cityIds: audience.cityIds.map(toObjectId) }),
          ...(audience.salonId === undefined ? {} : { salonId: toObjectId(audience.salonId) }),
          ...(audience.customerIds === undefined
            ? {}
            : { customerIds: audience.customerIds.map(toObjectId) }),
        },
        ...(data.link === undefined ? {} : { link: data.link }),
        scheduledAt,
        status: 'SCHEDULED',
        stats: { targeted: 0, sent: 0, delivered: 0, opened: 0, failed: 0 },
        createdBy: toObjectId(actor.adminId),
      });
      try {
        await queue(created);
      } catch (error) {
        // Without a queued job the campaign would never go out: undo it instead of leaving a ghost.
        await campaigns.cancel(created.id, at);
        throw error;
      }
      const result = await view(created);
      await record(actor, CAMPAIGN_AUDIT.create, created.id, reason, undefined, {
        app: result.app,
        audience: result.audience,
        scheduledAt: result.scheduledAt,
      });
      return result;
    },

    async list({ params, status, app }) {
      const page = await campaigns.findPage(
        { ...(status === undefined ? {} : { status }), ...(app === undefined ? {} : { app }) },
        params,
        { createdAt: -1 },
      );
      return { items: await Promise.all(page.items.map(view)), total: page.meta.total };
    },

    async get(id) {
      const found = await campaigns.findById(id);
      if (found === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      return view(found);
    },

    async cancel({ id, reason, actor }) {
      const existing = await campaigns.findById(id);
      if (existing === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      const cancelled = await campaigns.cancel(id, now());
      // Already sending, sent or cancelled: too late (or nothing to do).
      if (cancelled === null) throw new BusinessRuleError({ code: ERROR_CODES.ALREADY_HANDLED });
      await scheduler.remove(sendJobId(id)).catch((error: unknown) => {
        logger.warn({ err: error, campaignId: id }, 'campaign job could not be removed');
      });
      await record(
        actor,
        CAMPAIGN_AUDIT.cancel,
        id,
        reason,
        { status: existing.status },
        {
          status: 'CANCELLED',
        },
      );
      return view(cancelled);
    },

    async send(id) {
      const campaign = await campaigns.claim(id);
      if (campaign === null) return;
      const stats = { targeted: 0, sent: 0, failed: 0 };
      const audience = audienceOf(campaign.audience);
      const key = dedupeKey(campaign.id);
      const data = campaign.link === undefined ? {} : { deepLink: campaign.link };

      const accountPages = async (
        kind: 'customer' | 'member',
        filter: Record<string, unknown>,
      ): Promise<void> => {
        const repo = kind === 'customer' ? customers : members;
        for (let page = 1; ; page += 1) {
          const batch = await repo.findPage(
            filter,
            { page, pageSize: CAMPAIGN_BATCH_SIZE },
            {
              _id: 1,
            },
          );
          const devices = await installations.devicesOfMany(
            kind,
            batch.items.map((a) => a.id),
          );
          for (const account of batch.items) {
            const mine = devices.get(account.id) ?? [];
            const pushAllowed =
              kind === 'member' || (account as { pushEnabled?: boolean }).pushEnabled === true;
            try {
              const result = await notifications.deliverCampaign({
                key,
                account: {
                  type: kind === 'customer' ? 'CUSTOMER' : 'MEMBER',
                  id: account.id,
                  language:
                    mine[0]?.language ?? (account as { language?: 'ar' | 'en' }).language ?? 'ar',
                  pushAllowed,
                  devices: mine,
                },
                title: campaign.title,
                body: campaign.body,
                data,
              });
              stats.targeted += 1;
              if (result.sent) stats.sent += 1;
              else if (result.stored && pushAllowed && mine.length > 0) stats.failed += 1;
            } catch (error) {
              stats.targeted += 1;
              stats.failed += 1;
              logger.error({ err: error, campaignId: campaign.id }, 'campaign delivery failed');
            }
          }
          if (page * CAMPAIGN_BATCH_SIZE >= batch.meta.total) return;
        }
      };

      const guestPages = async (): Promise<void> => {
        for (let page = 1; ; page += 1) {
          const batch = await installations.findPage(
            GUEST_FILTER,
            { page, pageSize: CAMPAIGN_BATCH_SIZE },
            { _id: 1 },
          );
          const byLanguage = new Map<'ar' | 'en', string[]>();
          for (const device of batch.items) {
            if (device.fcmToken === undefined) continue;
            byLanguage.set(device.language, [
              ...(byLanguage.get(device.language) ?? []),
              device.fcmToken,
            ]);
          }
          for (const [language, tokens] of byLanguage) {
            stats.targeted += tokens.length;
            try {
              const result = await notifier.sendPush({
                target: { tokens },
                message: {
                  app: 'CUSTOMER',
                  kind: 'VISIBLE',
                  title: campaign.title[language],
                  body: campaign.body[language],
                  data: { event: CAMPAIGN_EVENT, campaignId: campaign.id, ...data },
                },
                idempotencyKey: `${key}:guests:${String(page)}:${language}`,
              });
              stats.sent += result.sent;
              stats.failed += tokens.length - result.sent;
              if (result.invalidTokens.length > 0) {
                await installations.dropTokens(result.invalidTokens);
              }
            } catch (error) {
              stats.failed += tokens.length;
              logger.error({ err: error, campaignId: campaign.id }, 'campaign guest push failed');
            }
          }
          if (page * CAMPAIGN_BATCH_SIZE >= batch.meta.total) return;
        }
      };

      if (campaign.app === 'MERCHANT') {
        await accountPages('member', memberFilter(audience) ?? { active: true });
      } else {
        const filter = customerFilter(audience);
        if (filter !== null) await accountPages('customer', filter);
        if (includesGuests(audience)) await guestPages();
      }
      await campaigns.finish(campaign.id, { ...stats, delivered: stats.sent, opened: 0 }, now());
      logger.info({ campaignId: campaign.id, ...stats }, 'campaign sent');
    },

    async reconcile() {
      const open = await campaigns.pending(['SCHEDULED', 'SENDING']);
      for (const campaign of open) await queue(campaign);
      return open.length;
    },
  };
};
