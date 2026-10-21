import type { Types } from 'mongoose';
import {
  DEMO_APP_VERSION,
  DEMO_CUSTOMER_PHONE_PREFIX,
  DEMO_CUSTOMERS_PER_GENDER,
  DEMO_EMAIL_DOMAIN,
  DEMO_FILE_PREFIX,
  DEMO_FIRST_NAMES,
  DEMO_IMAGE_EXTENSION,
  DEMO_LAST_NAMES,
  DEMO_PHONE_INDEX_DIGITS,
} from '../../constants/demoSeed';
import { GENDERS, type Gender, type Language } from '../../constants/enums';
import { MS_PER_DAY } from '../../constants/time';
import { demoId, type DemoRandom } from './random';
import { addUpload, type DemoSalon } from './salons';
import type { DemoContext, DemoDataset } from './types';

export interface DemoCustomer {
  readonly id: Types.ObjectId;
  readonly gender: Gender;
  readonly firstName: string;
  readonly language: Language;
  readonly active: boolean;
  readonly createdAt: Date;
}

/** Registrations are spread over this many days before the seed run. */
const REGISTRATION_SPREAD_DAYS = 90;
/** Days a deletion request waits before the account is purged (BUSINESS_DOMAIN: 30-day grace). */
const DELETION_GRACE_DAYS = 30;
const DEVICE_MODELS = {
  ANDROID: ['Pixel 8', 'Galaxy S24', 'Redmi Note 13'],
  IOS: ['iPhone 15', 'iPhone 14 Pro', 'iPhone 13'],
} as const;
const OS_VERSIONS = { ANDROID: '15', IOS: '18.1' } as const;
const FAVORITES_PER_CUSTOMER = 2;
const BLOCKED_REASON = 'Repeated no-shows reported by salons.';
const ANDROID_SHARE = 0.6;
const ARABIC_SHARE = 0.7;
const AVATAR_SHARE = 0.5;
const PUSH_ENABLED_SHARE = 0.85;

const daysAgo = (now: Date, days: number): Date => new Date(now.getTime() - days * MS_PER_DAY);

const addInstallation = (
  data: DemoDataset,
  random: DemoRandom,
  owner: { label: string; app: 'CUSTOMER' | 'MERCHANT'; language: Language; at: Date },
  link: { customerId?: Types.ObjectId; memberId?: Types.ObjectId },
): void => {
  const platform = random.chance(ANDROID_SHARE) ? 'ANDROID' : 'IOS';
  data.Installation.push({
    _id: demoId(`installation:${owner.label}`),
    installationId: `demo-${demoId(`installationId:${owner.label}`).toString()}`,
    app: owner.app,
    platform,
    appVersion: DEMO_APP_VERSION,
    osVersion: OS_VERSIONS[platform],
    deviceModel: random.pick(DEVICE_MODELS[platform]),
    language: owner.language,
    ...link,
    lastSeenAt: owner.at,
    createdAt: owner.at,
  });
};

export const buildCustomers = (
  ctx: DemoContext,
  random: DemoRandom,
  data: DemoDataset,
  salons: readonly DemoSalon[],
): DemoCustomer[] => {
  const out: DemoCustomer[] = [];
  const areas = [...ctx.areaIds.values()];
  let phoneIndex = 0;
  for (const gender of GENDERS) {
    // Customers take names from the end of the list, staff from the start.
    const names = [...DEMO_FIRST_NAMES[gender]].reverse();
    for (let index = 0; index < DEMO_CUSTOMERS_PER_GENDER; index += 1) {
      phoneIndex += 1;
      const label = `${gender}:${String(index)}`;
      const id = demoId(`customer:${label}`);
      const firstName = names[index % names.length] ?? '';
      const lastName = DEMO_LAST_NAMES[(index * 5 + phoneIndex) % DEMO_LAST_NAMES.length] ?? '';
      const number = `${DEMO_CUSTOMER_PHONE_PREFIX}${String(phoneIndex).padStart(DEMO_PHONE_INDEX_DIGITS, '0')}`;
      const createdAt = daysAgo(ctx.now, random.int(5, REGISTRATION_SPREAD_DAYS));
      const language: Language = random.chance(ARABIC_SHARE) ? 'ar' : 'en';
      // The last customer of each gender shows an account state other than ACTIVE.
      const last = index === DEMO_CUSTOMERS_PER_GENDER - 1;
      const status = last ? (gender === 'MALE' ? 'BLOCKED' : 'DELETION_PENDING') : 'ACTIVE';
      const avatarKey = random.chance(AVATAR_SHARE)
        ? `${DEMO_FILE_PREFIX}/customers/${label.replace(':', '-')}.${DEMO_IMAGE_EXTENSION}`
        : undefined;
      data.Customer.push({
        _id: id,
        firstName,
        lastName,
        email: `${firstName}.${lastName}${String(phoneIndex)}@${DEMO_EMAIL_DOMAIN}`.toLowerCase(),
        gender,
        phone: {
          countryCode: ctx.countryCode,
          dialCode: ctx.dialCode,
          number,
          e164: `${ctx.dialCode}${number}`,
        },
        cityId: ctx.cityId,
        areaId: random.pick(areas),
        ...(avatarKey === undefined ? {} : { avatarKey }),
        language,
        pushEnabled: random.chance(PUSH_ENABLED_SHARE),
        status,
        ...(status === 'BLOCKED'
          ? { blockedReason: BLOCKED_REASON, blockedAt: daysAgo(ctx.now, 2) }
          : {}),
        ...(status === 'DELETION_PENDING'
          ? {
              deletionRequestedAt: daysAgo(ctx.now, 3),
              deletionScheduledAt: daysAgo(ctx.now, 3 - DELETION_GRACE_DAYS),
            }
          : {}),
        lastActiveAt: daysAgo(ctx.now, random.int(0, 4)),
        createdAt,
      });
      if (avatarKey !== undefined) {
        addUpload(data, {
          key: avatarKey,
          purpose: 'CUSTOMER_AVATAR',
          ownerType: 'CUSTOMER',
          ownerId: id,
          at: createdAt,
        });
      }
      addInstallation(
        data,
        random,
        { label: `customer:${label}`, app: 'CUSTOMER', language, at: createdAt },
        { customerId: id },
      );
      out.push({ id, gender, firstName, language, active: status === 'ACTIVE', createdAt });

      // Favorites: live salons of the customer's gender.
      const liked = random.sample(
        salons.filter((salon) => salon.gender === gender && salon.spec.state === 'LIVE'),
        FAVORITES_PER_CUSTOMER,
      );
      for (const salon of liked) {
        data.Favorite.push({
          _id: demoId(`favorite:${label}:${salon.spec.key}`),
          customerId: id,
          salonId: salon.id,
          createdAt,
        });
      }
    }
  }
  // One merchant-app installation per salon member.
  for (const member of data.Member) {
    addInstallation(
      data,
      random,
      {
        label: `member:${member._id.toString()}`,
        app: 'MERCHANT',
        language: 'ar',
        at: member['createdAt'] as Date,
      },
      { memberId: member._id },
    );
  }
  return out;
};
