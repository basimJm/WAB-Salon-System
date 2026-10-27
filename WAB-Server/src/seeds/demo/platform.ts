import {
  DEMO_APP_VERSION,
  DEMO_AUDIT_IP,
  DEMO_AUDIT_USER_AGENT,
  DEMO_BANNER_WINDOW_DAYS,
  DEMO_BANNERS,
  DEMO_CAMPAIGNS,
  DEMO_CONTACT,
  DEMO_CONTENT,
  DEMO_FAQS,
  DEMO_FILE_PREFIX,
  DEMO_IMAGE_EXTENSION,
  DEMO_MAINTENANCE_MESSAGE,
  DEMO_STORE_URLS,
} from '../../constants/demoSeed';
import { DEMO_IMAGE_PREFIX } from '../../constants/demoCatalog';
import { APP_KINDS, LANGUAGES } from '../../constants/enums';
import { CONTENT_KINDS } from '../../constants/content';
import { CLIENT_PLATFORMS } from '../../constants/appConfig';
import { MS_PER_DAY } from '../../constants/time';
import type { AlertEntityType, AlertKind } from '../../constants/alerts';
import { titlesOf } from '../../domain/alerts/alertText';
import { addDays, localDateOf } from '../../utils/time';
import { demoId } from './random';
import { addUpload } from './salons';
import type { DemoContext, DemoDataset } from './types';

const CONTENT_AGE_DAYS = 60;
const CAMPAIGN_TARGETED = 18;
const CAMPAIGN_FAILED = 2;
const CAMPAIGN_OPENED = 7;

const daysFrom = (now: Date, days: number): Date => new Date(now.getTime() + days * MS_PER_DAY);

