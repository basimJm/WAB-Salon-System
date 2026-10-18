import { ERROR_CODES, errorMessageKey } from '../../constants/errorCodes';
import type { BannerRaw } from '../../models/banner.model';
import type { BannersRepository } from '../../repositories/banners.repository';
import { ValidationError } from '../../utils/errors';
import type { AuditWriter } from '../audit/audit.service';
import { createAdminCrud, type AdminCrudService } from './adminCrud.service';

const invalid = (field: string): ValidationError =>
  new ValidationError({
    code: ERROR_CODES.VALIDATION_ERROR,
    details: [
      {
        field,
        code: ERROR_CODES.VALIDATION_ERROR,
        messageKey: errorMessageKey(ERROR_CODES.VALIDATION_ERROR),
      },
    ],
  });

type Fields = Partial<Record<'action' | 'actionValue' | 'startAt' | 'endAt', unknown>>;

/** Cross-field rules, checked on the merged (current + patch) values. */
export const assertBannerRules = (patch: Fields, current?: Fields): void => {
  const pick = (key: keyof Fields): unknown => (key in patch ? patch[key] : current?.[key]);
  const action = pick('action') ?? 'NONE';
  const value = pick('actionValue') ?? undefined;
  if (action === 'NONE' && value !== undefined) throw invalid('actionValue');
  if (action !== 'NONE' && value === undefined) throw invalid('actionValue');
  const start = pick('startAt');
  const end = pick('endAt');
  if (start instanceof Date && end instanceof Date && end <= start) throw invalid('endAt');
};

export const createAdminBannerService = (
  banners: BannersRepository,
  audit: AuditWriter,
): AdminCrudService<BannerRaw> =>
  createAdminCrud<BannerRaw>({
    name: 'BANNER',
    entityType: 'banner',
    store: banners,
    audit,
    checkReferences: (data, current) => {
      assertBannerRules(data, current);
      return Promise.resolve();
    },
  });
