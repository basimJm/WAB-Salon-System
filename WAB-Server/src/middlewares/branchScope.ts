import type { Request, RequestHandler } from 'express';
import { OBJECT_ID_PATTERN } from '../constants/database';
import { ERROR_CODES } from '../constants/errorCodes';
import { ForbiddenError, NotFoundError } from '../utils/errors';

/**
 * For routes mounted under `/branches/:branchId/…`: remembers the branch the request addresses,
 * so the reused salon-level routers work on that branch (§3.3a). Needs `mergeParams`.
 */
export const scopeToBranch: RequestHandler = (req, _res, next) => {
  const branchId = (req.params as { branchId?: string }).branchId ?? '';
  if (!OBJECT_ID_PATTERN.test(branchId)) {
    next(new NotFoundError({ code: ERROR_CODES.BRANCH_NOT_FOUND }));
    return;
  }
  req.branchScope = branchId;
  next();
};

/**
 * The branch a request works on: the addressed one, else the member's own (owner: none, meaning
 * the main branch for salon-level routes). A branch member addressing another branch is refused.
 */
export const branchScopeOf = (req: Request): string | undefined => {
  const own = req.member?.branchId;
  if (req.branchScope === undefined) return own;
  if (own !== undefined && own !== req.branchScope) {
    throw new ForbiddenError({ code: ERROR_CODES.BRANCH_SCOPE_DENIED });
  }
  return req.branchScope;
};