/** Platform-wide rows: home banners, app content, versions, campaigns, alerts, audit and exports. */
export const buildPlatform = (ctx: DemoContext, data: DemoDataset): void => {
  const since = daysFrom(ctx.now, -CONTENT_AGE_DAYS);
  const admin = { ownerType: 'ADMIN' as const, ownerId: ctx.adminId };

  DEMO_BANNERS.forEach((banner, index) => {
    const imageKey = Object.fromEntries(
      LANGUAGES.map((language) => [
        language,
        `${DEMO_FILE_PREFIX}/banners/${banner.key}-${language}.${DEMO_IMAGE_EXTENSION}`,
      ]),
    ) as Record<(typeof LANGUAGES)[number], string>;
    for (const key of Object.values(imageKey))
      addUpload(data, { key, purpose: 'BANNER_IMAGE', ...admin, at: since });
    data.Banner.push({
      _id: demoId(`banner:${banner.key}`),
      imageKey,
      action: banner.action,
      ...(banner.salon === undefined
        ? {}
        : { actionValue: demoId(`salon:${banner.salon}`).toString() }),
      ...(banner.url === undefined ? {} : { actionValue: banner.url }),
      gender: banner.gender,
      startAt: daysFrom(ctx.now, -DEMO_BANNER_WINDOW_DAYS),
      endAt: daysFrom(ctx.now, DEMO_BANNER_WINDOW_DAYS),
      order: index + 1,
      active: true,
      createdAt: since,
    });
  });

  // Only the demo catalog's own pictures: an admin-made service already has its real upload record,
  // and its key as the last upload would hide the "base written" marker (SRV-173: every run then
  // re-inserted the day-dependent rows).
  for (const entry of ctx.catalog) {
    if (entry.imageKey !== undefined && entry.imageKey.startsWith(DEMO_IMAGE_PREFIX))
      addUpload(data, { key: entry.imageKey, purpose: 'CATALOG_IMAGE', ...admin, at: since });
  }

  for (const app of APP_KINDS) {
    for (const kind of CONTENT_KINDS) {
      data.ContentPage.push({
        _id: demoId(`content:${app}:${kind}`),
        app,
        kind,
        body: DEMO_CONTENT[kind],
        createdAt: since,
      });
    }
    DEMO_FAQS[app].forEach((faq, index) => {
      data.Faq.push({
        _id: demoId(`faq:${app}:${String(index)}`),
        app,
        question: faq.question,
        answer: faq.answer,
        order: index + 1,
        createdAt: since,
      });
    });
    data.ContactInfo.push({
      _id: demoId(`contact:${app}`),
      app,
      ...DEMO_CONTACT[app],
      createdAt: since,
    });
    data.Maintenance.push({
      _id: demoId(`maintenance:${app}`),
      app,
      enabled: false,
      message: DEMO_MAINTENANCE_MESSAGE,
      createdAt: since,
    });
    for (const platform of CLIENT_PLATFORMS) {
      data.AppVersion.push({
        _id: demoId(`appVersion:${app}:${platform}`),
        app,
        platform,
        latest: DEMO_APP_VERSION,
        minSupported: DEMO_APP_VERSION,
        optionalUpdate: false,
        storeUrl: DEMO_STORE_URLS[platform],
        createdAt: since,
      });
    }
  }

  for (const campaign of DEMO_CAMPAIGNS) {
    const scheduledAt = daysFrom(ctx.now, campaign.dayOffset);
    const sent = campaign.dayOffset < 0;
    data.PushCampaign.push({
      _id: demoId(`campaign:${campaign.key}`),
      title: campaign.title,
      body: campaign.body,
      app: 'CUSTOMER',
      audience:
        campaign.gender === undefined
          ? { kind: 'ALL' }
          : { kind: 'GENDER', gender: campaign.gender },
      scheduledAt,
      ...(sent ? { sentAt: scheduledAt } : {}),
      status: sent ? 'SENT' : 'SCHEDULED',
      stats: sent
        ? {
            targeted: CAMPAIGN_TARGETED,
            sent: CAMPAIGN_TARGETED - CAMPAIGN_FAILED,
            delivered: CAMPAIGN_TARGETED - CAMPAIGN_FAILED,
            opened: CAMPAIGN_OPENED,
            failed: CAMPAIGN_FAILED,
          }
        : { targeted: 0, sent: 0, delivered: 0, opened: 0, failed: 0 },
      createdBy: ctx.adminId,
      createdAt: daysFrom(scheduledAt, -1),
    });
  }

  // Alerts the admin would have been shown, one per kind that the demo data explains.
  const failedRefund = data.Refund.find((refund) => refund['status'] === 'REFUND_FAILED');
  const pendingSalon = data.Salon.find((salon) => salon['state'] === 'APPLICATION_PENDING');
  const expired = data.Subscription.find((subscription) => subscription['status'] === 'EXPIRED');
  interface DemoAlert {
    kind: AlertKind;
    severity: string;
    entityType: AlertEntityType;
    entityId: unknown;
    status: string;
  }
  const alerts: DemoAlert[] = [];
  if (failedRefund !== undefined) {
    alerts.push({
      kind: 'REFUND_FAILED',
      severity: 'CRITICAL',
      entityType: 'REFUND',
      entityId: failedRefund._id,
      status: 'NEW',
    });
  }
  if (pendingSalon !== undefined) {
    alerts.push({
      kind: 'SALON_APPLICATION',
      severity: 'INFO',
      entityType: 'SALON',
      entityId: pendingSalon._id,
      status: 'NEW',
    });
  }
  if (expired !== undefined) {
    alerts.push({
      kind: 'SUBSCRIPTION_EXPIRED',
      severity: 'WARNING',
      entityType: 'SALON',
      entityId: expired['salonId'],
      status: 'ACKNOWLEDGED',
    });
  }
  for (const alert of alerts) {
    const id = demoId(`alert:${alert.kind}`);
    data.Alert.push({
      _id: id,
      kind: alert.kind,
      severity: alert.severity,
      title: titlesOf(alert.kind),
      entityType: alert.entityType,
      entityId: alert.entityId,
      data: {},
      status: alert.status,
      ...(alert.status === 'ACKNOWLEDGED' ? { acknowledgedAt: ctx.now } : {}),
      dedupeKey: `demo:${alert.kind}`,
      createdAt: daysFrom(ctx.now, -1),
    });
  }

  // Audit trail of the admin decisions the demo data implies.
  for (const salon of data.Salon) {
    const application = salon['application'] as { reviewedAt?: Date; rejectionReason?: string };
    if (application.reviewedAt === undefined) continue;
    const rejected = application.rejectionReason !== undefined;
    data.AuditLog.push({
      _id: demoId(`audit:application:${salon._id.toString()}`),
      adminId: ctx.adminId,
      action: rejected ? 'SALON_APPLICATION_REJECT' : 'SALON_APPLICATION_APPROVE',
      entityType: 'salon',
      entityId: salon._id.toString(),
      after: { state: rejected ? 'APPLICATION_REJECTED' : 'APPROVED_INCOMPLETE' },
      reason: rejected ? (application.rejectionReason ?? '') : 'Documents verified',
      ip: DEMO_AUDIT_IP,
      userAgent: DEMO_AUDIT_USER_AGENT,
      createdAt: application.reviewedAt,
    });
  }

  const yesterday = addDays(localDateOf(ctx.now, ctx.timeZone), -1);
  data.Export.push(
    {
      _id: demoId('export:daily'),
      kind: 'REPORT_DAILY',
      format: 'XLSX',
      params: { date: yesterday },
      status: 'QUEUED',
      requestedBy: ctx.adminId,
      createdAt: ctx.now,
    },
    {
      _id: demoId('export:audit'),
      kind: 'AUDIT_LOGS',
      format: 'CSV',
      params: {},
      status: 'FAILED',
      failure: 'TOO_MANY_ROWS',
      requestedBy: ctx.adminId,
      finishedAt: daysFrom(ctx.now, -2),
      createdAt: daysFrom(ctx.now, -2),
    },
  );
};
