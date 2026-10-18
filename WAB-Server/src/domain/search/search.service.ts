import type { QueryFilter } from 'mongoose';
import type { Gender } from '../../constants/enums';
import {
  DISTANCE_DECIMALS,
  EARTH_RADIUS_KM,
  SHORT_DESCRIPTION_LENGTH,
  type SearchGeneralFilter,
  type SearchSort,
} from '../../constants/search';
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
  /** Distance in km from the customer, `null` when no position was sent or the salon has none. */
  readonly distanceKm: number | null;
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
  /** The customer's position; with `NEAREST` only salons inside the discovery radius are shown. */
  readonly lat?: number | undefined;
  readonly lng?: number | undefined;
  readonly sort?: SearchSort | undefined;
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
  /** Cards of these salons in the given order; salons that are not visible are left out. */
  cards(input: { ids: readonly string[]; customerId?: string | undefined }): Promise<SalonCard[]>;
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

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** Great-circle distance between two points, in km. */
export const distanceKm = (
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number => {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
};

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
    distance: number | null,
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
      distanceKm:
        distance === null ? null : Math.round(distance * DISTANCE_DECIMALS) / DISTANCE_DECIMALS,
    };
  };

  const toCards = async (
    items: readonly Entity<SalonRaw>[],
    customerId: string | undefined,
    distances: ReadonlyMap<string, number>,
  ): Promise<SalonCard[]> => {
    const ids = items.map((s) => s.id);
    const timeZone = await settings.get('timezone');
    const date = localDateOf(now(), timeZone);
    const [ranges, saved] = await Promise.all([
      ids.length === 0 ? [] : closures.findMany({ salonId: { $in: ids }, to: { $gte: date } }),
      customerId === undefined
        ? Promise.resolve(new Set<string>())
        : favorites.among(customerId, ids),
    ]);
    return items.map((s) =>
      card(
        s,
        ranges.filter((r) => r.salonId === s.id),
        timeZone,
        saved.has(s.id),
        distances.get(s.id) ?? null,
      ),
    );
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
      let placementOrder: string[] | undefined;
      if (query.general === 'RECOMMENDED') {
        const ids = await recommended.salonIds(query.gender, now());
        placementOrder = ids;
        allowed = allowed === undefined ? ids : allowed.filter((id) => ids.includes(id));
      }
      if (allowed !== undefined && allowed.length === 0) return empty;

      const here =
        query.lat === undefined || query.lng === undefined
          ? null
          : { lat: query.lat, lng: query.lng };
      const origin = (query.sort ?? 'NEAREST') === 'NEAREST' ? here : null;
      const nearest = origin !== null;
      const radiusKm = nearest ? await settings.get('discovery.nearbyRadiusKm') : 0;
      const filter: QueryFilter<SalonRaw> = {
        state: 'LIVE',
        'completeness.isComplete': true,
        gender: query.gender,
        ...(allowed === undefined ? {} : { _id: { $in: allowed } }),
        ...(query.minRating === undefined ? {} : { 'rating.avg': { $gte: query.minRating } }),
        ...(query.q === undefined || query.q === ''
          ? {}
          : { searchText: { $regex: escapeRegex(query.q), $options: 'i' } }),
        ...(origin !== null
          ? {
              location: {
                $geoWithin: {
                  $centerSphere: [[origin.lng, origin.lat], radiusKm / EARTH_RADIUS_KM],
                },
              },
            }
          : {}),
      };
      const distances = new Map<string, number>();
      const distanceOf = (s: Entity<SalonRaw>): number | null => {
        if (here === null || s.location === undefined) return null;
        const [lng, lat] = s.location.coordinates;
        if (lng === undefined || lat === undefined) return null;
        return distanceKm(here, { lat, lng });
      };
      let page: { items: Entity<SalonRaw>[]; meta: PaginationMeta };
      if (nearest) {
        const all = await salons.findMany(filter, { 'rating.avg': -1, 'rating.count': -1 });
        for (const s of all) distances.set(s.id, distanceOf(s) ?? Number.POSITIVE_INFINITY);
        all.sort((a, b) => (distances.get(a.id) ?? 0) - (distances.get(b.id) ?? 0));
        const start = (params.page - 1) * params.pageSize;
        page = {
          items: all.slice(start, start + params.pageSize),
          meta: { page: params.page, pageSize: params.pageSize, total: all.length },
        };
      } else if (placementOrder !== undefined) {
        // The recommended section follows the order the admin set, not the rating.
        const rank = new Map(placementOrder.map((id, index) => [id, index]));
        const all = await salons.findMany(filter);
        all.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
        const start = (params.page - 1) * params.pageSize;
        page = {
          items: all.slice(start, start + params.pageSize),
          meta: { page: params.page, pageSize: params.pageSize, total: all.length },
        };
        for (const s of page.items) {
          const d = distanceOf(s);
          if (d !== null) distances.set(s.id, d);
        }
      } else {
        page = await salons.findPage(filter, params, { 'rating.avg': -1, 'rating.count': -1 });
        for (const s of page.items) {
          const d = distanceOf(s);
          if (d !== null) distances.set(s.id, d);
        }
      }
      return {
        items: await toCards(page.items, customerId, distances),
        meta: page.meta,
      };
    },

    async cards({ ids, customerId }) {
      if (ids.length === 0) return [];
      const found = await salons.findMany({
        _id: { $in: [...ids] },
        state: 'LIVE',
        'completeness.isComplete': true,
      });
      const byId = new Map(found.map((s) => [s.id, s]));
      const ordered = ids.flatMap((id) => byId.get(id) ?? []);
      return toCards(ordered, customerId, new Map());
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
