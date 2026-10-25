import { ERROR_CODES, errorMessageKey } from '../../constants/errorCodes';
import type { Language } from '../../constants/enums';
import type { CatalogServiceRaw } from '../../models/catalogService.model';
import type { SalonServiceRaw } from '../../models/salonService.model';
import type { StorageProvider } from '../../providers/storage';
import type { CatalogServicesRepository } from '../../repositories/catalog.repository';
import type { SalonServicesRepository } from '../../repositories/salonServices.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import { isDuplicateKeyError } from '../../utils/database/errors';
import { toObjectId } from '../../utils/database/ids';
import type { UploadRaw } from '../../models/upload.model';
import type { Entity } from '../../utils/database/plain';
import { formatJod } from '../../utils/money';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  type ErrorDetail,
} from '../../utils/errors';
import type { PaginationMeta, PaginationParams } from '../../utils/pagination';
import type { MainBranches } from '../branches/mainBranch';
import type { SalonStateService } from '../salons/salonState.service';
import type { UploadVerifier } from '../uploads/uploads.service';

export interface SalonServiceView {
  readonly id: string;
  readonly catalogServiceId: string;
  readonly name: string;
  readonly imageUrl: string;
  /** JOD decimal string (3 decimals). */
  readonly price: string;
  readonly durationMinutes: number;
  readonly brideOnly: boolean;
  readonly extraDescription: string | null;
  readonly mediaUrls: string[];
  readonly active: boolean;
}

export interface AddFields {
  /** Integer fils, > 0. */
  readonly price: number;
  readonly durationMinutes: number;
  readonly brideOnly?: boolean | undefined;
  readonly extraDescription?: string | undefined;
  readonly mediaKeys?: readonly string[] | undefined;
  readonly active?: boolean | undefined;
}

export interface UpdateFields {
  readonly price?: number | undefined;
  readonly durationMinutes?: number | undefined;
  readonly brideOnly?: boolean | undefined;
  /** `null` clears it. */
  readonly extraDescription?: string | null | undefined;
  readonly mediaKeys?: readonly string[] | undefined;
  readonly active?: boolean | undefined;
}

export interface SalonServicesService {
  list(input: {
    salonId: string;
    language: Language;
    params: PaginationParams;
  }): Promise<{ items: SalonServiceView[]; meta: PaginationMeta }>;
  add(input: {
    salonId: string;
    language: Language;
    catalogServiceId: string;
    fields: AddFields;
    /** Replaces the default "uploaded by this salon" check (an admin edits for the salon). */
    acceptUpload?: ((upload: Entity<UploadRaw>) => boolean) | undefined;
  }): Promise<SalonServiceView>;
  update(input: {
    salonId: string;
    language: Language;
    id: string;
    fields: UpdateFields;
    acceptUpload?: ((upload: Entity<UploadRaw>) => boolean) | undefined;
  }): Promise<SalonServiceView>;
}

export interface SalonServicesDeps {
  readonly salons: Pick<SalonsRepository, 'findById'>;
  readonly catalog: Pick<CatalogServicesRepository, 'findById' | 'findMany'>;
  readonly services: SalonServicesRepository;
  readonly storage: Pick<StorageProvider, 'getPublicUrl'>;
  readonly uploads: UploadVerifier;
  readonly state: Pick<SalonStateService, 'recompute'>;
  /** Salon-level endpoint: new services belong to the salon's main branch (§5.16). */
  readonly mainBranches?: Pick<MainBranches, 'idOf'>;
}

const invalid = (
  field: string,
  code:
    | typeof ERROR_CODES.VALIDATION_ERROR
    | typeof ERROR_CODES.GENDER_MISMATCH = ERROR_CODES.VALIDATION_ERROR,
): ValidationError =>
  new ValidationError({
    code,
    details: [{ field, code, messageKey: errorMessageKey(code) } satisfies ErrorDetail],
  });

