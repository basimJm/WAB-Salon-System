import { salonTitle } from '../branches/salonTitle';
import type { Language } from '../../constants/enums';
import { DEFAULT_LANGUAGE } from '../../constants/i18n';
import type { BranchRaw } from '../../models/branch.model';
import type { BranchesRepository } from '../../repositories/branches.repository';
import {
  cheapestSums,
  greatCircleKm,
  pointOf,
  representativeBranch,
  type Point,
} from './branchPlaces';
import type { QueryFilter } from 'mongoose';
import {
  BUSINESS_TYPES,
  type Audience,
  type BusinessType,
  type Gender,
} from '../../constants/enums';
import { visibleAudiences } from '../businessTypes/rules';
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
  /** SALON or CLINIC and who it serves (§5.19). */
  readonly businessType: BusinessType;
  readonly audience: Audience;
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
  /** Bookable branches of the salon (§5.17); the card shows one place, the nearest or the main. */
  readonly branchCount: number;
  /** The branch the card's place, hours and distance come from (`null` before branches). */
  readonly branch: { id: string; name: string } | null;
}

/** One entry of the nearest list: a bookable branch, titled "Salon - Branch" when it has siblings. */
export interface BranchCard extends SalonCard {
  readonly title: string;
}

export interface SearchQuery {
  readonly gender: Gender;
  /** Only salons or only clinics (§5.19); omitted = both. */
  readonly businessType?: BusinessType | undefined;
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
  /** Active placements of one business type a customer of this gender may see, in order (§5.13). */
  salonIds(input: { businessType: BusinessType; gender: Gender }, at: Date): Promise<string[]>;
}
export const noRecommendations: RecommendedLookup = { salonIds: () => Promise.resolve([]) };

/** Which of these salons the customer saved (favorites arrive with SRV-062). */
export interface FavoriteLookup {
  among(customerId: string, salonIds: readonly string[]): Promise<Set<string>>;
}
export const noFavorites: FavoriteLookup = { among: () => Promise.resolve(new Set()) };

export interface SearchService {
  /** One card per salon, never per branch (§5.17). */
  search(input: {
    query: SearchQuery;
    params: PaginationParams;
    customerId?: string | undefined;
    language?: Language | undefined;
  }): Promise<{ items: SalonCard[]; meta: PaginationMeta }>;
  /** Cards of these salons in the given order; salons that are not visible are left out. */
  cards(input: {
    ids: readonly string[];
    /** Only businesses a customer of this gender may see (§5.19); omitted = no audience filter. */
    gender?: Gender | undefined;
    customerId?: string | undefined;
    language?: Language | undefined;
  }): Promise<SalonCard[]>;
  /**
   * Nearest list (§5.17): one entry per bookable branch inside the discovery radius, by distance;
   * a salon with several branches reads "Salon - Branch".
   */
  nearestBranches(input: {
    gender: Gender;
    businessType?: BusinessType | undefined;
    lat: number;
    lng: number;
    params: PaginationParams;
    customerId?: string | undefined;
    language?: Language | undefined;
  }): Promise<{ items: BranchCard[]; meta: PaginationMeta }>;
  /** Slider bounds for the price filter: min/max of the sums over salons offering all services. */
  priceBounds(input: {
    gender: Gender;
    businessType?: BusinessType | undefined;
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
  /** Branch wiring (§5.17); without it a salon is one place (its own fields). */
  readonly branches?: Pick<BranchesRepository, 'findMany'>;
}

/** Great-circle distance between two points, in km. */
export const distanceKm = (from: Point, to: Point): number =>
  greatCircleKm(from, to, EARTH_RADIUS_KM);

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
    // With branches a salon matches when one of its branches offers them all (cheapest branch).
    return deps.branches === undefined ? priceSums(rows, unique) : cheapestSums(rows, unique);
  };

  /** Bookable branches (ACTIVE and complete) of these salons, by salon. */
  const bookableBranches = async (
    salonIds: readonly string[],
  ): Promise<Map<string, Entity<BranchRaw>[]>> => {
    const bySalon = new Map<string, Entity<BranchRaw>[]>();
    if (deps.branches === undefined || salonIds.length === 0) return bySalon;
    const rows = await deps.branches.findMany({
      salonId: { $in: [...salonIds] },
      status: 'ACTIVE',
      'completeness.isComplete': true,
    } as never);
    for (const branch of rows)
      bySalon.set(branch.salonId, [...(bySalon.get(branch.salonId) ?? []), branch]);
    return bySalon;
  };

