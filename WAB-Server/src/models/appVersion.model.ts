import { Schema, model } from 'mongoose';
import {
  APP_VERSIONS_COLLECTION,
  APP_VERSION_PATTERN,
  CLIENT_PLATFORMS,
  STORE_URL_MAX_LENGTH,
  STORE_URL_PATTERN,
  type ClientPlatform,
} from '../constants/appConfig';
import { APP_KINDS, type AppKind } from '../constants/enums';
import { compareVersions } from '../utils/version';

/** Version policy of one app on one platform (BUSINESS_DOMAIN.md §3.6). */
export interface AppVersionRaw {
  app: AppKind;
  platform: ClientPlatform;
  latest: string;
  /** Builds older than this must update. */
  minSupported: string;
  /** Whether builds between `minSupported` and `latest` are offered the update. */
  optionalUpdate: boolean;
  storeUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

const appVersionSchema = new Schema<AppVersionRaw>(
  {
    app: { type: String, enum: APP_KINDS, required: true },
    platform: { type: String, enum: CLIENT_PLATFORMS, required: true },
    latest: { type: String, required: true, match: APP_VERSION_PATTERN },
    minSupported: {
      type: String,
      required: true,
      match: APP_VERSION_PATTERN,
      validate: {
        // The oldest allowed build cannot be newer than the newest one.
        validator(this: unknown, value: string): boolean {
          const { latest } = this as Partial<AppVersionRaw>;
          return latest === undefined || compareVersions(value, latest) <= 0;
        },
        message: 'minSupported must not be newer than latest',
      },
    },
    optionalUpdate: { type: Boolean, default: true },
    storeUrl: {
      type: String,
      required: true,
      maxlength: STORE_URL_MAX_LENGTH,
      match: STORE_URL_PATTERN,
    },
  },
  { timestamps: true, collection: APP_VERSIONS_COLLECTION },
);
appVersionSchema.index({ app: 1, platform: 1 }, { unique: true });

export const AppVersionModel = model<AppVersionRaw>('AppVersion', appVersionSchema);
