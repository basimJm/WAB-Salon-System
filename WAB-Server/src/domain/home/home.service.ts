import type { Gender, Language } from '../../constants/enums';
import { HOME_SECTION_SIZE } from '../../constants/home';
import type { CustomersRepository } from '../../repositories/identity.repository';
import type { BannersService, PublicBanner } from '../banners';
import type { CatalogService, PublicCatalogService } from '../catalog/catalog.service';
import type { SalonCard, SearchService } from '../search/search.service';

/** Unread notifications of a customer (the notification core arrives with SRV-093). */
export interface UnreadLookup {
  count(customerId: string): Promise<number>;
}
export const noUnread: UnreadLookup = { count: () => Promise.resolve(0) };

export interface HomeSection<T> {
  readonly items: T[];
  /** More than one section's worth exists: show "See more / See all". */
  readonly hasMore: boolean;
}

export interface Home {
  /** First name of the signed-in customer; `null` for guests (the app shows its nickname). */
  readonly firstName: string | null;
  /** Unread notifications; `null` for guests (no bell). */
  readonly unreadCount: number | null;
  readonly banners: PublicBanner[];
  readonly services: HomeSection<PublicCatalogService>;
  readonly recommended: HomeSection<SalonCard>;
  /** `null` when the customer sent no position (the app asks for location permission). */
  readonly nearest: HomeSection<SalonCard> | null;
}

export interface HomeService {
  get(input: {
    gender: Gender;
    language: Language;
    customerId?: string | undefined;
    position?: { lat: number; lng: number } | undefined;
  }): Promise<Home>;
}

export interface HomeDeps {
  readonly banners: Pick<BannersService, 'live'>;
  readonly catalog: CatalogService;
  readonly search: Pick<SearchService, 'search'>;
  readonly customers: Pick<CustomersRepository, 'findById'>;
  readonly unread?: UnreadLookup;
}

const section = <T>(items: T[], total: number): HomeSection<T> => ({
  items,
  hasMore: total > HOME_SECTION_SIZE,
});

/** One round trip with every home section for the selected gender (S03). */
export const createHomeService = ({
  banners,
  catalog,
  search,
  customers,
  unread = noUnread,
}: HomeDeps): HomeService => ({
  async get({ gender, language, customerId, position }) {
    const params = { page: 1, pageSize: HOME_SECTION_SIZE };
    const [customer, unreadCount, live, services, recommended, nearest] = await Promise.all([
      customerId === undefined ? Promise.resolve(null) : customers.findById(customerId),
      customerId === undefined ? Promise.resolve(null) : unread.count(customerId),
      banners.live(gender, language),
      catalog.list({ gender, language, params }),
      search.search({ query: { gender, general: 'RECOMMENDED' }, params, customerId }),
      position === undefined
        ? Promise.resolve(null)
        : search.search({
            query: { gender, lat: position.lat, lng: position.lng, sort: 'NEAREST' },
            params,
            customerId,
          }),
    ]);
    return {
      firstName: customer?.firstName ?? null,
      unreadCount,
      banners: live,
      services: section(services.items, services.meta.total),
      recommended: section(recommended.items, recommended.meta.total),
      nearest: nearest === null ? null : section(nearest.items, nearest.meta.total),
    };
  },
});
