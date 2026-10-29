import type { BusinessType, Gender, Language } from '../../constants/enums';
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

type NearestSection = HomeSection<SalonCard & { title?: string }>;

export interface Home {
  /** First name of the signed-in customer; `null` for guests (the app shows its nickname). */
  readonly firstName: string | null;
  /** Unread notifications; `null` for guests (no bell). */
  readonly unreadCount: number | null;
  readonly banners: PublicBanner[];
  /** Sections in order (§5.19): salon services, clinic services, Recommended salons, Recommended
   * clinics, nearest salons, nearest clinics. Every business follows the visibility rule. */
  readonly salonServices: HomeSection<PublicCatalogService>;
  readonly clinicServices: HomeSection<PublicCatalogService>;
  readonly recommendedSalons: HomeSection<SalonCard>;
  readonly recommendedClinics: HomeSection<SalonCard>;
  /** `null` when the customer sent no position; one entry per bookable branch (§5.17). */
  readonly nearestSalons: NearestSection | null;
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
    gender: Gender;
    language: Language;
    customerId?: string | undefined;
    position?: { lat: number; lng: number } | undefined;
  }): Promise<Home>;
}

export interface HomeDeps {
  readonly banners: Pick<BannersService, 'live'>;
  readonly catalog: CatalogService;
  readonly search: Pick<SearchService, 'search'> & Partial<Pick<SearchService, 'nearestBranches'>>;
  readonly customers: Pick<CustomersRepository, 'findById'>;
  readonly unread?: UnreadLookup;
}

const section = <T>(items: T[], total: number): HomeSection<T> => ({
  items,
  hasMore: total > HOME_SECTION_SIZE,
});

/** One round trip with every home section for the selected gender (S03, §5.19). */
export const createHomeService = ({
  banners,
  catalog,
  search,
  customers,
  unread = noUnread,
}: HomeDeps): HomeService => ({
  async get({ gender, language, customerId, position }) {
    const params = { page: 1, pageSize: HOME_SECTION_SIZE };
    const services = async (
      businessType: BusinessType,
    ): Promise<HomeSection<PublicCatalogService>> => {
      const page = await catalog.list({ businessType, gender, language, params });
      return section(page.items, page.meta.total);
    };
    const recommended = async (businessType: BusinessType): Promise<HomeSection<SalonCard>> => {
      const page = await search.search({
        query: { gender, businessType, general: 'RECOMMENDED' },
        params,
        customerId,
        language,
      });
      return section(page.items, page.meta.total);
    };
    const nearest = async (businessType: BusinessType): Promise<NearestSection | null> => {
      if (position === undefined) return null;
      const page =
        search.nearestBranches === undefined
          ? await search.search({
              query: {
                gender,
                businessType,
                lat: position.lat,
                lng: position.lng,
                sort: 'NEAREST',
              },
              params,
              customerId,
              language,
            })
          : await search.nearestBranches({
              gender,
              businessType,
              lat: position.lat,
              lng: position.lng,
              params,
              customerId,
              language,
            });
      return section(page.items, page.meta.total);
    };
    const [
      customer,
      unreadCount,
      live,
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
      services('SALON'),
      services('CLINIC'),
      recommended('SALON'),
      recommended('CLINIC'),
      nearest('SALON'),
      nearest('CLINIC'),
    ]);
    return {
      firstName: customer?.firstName ?? null,
      unreadCount,
      banners: live,
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
