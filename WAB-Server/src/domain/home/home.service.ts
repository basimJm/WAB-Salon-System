import type { BusinessType, Gender, Language } from '../../constants/enums';
import { HOME_EXPLORE_CANDIDATES, HOME_SECTION_SIZE } from '../../constants/home';
import type { CustomersRepository } from '../../repositories/identity.repository';
import type { BannersService, PublicBanner } from '../banners';
import type { CatalogService, PublicCatalogService } from '../catalog/catalog.service';
import type { SalonCard, SearchService } from '../search/search.service';

/** Unread notifications of a customer (the notification core arrives with SRV-093). */
export interface UnreadLookup {
  count(customerId: string): Promise<number>;
}
export const noUnread: UnreadLookup = { count: () => Promise.resolve(0) };

/** Catalog service ids, most booked first (the *Explore* order, §5.22). */
export interface CatalogPopularity {
  rank(): Promise<readonly string[]>;
}
export const noPopularity: CatalogPopularity = { rank: () => Promise.resolve([]) };

/** The customer's latest completed booking per business, newest first (*Book again*, §5.22). */
export interface PastVisits {
  recent(
    customerId: string,
    limit: number,
  ): Promise<{ salonId: string; bookingId: string; salonServiceIds: string[] }[]>;
}
export const noPastVisits: PastVisits = { recent: () => Promise.resolve([]) };

export interface HomeSection<T> {
  readonly items: T[];
  /** More than one section's worth exists: show "See more / See all". */
  readonly hasMore: boolean;
}

type NearestSection = HomeSection<SalonCard & { title?: string }>;

/** A business the customer completed a booking at, with that booking's services to preselect. */
export type BookAgainItem = SalonCard & {
  readonly lastBooking: { id: string; salonServiceIds: string[] };
};

export interface Home {
  /** First name of the signed-in customer; `null` for guests (the app shows its nickname). */
  readonly firstName: string | null;
  /** Unread notifications; `null` for guests (no bell). */
  readonly unreadCount: number | null;
  readonly banners: PublicBanner[];
  /**
   * Merged home (§5.22), every section within the type lens and never filtered by gender:
   * Explore (most-booked catalog services across the types), Near you (one list by distance,
   * `null` without a position), Recommended (one rail of the types' placements), Book again
   * (`null` for guests).
   */
  readonly explore: HomeSection<PublicCatalogService>;
  readonly nearYou: NearestSection | null;
  readonly recommendedAll: HomeSection<SalonCard>;
  readonly bookAgain: HomeSection<BookAgainItem> | null;
  /** @deprecated per-type sections of §5.19 (app versions before CUS-102); no gender filter. */
  readonly salonServices: HomeSection<PublicCatalogService>;
  /** @deprecated see `salonServices`. */
  readonly clinicServices: HomeSection<PublicCatalogService>;
  /** @deprecated see `salonServices`. */
  readonly recommendedSalons: HomeSection<SalonCard>;
  /** @deprecated see `salonServices`. */
  readonly recommendedClinics: HomeSection<SalonCard>;
  /** @deprecated see `salonServices`. */
  readonly nearestSalons: NearestSection | null;
  /** @deprecated see `salonServices`. */
  readonly nearestClinics: NearestSection | null;
  /** @deprecated same as `salonServices` (kept for app versions before CUS-098). */
  readonly services: HomeSection<PublicCatalogService>;
  /** @deprecated same as `recommendedSalons`. */
  readonly recommended: HomeSection<SalonCard>;
  /** @deprecated same as `nearestSalons`. */
  readonly nearest: NearestSection | null;
}

export interface HomeService {
  get(input: {
    /** The onboarding/profile gender: banners only (§5.22 keeps it out of business discovery). */
    gender: Gender;
    language: Language;
    customerId?: string | undefined;
    position?: { lat: number; lng: number } | undefined;
    /** Type lens (§5.22); omitted or empty = every type. */
    businessTypes?: readonly BusinessType[] | undefined;
  }): Promise<Home>;
}

export interface HomeDeps {
  readonly banners: Pick<BannersService, 'live'>;
  readonly catalog: CatalogService;
  readonly search: Pick<SearchService, 'search'> &
    Partial<Pick<SearchService, 'nearestBranches' | 'cards'>>;
  readonly customers: Pick<CustomersRepository, 'findById'>;
  readonly unread?: UnreadLookup;
  readonly popularity?: CatalogPopularity;
  readonly pastVisits?: PastVisits;
}

const section = <T>(items: T[], total: number): HomeSection<T> => ({
  items,
  hasMore: total > HOME_SECTION_SIZE,
});

