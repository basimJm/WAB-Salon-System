import type { Gender, Language } from '../../constants/enums';
import type { StorageProvider } from '../../providers/storage';
import type { CatalogServicesRepository } from '../../repositories/catalog.repository';
import type { Logger } from '../../utils/logger';
import { createSafePublicUrl } from '../uploads/safePublicUrl';
import type { PaginationMeta, PaginationParams } from '../../utils/pagination';

export interface PublicCatalogService {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly imageUrl: string;
  readonly gender: Gender;
}

export interface CatalogService {
  list(input: {
    gender: Gender;
    language: Language;
    params: PaginationParams;
  }): Promise<{ items: PublicCatalogService[]; meta: PaginationMeta }>;
}

export interface CatalogServiceDeps {
  readonly catalog: Pick<CatalogServicesRepository, 'findPage'>;
  readonly storage: Pick<StorageProvider, 'getPublicUrl'>;
  readonly logger?: Logger;
}

/**
 * Active catalog services of one audience, in the admin's order, in the caller's language. A service
 * whose image key is invalid keeps its row with an empty `imageUrl` (the page size stays exact).
 */
export const createCatalogService = ({
  catalog,
  storage,
  logger,
}: CatalogServiceDeps): CatalogService => {
  const publicUrl = createSafePublicUrl(storage, logger);
  return {
    async list({ gender, language, params }) {
      const page = await catalog.findPage({ gender, active: true }, params, { sortOrder: 1 });
      return {
        items: page.items.map((s) => ({
          id: s.id,
          name: s.name[language],
          description: s.description[language],
          imageUrl: publicUrl(s.imageKey, { catalogService: s.id }) ?? '',
          gender: s.gender,
        })),
        meta: page.meta,
      };
    },
  };
};