export const createSalonServicesService = ({
  salons,
  catalog,
  services,
  storage,
  uploads,
  state,
  mainBranches,
}: SalonServicesDeps): SalonServicesService => {
  const toView = (
    s: Entity<SalonServiceRaw>,
    c: Entity<CatalogServiceRaw> | undefined,
    language: Language,
  ): SalonServiceView => ({
    id: s.id,
    catalogServiceId: s.catalogServiceId,
    name: c?.name[language] ?? '',
    imageUrl: c === undefined ? '' : storage.getPublicUrl(c.imageKey),
    price: formatJod(s.price),
    durationMinutes: s.durationMinutes,
    brideOnly: s.brideOnly,
    extraDescription: s.extraDescription ?? null,
    mediaUrls: s.mediaKeys.map((key) => storage.getPublicUrl(key)),
    active: s.active,
  });

  const loadSalon = async (salonId: string): Promise<{ gender: 'MALE' | 'FEMALE' }> => {
    const salon = await salons.findById(salonId);
    if (salon === null) throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
    return salon;
  };

  const verifyMedia = async (
    salonId: string,
    keys: readonly string[],
    accept?: (upload: Entity<UploadRaw>) => boolean,
  ): Promise<void> => {
    await uploads.assertConfirmed({
      keys,
      purpose: 'SERVICE_MEDIA',
      field: 'body.mediaKeys',
      accept: accept ?? ((upload) => upload.salonId === salonId),
    });
  };

  return {
    async list({ salonId, language, params }) {
      const page = await services.findPage({ salonId }, params, { createdAt: 1 });
      const ids = page.items.map((s) => s.catalogServiceId);
      const entries = ids.length === 0 ? [] : await catalog.findMany({ _id: { $in: ids } });
      const byId = new Map(entries.map((c) => [c.id, c]));
      return {
        items: page.items.map((s) => toView(s, byId.get(s.catalogServiceId), language)),
        meta: page.meta,
      };
    },

    async add({ salonId, language, catalogServiceId, fields, acceptUpload }) {
      const salon = await loadSalon(salonId);
      const entry = await catalog.findById(catalogServiceId);
      if (entry === null || !entry.active) throw invalid('body.catalogServiceId');
      if (entry.gender !== salon.gender)
        throw invalid('body.catalogServiceId', ERROR_CODES.GENDER_MISMATCH);
      if (fields.brideOnly === true && salon.gender !== 'FEMALE') throw invalid('body.brideOnly');
      if (await services.exists({ salonId, catalogServiceId })) {
        throw new ConflictError({ code: ERROR_CODES.CONFLICT });
      }
      await verifyMedia(salonId, fields.mediaKeys ?? [], acceptUpload);
      let created: Entity<SalonServiceRaw>;
      try {
        const branchId = await mainBranches?.idOf(salonId);
        created = await services.create({
          salonId: toObjectId(salonId),
          ...(branchId === undefined ? {} : { branchId }),
          catalogServiceId: toObjectId(catalogServiceId),
          price: fields.price,
          durationMinutes: fields.durationMinutes,
          brideOnly: fields.brideOnly ?? false,
          ...(fields.extraDescription === undefined
            ? {}
            : { extraDescription: fields.extraDescription }),
          mediaKeys: [...(fields.mediaKeys ?? [])],
          active: fields.active ?? true,
        });
      } catch (error) {
        if (isDuplicateKeyError(error)) throw new ConflictError({ code: ERROR_CODES.CONFLICT });
        throw error;
      }
      await state.recompute(salonId);
      return toView(created, entry, language);
    },

    async update({ salonId, language, id, fields, acceptUpload }) {
      const salon = await loadSalon(salonId);
      const current = await services.findOne({ _id: id, salonId });
      if (current === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      if (fields.brideOnly === true && salon.gender !== 'FEMALE') throw invalid('body.brideOnly');
      if (fields.mediaKeys !== undefined) {
        await verifyMedia(
          salonId,
          fields.mediaKeys.filter((key) => !current.mediaKeys.includes(key)),
          acceptUpload,
        );
      }
      const { extraDescription, mediaKeys, ...rest } = fields;
      const updated = await services.patch(id, {
        set: {
          ...rest,
          ...(mediaKeys === undefined ? {} : { mediaKeys: [...mediaKeys] }),
          ...(typeof extraDescription === 'string' ? { extraDescription } : {}),
        },
        unset: extraDescription === null ? ['extraDescription'] : [],
      });
      if (updated === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      await state.recompute(salonId);
      const entry = await catalog.findById(updated.catalogServiceId);
      return toView(updated, entry ?? undefined, language);
    },
  };
};
