import type { Gender } from '../../constants/enums';
import { SHORT_DESCRIPTION_LENGTH, type SearchGeneralFilter } from '../../constants/search';
import type { SalonRaw } from '../../models/salon.model';
import type { StorageProvider } from '../../providers/storage';
import type { ClosuresRepository } from '../../repositories/closures.repository';
import type { SalonServicesRepository } from '../../repositories/salonServices.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import type { Entity } from '../../utils/database/plain';
import type { PaginationMeta, PaginationParams } from '../../utils/pagination';
import type { SettingsService } from '../settings';
import { localDateOf } from '../../utils/time';
import { todaysHours } from '../salons/hours';

export interface SalonCard {
  readonly id: string;
  readonly name: string;
  readonly profileImageUrl: string | null;
  readonly rating: number;
  readonly reviewsCount: number;
  readonly locationText: string | null;
  readonly shortDescription: string | null;
  readonly isOpenNow: boolean;
  /** Today's hours (`HH:mm`), or `null` when closed today. */
  readonly todayHours: { open: string; close: string } | null;
  readonly isFavorite: boolean;
}

export interface SearchQuery {
  readonly gender: Gender;
  /** Part of the salon name or location text. */
  readonly q?: string | undefined;
  /** Catalog service ids; a salon must offer ALL of them. */
  readonly serviceIds?: readonly string[] | undefined;
  /** Range for the SUM of the salon's prices of the selected services (integer fils). */
  readonly minPrice?: number | undefined;
  readonly maxPrice?: number | undefined;
  /** "X stars and above". */
  readonly minRating?: number | undefined;
  readonly general?: SearchGeneralFilter | undefined;
}

/** Which salons are currently recommended for an audience (placements arrive with SRV-066). */
export interface RecommendedLookup {
  salonIds(gender: Gender, at: Date): Promise<string[]>;
}
export const noRecommendations: RecommendedLookup = { salonIds: () => Promise.resolve([]) };

/** Which of these salons the customer saved (favorites arrive with SRV-062). */
export interface FavoriteLookup {
  among(customerId: string, salonIds: readonly string[]): Promise<Set<string>>;
}
export const noFavorites: FavoriteLookup = { among: () => Promise.resolve(new Set()) };

export interface SearchService {
  search(input: {
    query: SearchQuery;
    params: PaginationParams;
    customerId?: string | undefined;
  }): Promise<{ items: SalonCard[]; meta: PaginationMeta }>;
  /** Slider bounds for the price filter: min/max of the sums over salons offering all services. */
  priceBounds(input: {
    gender: Gender;
    serviceIds: readonly string[];
  }): Promise<{ min: number; max: number } | null>;
}

export interface SearchDeps {
  readonly salons: SalonsRepository;
  readonly salonServices: Pick<SalonServicesRepository, 'findMany'>;
  readonly closures: Pick<ClosuresRepository, 'findMany'>;
  readonly storage: Pick<StorageProvider, 'getPublicUrl'>;
  readonly settings: Pick<SettingsService, 'get'>;
  readonly recommended?: RecommendedLookup;
  readonly favorites?: FavoriteLookup;
  readonly now?: () => Date;
}

const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Salons whose active services cover every wanted id, with the sum of their prices. */
const priceSums = (
  rows: readonly { salonId: string; catalogServiceId: string; price: number }[],
  wanted: readonly string[],
): Map<string, number> => {
  const bySalon = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const own = bySalon.get(row.salonId) ?? new Map<string, number>();
    own.set(row.catalogServiceId, row.price);
    bySalon.set(row.salonId, own);
  }
  const sums = new Map<string, number>();
  for (const [salonId, prices] of bySalon) {
    if (wanted.every((id) => prices.has(id))) {
      sums.set(
        salonId,
        wanted.reduce((total, id) => total + (prices.get(id) ?? 0), 0),
      );
    }
  }
  return sums;
};

