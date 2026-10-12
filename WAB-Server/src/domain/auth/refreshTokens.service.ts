import { createHash, randomBytes as nodeRandomBytes } from 'node:crypto';
import {
  REFRESH_FAMILY_BYTES,
  REFRESH_TOKEN_BYTES,
  REFRESH_TOKEN_PATTERN,
  REVOKE_REASONS,
  TOKEN_HASH_ALGORITHM,
} from '../../constants/auth';
import type { SubjectType } from '../../constants/enums';
import { MS_PER_DAY } from '../../constants/time';
import type { RefreshTokensRepository } from '../../repositories/identity.repository';
import { toObjectId } from '../../utils/database/ids';
import { UnauthorizedError } from '../../utils/errors';
import type { Logger } from '../../utils/logger';

export interface IssueInput {
  subjectType: SubjectType;
  subjectId: string;
  installationId?: string;
  /** `auth.refreshTokenTtlDays` setting. */
  ttlDays: number;
}

export interface IssuedRefreshToken {
  token: string;
  expiresAt: Date;
  subjectType: SubjectType;
  subjectId: string;
  installationId?: string;
}

export interface RefreshTokenService {
  issue(input: IssueInput): Promise<IssuedRefreshToken>;
  rotate(input: { token: string; ttlDays: number }): Promise<IssuedRefreshToken>;
  revoke(token: string): Promise<void>;
  revokeAll(subjectType: SubjectType, subjectId: string, reason?: string): Promise<number>;
}

export interface RefreshTokenServiceDeps {
  repository: RefreshTokensRepository;
  logger: Logger;
  now?: () => Date;
  randomBytes?: (size: number) => Buffer;
}

export const hashRefreshToken = (token: string): string =>
  createHash(TOKEN_HASH_ALGORITHM).update(token).digest('hex');

const assertTtl = (ttlDays: number): void => {
  if (!Number.isInteger(ttlDays) || ttlDays < 1) {
    throw new RangeError('ttlDays must be a positive whole number');
  }
};

/** Refresh tokens: hashed at rest, rotated on every use, a reused token revokes its whole family. */
export const createRefreshTokenService = (deps: RefreshTokenServiceDeps): RefreshTokenService => {
  const { repository, logger } = deps;
  const now = deps.now ?? ((): Date => new Date());
  const random = deps.randomBytes ?? nodeRandomBytes;

  const store = async (
    input: IssueInput,
    familyId: string,
  ): Promise<{ issued: IssuedRefreshToken; id: string }> => {
    assertTtl(input.ttlDays);
    const token = random(REFRESH_TOKEN_BYTES).toString('base64url');
    const expiresAt = new Date(now().getTime() + input.ttlDays * MS_PER_DAY);
    const created = await repository.create({
      subjectType: input.subjectType,
      subjectId: toObjectId(input.subjectId),
      ...(input.installationId === undefined ? {} : { installationId: input.installationId }),
      tokenHash: hashRefreshToken(token),
      familyId,
      expiresAt,
    });
    return {
      id: created.id,
      issued: {
        token,
        expiresAt,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        ...(input.installationId === undefined ? {} : { installationId: input.installationId }),
      },
    };
  };

  const reuse = async (familyId: string, subjectId: string): Promise<never> => {
    const revoked = await repository.revokeFamily(familyId, REVOKE_REASONS.reuseDetected, now());
    logger.warn({ familyId, subjectId, revoked }, 'refresh token reuse detected');
    throw new UnauthorizedError();
  };

  return {
    async issue(input) {
      const familyId = random(REFRESH_FAMILY_BYTES).toString('hex');
      return (await store(input, familyId)).issued;
    },

    async rotate({ token, ttlDays }) {
      assertTtl(ttlDays);
      if (!REFRESH_TOKEN_PATTERN.test(token)) throw new UnauthorizedError();
      const current = await repository.findByTokenHash(hashRefreshToken(token));
      if (current === null) throw new UnauthorizedError();
      if (current.revokedAt !== undefined) return reuse(current.familyId, current.subjectId);
      if (current.expiresAt.getTime() <= now().getTime()) throw new UnauthorizedError();

      // Atomic claim: of two concurrent rotations only one wins, the other counts as reuse.
      const claimed = await repository.revokeIfActive(current.id, REVOKE_REASONS.rotated, now());
      if (claimed === null) return reuse(current.familyId, current.subjectId);

      const next = await store(
        {
          subjectType: current.subjectType,
          subjectId: current.subjectId,
          ...(current.installationId === undefined
            ? {}
            : { installationId: current.installationId }),
          ttlDays,
        },
        current.familyId,
      );
      await repository.markReplaced(current.id, next.id);
      return next.issued;
    },

    async revoke(token) {
      if (!REFRESH_TOKEN_PATTERN.test(token)) return;
      const current = await repository.findByTokenHash(hashRefreshToken(token));
      if (current === null) return;
      await repository.revokeIfActive(current.id, REVOKE_REASONS.logout, now());
    },

    revokeAll(subjectType, subjectId, reason = REVOKE_REASONS.logoutAll) {
      return repository.revokeAllForSubject(subjectType, subjectId, reason, now());
    },
  };
};
