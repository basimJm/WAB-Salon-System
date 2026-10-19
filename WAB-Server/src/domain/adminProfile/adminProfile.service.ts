import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import type { Redis } from 'ioredis';
import {
  ADMIN_OTP_HASH_SEPARATOR,
  ADMIN_OTP_TTL_SEC,
  ADMIN_OTP_CODE_PATTERN,
} from '../../constants/adminAuth';
import {
  ADMIN_EMAIL_CHANGE_KEY_PREFIX,
  ADMIN_EMAIL_CHANGE_VALUE_SEPARATOR,
  ADMIN_PROFILE_AUDIT,
} from '../../constants/adminProfile';
import { REVOKE_REASONS } from '../../constants/auth';
import { ERROR_CODES } from '../../constants/errorCodes';
import type { Language } from '../../constants/i18n';
import { MS_PER_MINUTE, MS_PER_SECOND } from '../../constants/time';
import type { Notifier } from '../../providers';
import type { AdminsRepository } from '../../repositories/identity.repository';
import { hashPassword, verifyPassword } from '../../utils/auth/password';
import { isDuplicateKeyError } from '../../utils/database/errors';
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  UnauthorizedError,
} from '../../utils/errors';
import { translate } from '../../utils/i18n';
import type { Logger } from '../../utils/logger';
import { startCooldown } from '../../utils/redis/counter';
import { redisKey } from '../../utils/redis/keys';
import type { AuditWriter } from '../audit/audit.service';
import type { AdminAuthService } from '../auth/adminAuth.service';
import type { AdminActor } from '../auth/accountLifecycle.service';
import type { RefreshTokenService } from '../auth/refreshTokens.service';
import type { SettingsService } from '../settings';

export interface AdminProfile {
  readonly id: string;
  readonly email: string;
  readonly alertEmails: readonly string[];
  readonly lastLoginAt: Date | null;
}

export interface EmailChangeChallenge {
  /** The emailed code stops working at this instant. */
  readonly expiresAt: Date;
  readonly resendAfterSeconds: number;
}

export interface AdminProfileService {
  get(adminId: string): Promise<AdminProfile>;
  /** Replaces the list of addresses that receive the platform alert emails. */
  updateAlertEmails(input: {
    actor: AdminActor;
    alertEmails: readonly string[];
  }): Promise<AdminProfile>;
  /**
   * The current password is checked like at sign-in (a wrong one counts toward the lockout), the
   * new one replaces it, and every session of the admin ends.
   */
  changePassword(input: {
    actor: AdminActor;
    currentPassword: string;
    newPassword: string;
    language: Language;
  }): Promise<void>;
  /** Mails a code to the NEW address; nothing changes until `confirmEmailChange`. */
  requestEmailChange(input: {
    actor: AdminActor;
    password: string;
    newEmail: string;
    language: Language;
  }): Promise<EmailChangeChallenge>;
  confirmEmailChange(input: {
    actor: AdminActor;
    code: string;
    language: Language;
  }): Promise<AdminProfile>;
}

export interface AdminProfileDeps {
  readonly admins: AdminsRepository;
  readonly auth: AdminAuthService;
  readonly refreshTokens: Pick<RefreshTokenService, 'revokeAll'>;
  readonly audit: AuditWriter;
  readonly redis: Redis;
  readonly notifier: Notifier;
  readonly settings: Pick<SettingsService, 'get'>;
  readonly logger: Logger;
  /** Keys the code hash, like the sign-in code. */
  readonly secret: string;
  readonly now?: () => Date;
  readonly randomCode?: (length: number) => string;
  /** bcrypt work factor (tests pass a cheap one). */
  readonly bcryptCost?: number;
}

const numericCode = (length: number): string =>
  randomInt(0, 10 ** length)
    .toString()
    .padStart(length, '0');

/**
 * The admin's own account (Admin PRD §4). A password change and an email change both end every
 * session, and both are announced to the address(es) that could be affected. Sessions are revoked
 * only after the change is stored, so a failed write never logs the admin out.
 */
