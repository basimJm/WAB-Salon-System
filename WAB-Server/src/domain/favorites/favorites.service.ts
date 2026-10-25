import type { Language } from '../../constants/enums';
import { ERROR_CODES } from '../../constants/errorCodes';
import type { FavoritesRepository } from '../../repositories/favorites.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import { isDuplicateKeyError } from '../../utils/database/errors';
import { toObjectId } from '../../utils/database/ids';
import { NotFoundError } from '../../utils/errors';
import type { PaginationMeta, PaginationParams } from '../../utils/pagination';
import type { SalonCard, SearchService } from '../search/search.service';

export interface FavoritesService {
  /** Idempotent. The salon must be visible to customers (LIVE and complete). */
  add(input: { customerId: string; salonId: string }): Promise<void>;
  /** Idempotent: removing a salon that is not saved is fine. */
  remove(input: { customerId: string; salonId: string }): Promise<void>;
  /** Newest first. Salons that are no longer visible are left out of the page. */
  list(input: {
    customerId: string;
    params: PaginationParams;
    language?: Language | undefined;
  }): Promise<{ items: SalonCard[]; meta: PaginationMeta }>;
}

export interface FavoritesDeps {
  readonly favorites: Pick<FavoritesRepository, 'create' | 'exists' | 'remove' | 'findPage'>;
  readonly salons: Pick<SalonsRepository, 'findById'>;
  readonly search: Pick<SearchService, 'cards'>;
}

export const createFavoritesService = ({
  favorites,
  salons,
  search,
}: FavoritesDeps): FavoritesService => ({
  async add({ customerId, salonId }) {
    const salon = await salons.findById(salonId);
    if (salon?.state !== 'LIVE' || !salon.completeness.isComplete) {
      throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
    }
    if (await favorites.exists({ customerId, salonId })) return;
    try {
      await favorites.create({
        customerId: toObjectId(customerId),
        salonId: toObjectId(salonId),
      });
    } catch (error) {
      // Two taps at once: the unique pair already exists, which is the wanted end state.
      if (!isDuplicateKeyError(error)) throw error;
    }
  },

  async remove({ customerId, salonId }) {
    await favorites.remove(customerId, salonId);
  },

  async list({ customerId, params, language }) {
    const page = await favorites.findPage({ customerId }, params, { createdAt: -1 });
    const items = await search.cards({
      ids: page.items.map((f) => f.salonId),
      customerId,
      language,
    });
    return { items, meta: page.meta };
  },
});