  const card = (input: {
    salon: Entity<SalonRaw>;
    place: { branch: Entity<BranchRaw>; distanceKm: number | null } | null;
    branchCount: number;
    ranges: { from: string; to: string; reason: string }[];
    timeZone: string;
    favorite: boolean;
    distance: number | null;
    language: Language;
  }): SalonCard => {
    const { salon: s, place, ranges, timeZone, favorite, language } = input;
    const schedule = place?.branch.weeklySchedule ?? s.weeklySchedule;
    const today = todaysHours(schedule, ranges, now(), timeZone);
    const distance = place?.distanceKm ?? input.distance;
    return {
      id: s.id,
      name: s.name,
      businessType: s.businessType,
      audience: s.audience,
      profileImageUrl: s.profileKey === undefined ? null : storage.getPublicUrl(s.profileKey),
      rating: s.rating.avg,
      reviewsCount: s.rating.count,
      locationText: (place === null ? s.locationText : place.branch.locationText) ?? null,
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
      branchCount: input.branchCount,
      branch: place === null ? null : { id: place.branch.id, name: place.branch.name[language] },
    };
  };

  const toCards = async (
    items: readonly Entity<SalonRaw>[],
    options: {
      customerId: string | undefined;
      distances: ReadonlyMap<string, number>;
      here: Point | null;
      language: Language;
    },
  ): Promise<SalonCard[]> => {
    const ids = items.map((s) => s.id);
    const timeZone = await settings.get('timezone');
    const date = localDateOf(now(), timeZone);
    const [ranges, saved, places] = await Promise.all([
      ids.length === 0 ? [] : closures.findMany({ salonId: { $in: ids }, to: { $gte: date } }),
      options.customerId === undefined
        ? Promise.resolve(new Set<string>())
        : favorites.among(options.customerId, ids),
      bookableBranches(ids),
    ]);
    return items.map((s) => {
      const branches = places.get(s.id) ?? [];
      const place = representativeBranch(branches, options.here, EARTH_RADIUS_KM);
      return card({
        salon: s,
        place,
        branchCount: branches.length,
        ranges: ranges.filter((r) =>
          place === null ? r.salonId === s.id : r.branchId === place.branch.id,
        ),
        timeZone,
        favorite: saved.has(s.id),
        distance: options.distances.get(s.id) ?? null,
        language: options.language,
      });
    });
  };

  /** Salons a customer of this gender may see, by id (LIVE, complete, audience fits, §5.19). */
  const visibleSalons = async (
    ids: readonly string[],
    gender: Gender,
    businessType?: BusinessType,
  ): Promise<Map<string, Entity<SalonRaw>>> => {
    const found =
      ids.length === 0
        ? []
        : await salons.findMany({
            _id: { $in: [...ids] },
            state: 'LIVE',
            'completeness.isComplete': true,
            audience: { $in: visibleAudiences(gender) },
            ...(businessType === undefined ? {} : { businessType }),
          });
    return new Map(found.map((salon) => [salon.id, salon]));
  };

  /** Bookable branches inside the discovery radius around a point (§5.17). */
  const branchesNear = async (here: Point): Promise<Entity<BranchRaw>[]> => {
    if (deps.branches === undefined) return [];
    const radiusKm = await settings.get('discovery.nearbyRadiusKm');
    return deps.branches.findMany({
      status: 'ACTIVE',
      'completeness.isComplete': true,
      location: {
        $geoWithin: { $centerSphere: [[here.lng, here.lat], radiusKm / EARTH_RADIUS_KM] },
      },
    } as never);
  };