export const createSearchService = (deps: SearchDeps): SearchService => {
  const { salons, salonServices, closures, storage, settings } = deps;
  const recommended = deps.recommended ?? noRecommendations;
  const favorites = deps.favorites ?? noFavorites;
  const now = deps.now ?? ((): Date => new Date());

  const offering = async (ids: readonly string[]): Promise<Map<string, number>> => {
    const unique = [...new Set(ids)];
    const rows = await salonServices.findMany({ catalogServiceId: { $in: unique }, active: true });
    return priceSums(rows, unique);
  };

  const card = (
    s: Entity<SalonRaw>,
    ranges: { from: string; to: string; reason: string }[],
    timeZone: string,
    favorite: boolean,
  ): SalonCard => {
    const today = todaysHours(s.weeklySchedule, ranges, now(), timeZone);
    return {
      id: s.id,
      name: s.name,
      profileImageUrl: s.profileKey === undefined ? null : storage.getPublicUrl(s.profileKey),
      rating: s.rating.avg,
      reviewsCount: s.rating.count,
      locationText: s.locationText ?? null,
      shortDescription:
        s.description === undefined ? null : s.description.slice(0, SHORT_DESCRIPTION_LENGTH),
      isOpenNow: today.isOpenNow,
      todayHours:
        today.open === null || today.close === null
          ? null
          : { open: today.open, close: today.close },
      isFavorite: favorite,
    };
  };

  return {
    async search({ query, params, customerId }) {
      const empty = { items: [], meta: { page: params.page, pageSize: params.pageSize, total: 0 } };
      let allowed: string[] | undefined;
      if (query.serviceIds !== undefined && query.serviceIds.length > 0) {
        const sums = await offering(query.serviceIds);
        allowed = [...sums]
          .filter(
            ([, sum]) =>
              (query.minPrice === undefined || sum >= query.minPrice) &&
              (query.maxPrice === undefined || sum <= query.maxPrice),
          )
          .map(([salonId]) => salonId);
      }
      if (query.general === 'RECOMMENDED') {
        const ids = await recommended.salonIds(query.gender, now());
        allowed = allowed === undefined ? ids : allowed.filter((id) => ids.includes(id));
      }
      if (allowed !== undefined && allowed.length === 0) return empty;

      const page = await salons.findPage(
        {
          state: 'LIVE',
          'completeness.isComplete': true,
          gender: query.gender,
          ...(allowed === undefined ? {} : { _id: { $in: allowed } }),
          ...(query.minRating === undefined ? {} : { 'rating.avg': { $gte: query.minRating } }),
          ...(query.q === undefined || query.q === ''
            ? {}
            : { searchText: { $regex: escapeRegex(query.q), $options: 'i' } }),
        },
        params,
        { 'rating.avg': -1, 'rating.count': -1 },
      );
      const ids = page.items.map((s) => s.id);
      const timeZone = await settings.get('timezone');
      const date = localDateOf(now(), timeZone);
      const [ranges, saved] = await Promise.all([
        ids.length === 0 ? [] : closures.findMany({ salonId: { $in: ids }, to: { $gte: date } }),
        customerId === undefined
          ? Promise.resolve(new Set<string>())
          : favorites.among(customerId, ids),
      ]);
      return {
        items: page.items.map((s) =>
          card(
            s,
            ranges.filter((r) => r.salonId === s.id),
            timeZone,
            saved.has(s.id),
          ),
        ),
        meta: page.meta,
      };
    },

    async priceBounds({ gender, serviceIds }) {
      const sums = await offering(serviceIds);
      if (sums.size === 0) return null;
      const live = await salons.findMany({
        _id: { $in: [...sums.keys()] },
        state: 'LIVE',
        'completeness.isComplete': true,
        gender,
      });
      const values = live.map((s) => sums.get(s.id) ?? 0);
      return values.length === 0 ? null : { min: Math.min(...values), max: Math.max(...values) };
    },
  };
};
