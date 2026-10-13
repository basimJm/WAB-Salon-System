import type { AppKind } from './enums';

/** Promotional push campaigns (SRV-099, BUSINESS_DOMAIN.md §3.6 `pushCampaigns`, Admin PRD A25). */
export const CAMPAIGNS_COLLECTION = 'pushCampaigns';
export const CAMPAIGN_STATUSES = ['SCHEDULED', 'SENDING', 'SENT', 'CANCELLED'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const CAMPAIGN_AUDIENCE_KINDS = [
  'ALL',
  'GUESTS',
  'REGISTERED',
  'GENDER',
  'CITY',
  'SALON_MEMBERS',
  'SPECIFIC_USERS',
] as const;
export type CampaignAudienceKind = (typeof CAMPAIGN_AUDIENCE_KINDS)[number];

/** Which audiences make sense for which app (guests and customer filters do not exist in the merchant app). */
export const CAMPAIGN_KINDS_BY_APP: Readonly<Record<AppKind, readonly CampaignAudienceKind[]>> = {
  CUSTOMER: ['ALL', 'GUESTS', 'REGISTERED', 'GENDER', 'CITY', 'SPECIFIC_USERS'],
  MERCHANT: ['ALL', 'SALON_MEMBERS'],
};

export const CAMPAIGN_MAX_CITIES = 50;
export const CAMPAIGN_MAX_SPECIFIC_USERS = 500;
export const CAMPAIGN_LINK_MAX_LENGTH = 500;
/** An in-app path (`/salons/<id>`) or an https URL. */
export const CAMPAIGN_LINK_PATTERN = /^(\/[A-Za-z0-9/_-]*|https:\/\/\S+)$/;
/** A campaign can be scheduled at most this far ahead. */
export const CAMPAIGN_MAX_SCHEDULE_DAYS = 365;

/** Recipients handled per database page; also the most tokens one FCM call accepts. */
export const CAMPAIGN_BATCH_SIZE = 200;

/** The notification event stored for the in-app list of a campaign recipient. */
export const CAMPAIGN_EVENT = 'campaign.promotion';
export const CAMPAIGN_DEDUPE_PREFIX = 'campaign';
export const CAMPAIGN_JOB_NAME = 'campaign.send';

export const ADMIN_CAMPAIGN_ROUTES = {
  base: '/campaigns',
  byId: '/:id',
  cancel: '/:id/cancel',
  audience: '/audience-size',
} as const;
export const CAMPAIGN_AUDIT = {
  create: 'PUSH_CAMPAIGN_CREATE',
  cancel: 'PUSH_CAMPAIGN_CANCEL',
  entityType: 'pushCampaign',
} as const;