export const createAdminProfileService = (deps: AdminProfileDeps): AdminProfileService => {
  const { admins, auth, refreshTokens, audit, redis, notifier, settings, logger } = deps;
  const now = deps.now ?? ((): Date => new Date());
  const newCode = deps.randomCode ?? numericCode;

  const changeKey = (adminId: string): string => redisKey(ADMIN_EMAIL_CHANGE_KEY_PREFIX, adminId);
  const resendKey = (adminId: string): string =>
    redisKey(ADMIN_EMAIL_CHANGE_KEY_PREFIX, 'resend', adminId);
  const hashCode = (adminId: string, newEmail: string, code: string): string =>
    createHmac('sha256', deps.secret)
      .update([adminId, newEmail, code].join(ADMIN_OTP_HASH_SEPARATOR))
      .digest('hex');
  const sameHash = (left: string, right: string): boolean => {
    const a = Buffer.from(left, 'hex');
    const b = Buffer.from(right, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  };

  const load = async (adminId: string): Promise<AdminProfile & { passwordHash: string }> => {
    const admin = await admins.findById(adminId);
    if (admin === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
    return {
      id: admin.id,
      email: admin.email,
      alertEmails: admin.alertEmails,
      lastLoginAt: admin.lastLoginAt ?? null,
      passwordHash: admin.passwordHash,
    };
  };
  const view = (admin: AdminProfile): AdminProfile => ({
    id: admin.id,
    email: admin.email,
    alertEmails: admin.alertEmails,
    lastLoginAt: admin.lastLoginAt,
  });

  /** Same rules as sign-in: 429 while locked, a wrong password counts, but answers 403 here. */
  const assertPassword = async (
    admin: AdminProfile,
    password: string,
    ip: string,
  ): Promise<void> => {
    try {
      await auth.verifyCredentials({ email: admin.email, password, ip });
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw new ForbiddenError({ code: ERROR_CODES.CURRENT_PASSWORD_INVALID });
      }
      throw error;
    }
  };

  const notify = async (
    to: readonly string[],
    key: string,
    params: Record<string, string>,
    language: Language,
    adminId: string,
  ): Promise<void> => {
    try {
      await notifier.sendEmail({
        to: [...to],
        subject: translate(language, `${key}.subject`),
        text: translate(language, `${key}.body`, params),
        idempotencyKey: `${key}:${adminId}:${String(now().getTime())}`,
      });
    } catch (error) {
      // Best effort: the change is already stored and must not be reported as failed.
      logger.warn({ adminId, err: error }, 'admin profile notice failed');
    }
  };

  const recipients = (admin: AdminProfile): readonly string[] =>
    admin.alertEmails.length > 0 ? admin.alertEmails : [admin.email];

  return {
    async get(adminId) {
      return view(await load(adminId));
    },

    async updateAlertEmails({ actor, alertEmails }) {
      const before = await load(actor.adminId);
      const unique = [...new Set(alertEmails.map((email) => email.trim().toLowerCase()))];
      const updated = await admins.updateById(actor.adminId, { alertEmails: unique });
      if (updated === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      await audit.record({
        adminId: actor.adminId,
        action: ADMIN_PROFILE_AUDIT.actions.profile,
        entityType: ADMIN_PROFILE_AUDIT.entityType,
        entityId: actor.adminId,
        before: { alertEmails: before.alertEmails },
        after: { alertEmails: updated.alertEmails },
        reason: ADMIN_PROFILE_AUDIT.reasons.profile,
        ip: actor.ip,
        userAgent: actor.userAgent,
      });
      return {
        id: updated.id,
        email: updated.email,
        alertEmails: updated.alertEmails,
        lastLoginAt: updated.lastLoginAt ?? null,
      };
    },

    async changePassword({ actor, currentPassword, newPassword, language }) {
      const admin = await load(actor.adminId);
      await assertPassword(admin, currentPassword, actor.ip);
      if (await verifyPassword(newPassword, admin.passwordHash)) {
        throw new BusinessRuleError({ code: ERROR_CODES.VALIDATION_ERROR });
      }
      const passwordHash = await hashPassword(newPassword, deps.bcryptCost);
      await admins.updateById(actor.adminId, { passwordHash });
      await audit.record({
        adminId: actor.adminId,
        action: ADMIN_PROFILE_AUDIT.actions.password,
        entityType: ADMIN_PROFILE_AUDIT.entityType,
        entityId: actor.adminId,
        reason: ADMIN_PROFILE_AUDIT.reasons.password,
        ip: actor.ip,
        userAgent: actor.userAgent,
      });
      await refreshTokens.revokeAll('ADMIN', actor.adminId, REVOKE_REASONS.credentialsChanged);
      await notify(
        recipients(admin),
        'emails.adminPasswordChanged',
        { email: admin.email },
        language,
        admin.id,
      );
    },

    async requestEmailChange({ actor, password, newEmail, language }) {
      const admin = await load(actor.adminId);
      await assertPassword(admin, password, actor.ip);
      const target = newEmail.trim().toLowerCase();
      if (target === admin.email || (await admins.findByEmail(target)) !== null) {
        throw new ConflictError({ code: ERROR_CODES.EMAIL_ALREADY_USED });
      }
      const resendAfterSec = await settings.get('otp.resendAfterSec');
      const cooldown = await startCooldown(
        redis,
        resendKey(admin.id),
        resendAfterSec * MS_PER_SECOND,
      );
      if (!cooldown.started) {
        throw new RateLimitError({ code: ERROR_CODES.RATE_LIMITED });
      }
      const code = newCode(await settings.get('otp.length'));
      const hash = hashCode(admin.id, target, code);
      await redis.set(
        changeKey(admin.id),
        `${target}${ADMIN_EMAIL_CHANGE_VALUE_SEPARATOR}${hash}`,
        'EX',
        ADMIN_OTP_TTL_SEC,
      );
      try {
        await notifier.sendEmail({
          to: [target],
          subject: translate(language, 'emails.adminEmailChange.subject'),
          text: translate(language, 'emails.adminEmailChange.body', {
            code,
            minutes: Math.round((ADMIN_OTP_TTL_SEC * MS_PER_SECOND) / MS_PER_MINUTE),
          }),
          idempotencyKey: `admin-email-change:${admin.id}:${hash.slice(0, 16)}`,
        });
      } catch (error) {
        await redis.del(changeKey(admin.id), resendKey(admin.id));
        throw error;
      }
      return {
        expiresAt: new Date(now().getTime() + ADMIN_OTP_TTL_SEC * MS_PER_SECOND),
        resendAfterSeconds: resendAfterSec,
      };
    },

    async confirmEmailChange({ actor, code, language }) {
      const admin = await load(actor.adminId);
      // 429 while locked: a locked account cannot guess codes either.
      await auth.identify(admin.email);
      const stored = await redis.get(changeKey(admin.id));
      if (stored === null) throw new BusinessRuleError({ code: ERROR_CODES.OTP_EXPIRED });
      const split = stored.indexOf(ADMIN_EMAIL_CHANGE_VALUE_SEPARATOR);
      const target = stored.slice(0, split);
      const storedHash = stored.slice(split + ADMIN_EMAIL_CHANGE_VALUE_SEPARATOR.length);
      if (
        !ADMIN_OTP_CODE_PATTERN.test(code) ||
        !sameHash(storedHash, hashCode(admin.id, target, code))
      ) {
        await auth.recordSecondFactorFailure({ adminId: admin.id, ip: actor.ip });
        throw new BusinessRuleError({ code: ERROR_CODES.OTP_INVALID });
      }
      // One use: of two requests with the right code only the one that deletes it changes the email.
      if ((await redis.del(changeKey(admin.id))) === 0) {
        throw new BusinessRuleError({ code: ERROR_CODES.OTP_EXPIRED });
      }
      let updated;
      try {
        updated = await admins.updateById(admin.id, { email: target });
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          throw new ConflictError({ code: ERROR_CODES.EMAIL_ALREADY_USED });
        }
        throw error;
      }
      if (updated === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      await audit.record({
        adminId: actor.adminId,
        action: ADMIN_PROFILE_AUDIT.actions.email,
        entityType: ADMIN_PROFILE_AUDIT.entityType,
        entityId: actor.adminId,
        before: { email: admin.email },
        after: { email: updated.email },
        reason: ADMIN_PROFILE_AUDIT.reasons.email,
        ip: actor.ip,
        userAgent: actor.userAgent,
      });
      await refreshTokens.revokeAll('ADMIN', admin.id, REVOKE_REASONS.credentialsChanged);
      await redis.del(resendKey(admin.id));
      await notify(
        [...new Set([admin.email, ...recipients(admin)])],
        'emails.adminEmailChanged',
        { email: admin.email, newEmail: updated.email },
        language,
        admin.id,
      );
      return {
        id: updated.id,
        email: updated.email,
        alertEmails: updated.alertEmails,
        lastLoginAt: updated.lastLoginAt ?? null,
      };
    },
  };
};
