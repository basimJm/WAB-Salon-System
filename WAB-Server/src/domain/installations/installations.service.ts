import type { AppKind } from '../../constants/enums';
import { ERROR_CODES } from '../../constants/errorCodes';
import type { AnalyticsProvider } from '../../providers';
import type {
  CustomersRepository,
  DeviceRecord,
  InstallationsRepository,
  MembersRepository,
} from '../../repositories/identity.repository';
import { ForbiddenError, UnauthorizedError } from '../../utils/errors';
import type { Logger } from '../../utils/logger';

export interface RegisterResult {
  readonly installationId: string;
  /** True when the device is now tied to the signed-in account. */
  readonly linked: boolean;
}

export interface InstallationService {
  /**
   * Creates or updates the device record (Firebase app-instance id, FCM token, versions). A guest
   * of the customer app registers without an account; a signed-in caller also links the device to
   * their account, which joins the guest analytics history to the account (CLAUDE.md §4.7).
   */
  register(input: {
    app: AppKind;
    device: DeviceRecord;
    /** The signed-in customer or member, when the request carried a valid token. */
    subjectId?: string | undefined;
  }): Promise<RegisterResult>;
  /** Customer's account-wide push switch (Customer PRD §3, notifications toggle). */
  setPushEnabled(input: { customerId: string; enabled: boolean }): Promise<void>;
}

export interface InstallationServiceDeps {
  readonly installations: InstallationsRepository;
  readonly customers: CustomersRepository;
  readonly members: MembersRepository;
  readonly analytics: AnalyticsProvider;
  readonly logger: Logger;
  readonly now?: () => Date;
}

export const createInstallationService = (deps: InstallationServiceDeps): InstallationService => {
  const { installations, customers, members, analytics, logger } = deps;
  const now = deps.now ?? ((): Date => new Date());

  const linkAnalytics = async (
    installationId: string,
    actorType: 'CUSTOMER' | 'MEMBER',
    actorId: string,
  ): Promise<void> => {
    try {
      await analytics.linkIdentity({ installationId, actorType, actorId });
    } catch (error) {
      // Analytics must never break registering a device.
      logger.warn({ installationId, err: error }, 'analytics identity link failed');
    }
  };

  return {
    async register({ app, device, subjectId }) {
      const at = now();
      if (device.fcmToken !== undefined) {
        await installations.releaseFcmToken(device.fcmToken, device.installationId);
      }
      if (subjectId === undefined) {
        // Only the customer app has guests; the merchant routes always carry a member token.
        await installations.registerDevice(app, device, at);
        return { installationId: device.installationId, linked: false };
      }
      if (app === 'CUSTOMER') {
        const customer = await customers.findById(subjectId);
        if (customer === null || customer.status !== 'ACTIVE') throw new UnauthorizedError();
        await installations.linkCustomer(customer.id, device, at);
        await linkAnalytics(device.installationId, 'CUSTOMER', customer.id);
      } else {
        const member = await members.findById(subjectId);
        if (member === null) throw new UnauthorizedError();
        if (!member.active) throw new ForbiddenError({ code: ERROR_CODES.MEMBER_INACTIVE });
        await installations.linkMember(member.id, device, at);
        await linkAnalytics(device.installationId, 'MEMBER', member.id);
      }
      return { installationId: device.installationId, linked: true };
    },

    async setPushEnabled({ customerId, enabled }) {
      const customer = await customers.findById(customerId);
      if (customer === null || customer.status !== 'ACTIVE') throw new UnauthorizedError();
      await customers.updateById(customer.id, { pushEnabled: enabled });
    },
  };
};
