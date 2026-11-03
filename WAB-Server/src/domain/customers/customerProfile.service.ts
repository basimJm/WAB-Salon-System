import type { Gender, Language } from '../../constants/enums';
import { ERROR_CODES, errorMessageKey } from '../../constants/errorCodes';
import { SLOT_KEYS } from '../../constants/uploads';
import type { CustomerRaw } from '../../models/customer.model';
import type { StorageProvider } from '../../providers/storage';
import type { AreasRepository, CitiesRepository } from '../../repositories/locations.repository';
import type { CustomersRepository } from '../../repositories/identity.repository';
import type { Entity } from '../../utils/database/plain';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
  type ErrorDetail,
} from '../../utils/errors';
import type { Logger } from '../../utils/logger';
import type { AccountLifecycleService } from '../auth/accountLifecycle.service';
import type { FileSlots, SlotTarget } from '../files/fileSlots.service';

export interface ProfileView {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly gender: Gender;
  readonly phone: { countryCode: string; dialCode: string; number: string; e164: string };
  readonly cityId: string;
  readonly areaId: string;
  readonly language: Language;
  readonly pushEnabled: boolean;
  readonly avatarUrl: string | null;
}

export interface ProfilePatch {
  readonly firstName?: string | undefined;
  readonly lastName?: string | undefined;
  readonly email?: string | undefined;
  readonly gender?: Gender | undefined;
  readonly cityId?: string | undefined;
  readonly areaId?: string | undefined;
  readonly language?: Language | undefined;
}

export interface CustomerProfileService {
  get(customerId: string): Promise<ProfileView>;
  /** The phone number changes only through the OTP flow (`/auth/change-phone`). */
  update(input: { customerId: string; patch: ProfilePatch }): Promise<ProfileView>;
  setAvatar(input: { customerId: string; key: string }): Promise<ProfileView>;
  removeAvatar(customerId: string): Promise<ProfileView>;
  /** Starts the grace period (S21); signing in again within it restores the account. */
  deleteAccount(customerId: string): Promise<{ deletionScheduledAt: Date }>;
}

export interface CustomerProfileDeps {
  readonly customers: Pick<CustomersRepository, 'findById' | 'patch'>;
  readonly cities: Pick<CitiesRepository, 'findOne'>;
  readonly areas: Pick<AreasRepository, 'findOne'>;
  /** The avatar is a file slot (SRV-181): replaced in place, removed through the cleanup outbox. */
  readonly files: Pick<FileSlots, 'replace' | 'remove'>;
  readonly storage: Pick<StorageProvider, 'getPublicUrl'>;
  readonly lifecycle: Pick<AccountLifecycleService, 'requestCustomerDeletion'>;
  readonly logger: Logger;
}

const invalid = (field: string): ErrorDetail => ({
  field,
  code: ERROR_CODES.VALIDATION_ERROR,
  messageKey: errorMessageKey(ERROR_CODES.VALIDATION_ERROR),
});

export const createCustomerProfileService = ({
  customers,
  cities,
  areas,
  files,
  storage,
  lifecycle,
}: CustomerProfileDeps): CustomerProfileService => {
  const avatarSlot = (customerId: string): SlotTarget => ({
    purpose: 'CUSTOMER_AVATAR',
    key: SLOT_KEYS.customerAvatar(customerId),
    ownerType: 'CUSTOMER',
    ownerId: customerId,
  });
  const toView = (c: Entity<CustomerRaw>): ProfileView => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    gender: c.gender,
    phone: { ...c.phone },
    cityId: c.cityId,
    areaId: c.areaId,
    language: c.language,
    pushEnabled: c.pushEnabled,
    avatarUrl: c.avatarKey === undefined ? null : storage.getPublicUrl(c.avatarKey),
  });

  /** Only an ACTIVE customer edits the profile; a blocked one is told so. */
  const current = async (customerId: string): Promise<Entity<CustomerRaw>> => {
    const customer = await customers.findById(customerId);
    if (
      customer === null ||
      customer.status === 'DELETED' ||
      customer.status === 'DELETION_PENDING'
    ) {
      throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
    }
    if (customer.status === 'BLOCKED')
      throw new ForbiddenError({ code: ERROR_CODES.ACCOUNT_BLOCKED });
    return customer;
  };

  return {
    async get(customerId) {
      return toView(await current(customerId));
    },

    async update({ customerId, patch }) {
      const customer = await current(customerId);
      const cityId = patch.cityId ?? customer.cityId;
      const areaId = patch.areaId ?? customer.areaId;
      if (patch.cityId !== undefined || patch.areaId !== undefined) {
        const [city, area] = await Promise.all([
          cities.findOne({ _id: cityId, active: true }),
          areas.findOne({ _id: areaId, active: true }),
        ]);
        const details = [
          ...(city === null ? [invalid('body.cityId')] : []),
          ...(area === null || area.cityId !== cityId ? [invalid('body.areaId')] : []),
        ];
        if (details.length > 0) throw new ValidationError({ details });
      }
      const set = Object.fromEntries(
        Object.entries(patch).filter(([, value]) => value !== undefined),
      );
      if (Object.keys(set).length === 0) return toView(customer);
      const updated = await customers.patch(customerId, { set });
      if (updated === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      return toView(updated);
    },

    async setAvatar({ customerId, key }) {
      const customer = await current(customerId);
      let view = toView(customer);
      await files.replace({
        target: avatarSlot(customerId),
        current: customer.avatarKey,
        incoming: key,
        field: 'body.key',
        accept: (upload) => upload.ownerType === 'CUSTOMER' && upload.ownerId === customerId,
        commit: async (ref) => {
          const updated = await customers.patch(customerId, { set: { avatarKey: ref } });
          if (updated === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
          view = toView(updated);
        },
      });
      return view;
    },

    async removeAvatar(customerId) {
      const customer = await current(customerId);
      let view = toView(customer);
      await files.remove({
        target: avatarSlot(customerId),
        current: customer.avatarKey,
        commit: async () => {
          const updated = await customers.patch(customerId, { set: {}, unset: ['avatarKey'] });
          if (updated === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
          view = toView(updated);
        },
      });
      return view;
    },

    async deleteAccount(customerId) {
      await current(customerId);
      return lifecycle.requestCustomerDeletion({ customerId });
    },
  };
};
