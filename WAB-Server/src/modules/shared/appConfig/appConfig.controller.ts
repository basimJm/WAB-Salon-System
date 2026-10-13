import type { Request, Response } from 'express';
import type { z } from 'zod';
import type { AppKind } from '../../../constants/enums';
import type { AppConfigService } from '../../../domain/appConfig';
import { sendSuccess } from '../../../utils/response/successResponse';
import type { appConfigQuerySchema } from './appConfig.validation';

export const createAppConfigController = (
  service: AppConfigService,
  app: AppKind,
): { get: (req: Request, res: Response) => Promise<void> } => ({
  async get(req, res) {
    const { platform, version } = (req.validated as { query: z.infer<typeof appConfigQuerySchema> })
      .query;
    const data = await service.get({ app, platform, version, language: req.language });
    sendSuccess(req, res, { data });
  },
});
