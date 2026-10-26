import type { Request, Response } from 'express';
import type {
  CustomerAuthService,
  CustomerSession,
} from '../../../domain/auth/customerAuth.service';
import { sendCreated, sendSuccess } from '../../../utils/response/successResponse';
import type {
  changePhoneSchema,
  checkPhoneSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
} from './auth.validation';
import type { z } from 'zod';

type Body<S extends z.ZodType> = z.infer<S>;
const bodyOf = <S extends z.ZodType>(req: Request): Body<S> =>
  (req.validated as { body: Body<S> }).body;

const sessionData = (session: CustomerSession): Record<string, unknown> => ({
  accessToken: session.accessToken,
  accessTokenExpiresAt: session.accessTokenExpiresAt.toISOString(),
  refreshToken: session.refreshToken,
  refreshTokenExpiresAt: session.refreshTokenExpiresAt.toISOString(),
  customer: session.customer,
});

type Handler = (req: Request, res: Response) => Promise<void>;

/** Thin handlers: validated body in, one service call, base envelope out. */
export const createCustomerAuthController = (
  service: CustomerAuthService,
): Record<'checkPhone' | 'login' | 'register' | 'refresh' | 'logout' | 'changePhone', Handler> => ({
  async checkPhone(req, res) {
    await service.checkPhone(bodyOf<typeof checkPhoneSchema>(req));
    sendSuccess(req, res);
  },

  async login(req, res) {
    const { phone, otpToken, installation } = bodyOf<typeof loginSchema>(req);
    const session = await service.login({
      phone,
      otpToken,
      device: installation,
      language: req.language,
    });
    sendSuccess(req, res, { data: sessionData(session) });
  },

  async register(req, res) {
    const { installation, ...profile } = bodyOf<typeof registerSchema>(req);
    const session = await service.register({
      ...profile,
      device: installation,
      language: req.language,
    });
    sendCreated(req, res, sessionData(session));
  },

  async refresh(req, res) {
    const session = await service.refresh(bodyOf<typeof refreshSchema>(req));
    sendSuccess(req, res, { data: sessionData(session) });
  },

  async logout(req, res) {
    await service.logout(bodyOf<typeof refreshSchema>(req));
    sendSuccess(req, res);
  },

  async changePhone(req, res) {
    const { phone, otpToken } = bodyOf<typeof changePhoneSchema>(req);
    // `requireAuth` ran before this handler, so the caller is known.
    const customerId = req.auth?.subjectId ?? '';
    const customer = await service.changePhone({ customerId, phone, otpToken });
    sendSuccess(req, res, { data: { customer } });
  },
});
