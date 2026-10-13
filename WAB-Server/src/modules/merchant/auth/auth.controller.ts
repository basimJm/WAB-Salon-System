import type { Request, Response } from 'express';
import type { z } from 'zod';
import type {
  MerchantAuthService,
  MerchantSession,
} from '../../../domain/auth/merchantAuth.service';
import { sendSuccess } from '../../../utils/response/successResponse';
import type { checkPhoneSchema, loginSchema, refreshSchema } from './auth.validation';

const bodyOf = <S extends z.ZodType>(req: Request): z.infer<S> =>
  (req.validated as { body: z.infer<S> }).body;

const sessionData = (session: MerchantSession): Record<string, unknown> => ({
  accessToken: session.accessToken,
  accessTokenExpiresAt: session.accessTokenExpiresAt.toISOString(),
  refreshToken: session.refreshToken,
  refreshTokenExpiresAt: session.refreshTokenExpiresAt.toISOString(),
  member: session.member,
});

type Handler = (req: Request, res: Response) => Promise<void>;

/** Thin handlers: validated body in, one service call, base envelope out. */
export const createMerchantAuthController = (
  service: MerchantAuthService,
): Record<'checkPhone' | 'login' | 'refresh' | 'logout', Handler> => ({
  async checkPhone(req, res) {
    await service.checkPhone(bodyOf<typeof checkPhoneSchema>(req));
    sendSuccess(req, res);
  },

  async login(req, res) {
    const { phone, idToken, installation } = bodyOf<typeof loginSchema>(req);
    const session = await service.login({
      phone,
      idToken,
      device: installation,
      language: req.language,
    });
    sendSuccess(req, res, { data: sessionData(session) });
  },

  async refresh(req, res) {
    const session = await service.refresh(bodyOf<typeof refreshSchema>(req));
    sendSuccess(req, res, { data: sessionData(session) });
  },

  async logout(req, res) {
    await service.logout(bodyOf<typeof refreshSchema>(req));
    sendSuccess(req, res);
  },
});