  return {
    async search({ query, params, customerId, language = DEFAULT_LANGUAGE }) {
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
        // Recommended salons, then recommended clinics, each in the admin's order (§5.13).
        const types = query.businessType === undefined ? BUSINESS_TYPES : [query.businessType];
        const ids: string[] = [];
        for (const businessType of types) {
          ids.push(...(await recommended.salonIds({ businessType, gender: query.gender }, now())));
        }
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
      // With branches, "near" means a bookable branch inside the radius; distance = nearest branch.
      const branchDistances = new Map<string, number>();
      if (origin !== null && deps.branches !== undefined) {
        for (const branch of await branchesNear(origin)) {
          const point = pointOf(branch);
          if (point === null) continue;
          const d = distanceKm(origin, point);
          const current = branchDistances.get(branch.salonId);
          if (current === undefined || d < current) branchDistances.set(branch.salonId, d);
        }
        const inRange = [...branchDistances.keys()];
        allowed = allowed === undefined ? inRange : allowed.filter((id) => inRange.includes(id));
        if (allowed.length === 0) return empty;
      }
      const geoOnSalon = origin !== null && deps.branches === undefined;
      const filter: QueryFilter<SalonRaw> = {
        state: 'LIVE',
        'completeness.isComplete': true,
        audience: { $in: visibleAudiences(query.gender) },
        ...(query.businessType === undefined ? {} : { businessType: query.businessType }),
        ...(allowed === undefined ? {} : { _id: { $in: allowed } }),
        ...(query.minRating === undefined ? {} : { 'rating.avg': { $gte: query.minRating } }),
        ...(query.q === undefined || query.q === ''
          ? {}
          : { searchText: { $regex: escapeRegex(query.q), $options: 'i' } }),
        ...(geoOnSalon
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
        const viaBranch = branchDistances.get(s.id);
        if (viaBranch !== undefined) return viaBranch;
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
        items: await toCards(page.items, { customerId, distances, here, language }),
        meta: page.meta,
      };
    },

    async nearestBranches({
      gender,
      businessType,
      lat,
      lng,
      params,
      customerId,
      language = DEFAULT_LANGUAGE,
    }) {
      const here = { lat, lng };
      const near = await branchesNear(here);
      const visible = await visibleSalons(
        [...new Set(near.map((b) => b.salonId))],
        gender,
        businessType,
      );
      const entries = near
        .filter((b) => visible.has(b.salonId))
        .map((branch) => ({ branch, distance: distanceKm(here, pointOf(branch) ?? here) }))
        .sort((a, b) => a.distance - b.distance);
      const start = (params.page - 1) * params.pageSize;
      const pageEntries = entries.slice(start, start + params.pageSize);
      const salonIds = [...new Set(pageEntries.map((e) => e.branch.salonId))];
      const timeZone = await settings.get('timezone');
      const date = localDateOf(now(), timeZone);
      const [ranges, saved, siblings] = await Promise.all([
        pageEntries.length === 0
          ? []
          : closures.findMany({
              branchId: { $in: pageEntries.map((e) => e.branch.id) },
              to: { $gte: date },
            }),
        customerId === undefined
          ? Promise.resolve(new Set<string>())
          : favorites.among(customerId, salonIds),
        bookableBranches(salonIds),
      ]);
      const items = pageEntries.flatMap(({ branch, distance }): BranchCard[] => {
        const salon = visible.get(branch.salonId);
        if (salon === undefined) return [];
        const count = siblings.get(salon.id)?.length ?? 1;
        const base = card({
          salon,
          place: { branch, distanceKm: distance },
          branchCount: count,
          ranges: ranges.filter((r) => r.branchId === branch.id),
          timeZone,
          favorite: saved.has(salon.id),
          distance,
          language,
        });
        const title = salonTitle(salon.name, branch.name[language], count);
        return [{ ...base, title }];
      });
      return {
        items,
        meta: { page: params.page, pageSize: params.pageSize, total: entries.length },
      };
    },

    async cards({ ids, gender, customerId, language = DEFAULT_LANGUAGE }) {
      if (ids.length === 0) return [];
      const found = await salons.findMany({
        _id: { $in: [...ids] },
        state: 'LIVE',
        'completeness.isComplete': true,
        ...(gender === undefined ? {} : { audience: { $in: visibleAudiences(gender) } }),
      });
      const byId = new Map(found.map((s) => [s.id, s]));
      const ordered = ids.flatMap((id) => byId.get(id) ?? []);
      return toCards(ordered, { customerId, distances: new Map(), here: null, language });
    },

    async priceBounds({ gender, businessType, serviceIds }) {
      const sums = await offering(serviceIds);
      if (sums.size === 0) return null;
      const live = await salons.findMany({
        _id: { $in: [...sums.keys()] },
        state: 'LIVE',
        'completeness.isComplete': true,
        audience: { $in: visibleAudiences(gender) },
        ...(businessType === undefined ? {} : { businessType }),
      });
      const values = live.map((s) => sums.get(s.id) ?? 0);
      return values.length === 0 ? null : { min: Math.min(...values), max: Math.max(...values) };
    },
  };
};
