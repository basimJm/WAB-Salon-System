import type { Request, Response } from 'express';
import { CONTENT_KIND_SLUGS } from '../../../constants/content';
import type { ContentService } from '../../../domain/content';
import { sendSuccess } from '../../../utils/response/successResponse';
import type { pageParamsSchema } from './content.validation';
import type { z } from 'zod';

type Handler = (req: Request, res: Response) => Promise<void>;

export const createContentController = (
  service: ContentService,
): Record<'page' | 'faqs', Handler> => ({
  async page(req, res) {
    const { slug } = (req.validated as { params: z.infer<typeof pageParamsSchema> }).params;
    sendSuccess(req, res, {
      data: await service.page(CONTENT_KIND_SLUGS[slug], req.language),
    });
  },
  async faqs(req, res) {
    sendSuccess(req, res, { data: await service.faqs(req.language) });
  },
});
