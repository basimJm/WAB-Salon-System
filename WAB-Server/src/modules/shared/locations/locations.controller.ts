import type { Request, Response } from 'express';
import type { z } from 'zod';
import type { LocationsService } from '../../../domain/locations';
import { sendSuccess } from '../../../utils/response/successResponse';
import type { areasQuerySchema, citiesQuerySchema } from './locations.validation';

type Handler = (req: Request, res: Response) => Promise<void>;
const queryOf = <S extends z.ZodType>(req: Request): z.infer<S> =>
  (req.validated as { query: z.infer<S> }).query;

export const createLocationsController = (
  service: LocationsService,
): Record<'countries' | 'cities' | 'areas', Handler> => ({
  async countries(req, res) {
    sendSuccess(req, res, { data: await service.countries(req.language) });
  },
  async cities(req, res) {
    const { countryCode } = queryOf<typeof citiesQuerySchema>(req);
    sendSuccess(req, res, { data: await service.cities(countryCode, req.language) });
  },
  async areas(req, res) {
    const { cityId } = queryOf<typeof areasQuerySchema>(req);
    sendSuccess(req, res, { data: await service.areas(cityId, req.language) });
  },
});
