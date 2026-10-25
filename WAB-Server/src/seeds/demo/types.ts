import type { Types } from 'mongoose';
import type { Gender } from '../../constants/enums';
import type { LocalizedName } from '../../constants/referenceData';

/** What the demo data set is built from: read from the database, never invented. */
export interface DemoContext {
  readonly now: Date;
  readonly timeZone: string;
  /** The platform admin (created by `seed:admin`); demo admin actions are recorded as theirs. */
  readonly adminId: Types.ObjectId;
  readonly countryCode: string;
  readonly dialCode: string;
  /** Amman and its areas, by English name, from the reference seed. */
  readonly cityId: Types.ObjectId;
  readonly areaIds: ReadonlyMap<string, Types.ObjectId>;
  readonly catalog: readonly DemoCatalogEntry[];
}

export interface DemoCatalogEntry {
  readonly id: Types.ObjectId;
  readonly gender: Gender;
  readonly name: LocalizedName;
  readonly imageKey?: string;
}

/** Collections the demo seed writes, named as in `ALL_MODELS` (model name without `Model`). */
export const DEMO_COLLECTIONS = [
  'Salon',
  'Branch',
  'Member',
  'SalonService',
  'GalleryItem',
  'SalonClosure',
  'StaffLeave',
  'Subscription',
  'RecommendedPlacement',
  'CatalogRequest',
  'Customer',
  'Installation',
  'Favorite',
  'Booking',
  'Transaction',
  'Refund',
  'LedgerEntry',
  'Payout',
  'Review',
  'Notification',
  'ServerEvent',
  'Banner',
  'ContentPage',
  'Faq',
  'ContactInfo',
  'AppVersion',
  'Maintenance',
  'PushCampaign',
  'Alert',
  'AuditLog',
  'Export',
  'Upload',
] as const;
export type DemoCollection = (typeof DEMO_COLLECTIONS)[number];

/** A document ready to insert: plain values, `_id` always set (deterministic, see `demoId`). */
export type DemoDoc = Record<string, unknown> & { readonly _id: Types.ObjectId };
export type DemoDataset = Record<DemoCollection, DemoDoc[]>;

export const emptyDataset = (): DemoDataset =>
  Object.fromEntries(DEMO_COLLECTIONS.map((name) => [name, []])) as unknown as DemoDataset;
