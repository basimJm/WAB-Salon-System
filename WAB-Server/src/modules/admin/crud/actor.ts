import type { Request } from 'express';
import type { AdminActor } from '../../../domain/auth/accountLifecycle.service';
import { UnauthorizedError } from '../../../utils/errors';

const UNKNOWN = 'unknown';

/** The signed-in admin and where the request came from, for the audit log. */
export const toActor = (req: Request): AdminActor => {
  if (req.auth === undefined) throw new UnauthorizedError();
  return {
    adminId: req.auth.subjectId,
    ip: req.ip ?? UNKNOWN,
    userAgent: req.get('user-agent') ?? UNKNOWN,
  };
};
