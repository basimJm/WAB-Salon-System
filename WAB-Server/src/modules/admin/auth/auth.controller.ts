import type { Request, Response } from 'express';
import type { z } from 'zod';
import type { AdminAuthService, AdminSession } from '../../../domain/auth/adminAuth.service';
import { sendSuccess } from '../../../utils/response/successResponse';
import type { refreshSchema } from './auth.validation';

const bodyOf = (req: Request): z.infer<typeof refreshSchema> =>
  (req.validated as { body: z.infer<typeof refreshSchema> }).body;

type Handler = (req: Request, res: Response) => Promise<void>;

export const sessionData = (session: AdminSession): Record<string, unknown> => ({
  accessToken: session.accessToken,
  accessTokenExpiresAt: session.accessTokenExpiresAt.toISOString(),
  refreshToken: session.refreshToken,
  refreshTokenExpiresAt: session.refreshTokenExpiresAt.toISOString(),
  admin: session.admin,
});

/** Thin handlers: validated body in, one service call, base envelope out. */
export const createAdminAuthController = (
  service: AdminAuthService,
): Record<'refresh' | 'logout', Handler> => ({
  async refresh(req, res) {
    sendSuccess(req, res, { data: sessionData(await service.refresh(bodyOf(req))) });
  },

  async logout(req, res) {
    await service.logout(bodyOf(req));
    sendSuccess(req, res);
  },
});
