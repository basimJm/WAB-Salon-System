import type { Request, Response } from 'express';
import type { z } from 'zod';
import type { AppKind } from '../../../constants/enums';
import type { InstallationService } from '../../../domain/installations/installations.service';
import { sendSuccess } from '../../../utils/response/successResponse';
import type { pushEnabledSchema, registerInstallationSchema } from './installations.validation';

const bodyOf = <S extends z.ZodType>(req: Request): z.infer<S> =>
  (req.validated as { body: z.infer<S> }).body;

type Handler = (req: Request, res: Response) => Promise<void>;

/** Thin handlers: validated body in, one service call, base envelope out. */
export const createInstallationsController = (
  service: InstallationService,
  app: AppKind,
): Record<'register' | 'setPushEnabled', Handler> => ({
  async register(req, res) {
    const { language, ...device } = bodyOf<typeof registerInstallationSchema>(req);
    const result = await service.register({
      app,
      device: { ...device, language: language ?? req.language },
      subjectId: req.auth?.subjectId,
    });
    sendSuccess(req, res, { data: result });
  },

  async setPushEnabled(req, res) {
    const { pushEnabled } = bodyOf<typeof pushEnabledSchema>(req);
    // `requireAuth` ran before this handler, so the caller is a known customer or member.
    const subjectId = req.auth?.subjectId ?? '';
    await (app === 'MERCHANT'
      ? service.setMemberPushEnabled({ memberId: subjectId, enabled: pushEnabled })
      : service.setPushEnabled({ customerId: subjectId, enabled: pushEnabled }));
    sendSuccess(req, res);
  },
});