/** One round trip with every home section (S03, §5.22). */
export const createHomeService = ({
  banners,
  catalog,
  search,
  customers,
  unread = noUnread,
  popularity = noPopularity,
  pastVisits = noPastVisits,
}: HomeDeps): HomeService => ({
  async get({ gender, language, customerId, position, businessTypes }) {
    const params = { page: 1, pageSize: HOME_SECTION_SIZE };
    const lens =
      businessTypes === undefined || businessTypes.length === 0 ? undefined : businessTypes;

    const services = async (
      businessType: BusinessType,
    ): Promise<HomeSection<PublicCatalogService>> => {
      const page = await catalog.list({ businessType, language, params });
      return section(page.items, page.meta.total);
    };
    const explore = async (): Promise<HomeSection<PublicCatalogService>> => {
      const [page, ranked] = await Promise.all([
        catalog.list({
          ...(lens === undefined ? {} : { businessType: lens }),
          language,
          params: { page: 1, pageSize: HOME_EXPLORE_CANDIDATES },
        }),
        popularity.rank(),
      ]);
      const rankOf = new Map(ranked.map((id, index) => [id, index]));
      // Most booked first; services nobody booked yet keep the admin's order after them.
      const ordered = page.items
        .map((item, index) => ({ item, index, rank: rankOf.get(item.id) }))
        .sort(
          (a, b) =>
            (a.rank ?? Number.POSITIVE_INFINITY) - (b.rank ?? Number.POSITIVE_INFINITY) ||
            a.index - b.index,
        )
        .map((entry) => entry.item);
      return section(ordered.slice(0, HOME_SECTION_SIZE), page.meta.total);
    };
    const recommended = async (
      types: readonly BusinessType[] | undefined,
    ): Promise<HomeSection<SalonCard>> => {
      const page = await search.search({
        query: { businessTypes: types, general: 'RECOMMENDED' },
        params,
        customerId,
        language,
      });
      return section(page.items, page.meta.total);
    };
    const nearest = async (
      types: readonly BusinessType[] | undefined,
    ): Promise<NearestSection | null> => {
      if (position === undefined) return null;
      const page =
        search.nearestBranches === undefined
          ? await search.search({
              query: {
                businessTypes: types,
                lat: position.lat,
                lng: position.lng,
                sort: 'NEAREST',
              },
              params,
              customerId,
              language,
            })
          : await search.nearestBranches({
              businessTypes: types,
              lat: position.lat,
              lng: position.lng,
              params,
              customerId,
              language,
            });
      return section(page.items, page.meta.total);
    };
    const bookAgain = async (): Promise<HomeSection<BookAgainItem> | null> => {
      if (customerId === undefined) return null;
      const visits = await pastVisits.recent(customerId, HOME_SECTION_SIZE + 1);
      const cards =
        search.cards === undefined || visits.length === 0
          ? []
          : await search.cards({ ids: visits.map((v) => v.salonId), customerId, language });
      const byId = new Map(cards.map((c) => [c.id, c]));
      const items = visits.flatMap((visit): BookAgainItem[] => {
        const card = byId.get(visit.salonId);
        if (card === undefined || (lens !== undefined && !lens.includes(card.businessType)))
          return [];
        return [
          {
            ...card,
            lastBooking: { id: visit.bookingId, salonServiceIds: visit.salonServiceIds },
          },
        ];
      });
      return section(items.slice(0, HOME_SECTION_SIZE), items.length);
    };

    const [
      customer,
      unreadCount,
      live,
      exploreSection,
      nearYou,
      recommendedAll,
      again,
      salonServices,
      clinicServices,
      recommendedSalons,
      recommendedClinics,
      nearestSalons,
      nearestClinics,
    ] = await Promise.all([
      customerId === undefined ? Promise.resolve(null) : customers.findById(customerId),
      customerId === undefined ? Promise.resolve(null) : unread.count(customerId),
      banners.live(gender, language),
      explore(),
      nearest(lens),
      recommended(lens),
      bookAgain(),
      services('SALON'),
      services('CLINIC'),
      recommended(['SALON']),
      recommended(['CLINIC']),
      nearest(['SALON']),
      nearest(['CLINIC']),
    ]);
    return {
      firstName: customer?.firstName ?? null,
      unreadCount,
      banners: live,
      explore: exploreSection,
      nearYou,
      recommendedAll,
      bookAgain: again,
      salonServices,
      clinicServices,
      recommendedSalons,
      recommendedClinics,
      nearestSalons,
      nearestClinics,
      services: salonServices,
      recommended: recommendedSalons,
      nearest: nearestSalons,
    };
  },
});
