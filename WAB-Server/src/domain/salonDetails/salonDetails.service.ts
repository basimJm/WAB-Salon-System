import { SALON_VIEWED_EVENT } from '../../constants/statistics';
import type { ServerEvents } from '../events/events.service';
import { pointOf } from '../search/branchPlaces';
import type { BranchRaw } from '../../models/branch.model';
import type { BranchesRepository } from '../../repositories/branches.repository';
import { REVIEW_PREVIEW_COUNT } from '../../constants/reviews';
import type { Language } from '../../constants/enums';
import { ERROR_CODES } from '../../constants/errorCodes';
import type { StaffStatus } from '../../constants/salonDetails';
import type { MemberRaw } from '../../models/member.model';
import type { SalonRaw, ScheduleDay } from '../../models/salon.model';
import type { StorageProvider } from '../../providers/storage';
import type { CatalogServicesRepository } from '../../repositories/catalog.repository';
import type { ClosuresRepository } from '../../repositories/closures.repository';
import type { GalleryRepository } from '../../repositories/gallery.repository';
import type { MembersRepository } from '../../repositories/identity.repository';
import type { LeavesRepository } from '../../repositories/leaves.repository';
import type { SalonServicesRepository } from '../../repositories/salonServices.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import type { Entity } from '../../utils/database/plain';
import { NotFoundError } from '../../utils/errors';
import { formatJod } from '../../utils/money';
import { dayOfWeek, localDateOf } from '../../utils/time';
import { todaysHours } from '../salons/hours';
import type { SettingsService } from '../settings';
import type { ReviewView, ReviewsService } from '../reviews/reviews.service';
import { noFavorites, type FavoriteLookup } from '../search/search.service';
import { isVisibleTo } from '../businessTypes/rules';
import type { Gender } from '../../constants/enums';
import type { CustomersRepository } from '../../repositories/identity.repository';

export interface StaffSummary {
  readonly id: string;
  readonly firstName: string;
  readonly photoUrl: string | null;
  readonly status: StaffStatus;
  /** The staff member's branch: the app shows the staff of the selected branch (§5.17). */
  readonly branchId: string | null;
}

/** A bookable branch as the salon page shows it (§5.17). */
export interface BranchSummary {
  readonly id: string;
  readonly name: string;
  readonly isMain: boolean;
  readonly locationText: string | null;
  readonly location: { lat: number; lng: number } | null;
  readonly phone: string | null;
  readonly whatsapp: string | null;
  readonly isOpenNow: boolean;
  readonly todayHours: { open: string; close: string } | null;
  readonly closedReason: string | null;
  readonly weeklySchedule: ScheduleDay[];
  readonly upcomingClosures: { from: string; to: string; reason: string }[];
}

export interface StaffDetails extends StaffSummary {
  readonly role: MemberRaw['role'];
  readonly rating: { avg: number; count: number };
  readonly bio: string | null;
  readonly yearsOfExperience: number | null;
  readonly customersCount: number;
  readonly workingDays: { day: string; start: string | null; end: string | null }[];
  readonly services: {
    id: string;
    catalogServiceId: string;
    name: string;
    /** Bookable only for a bride person (§5.5 BRIDE_ONLY_SERVICE). */
    brideOnly: boolean;
  }[];
  readonly reviews: { avg: number; count: number; latest: ReviewView[] };
}

export interface SalonDetails {
  readonly id: string;
  readonly name: string;
  readonly businessType: SalonRaw['businessType'];
  readonly audience: SalonRaw['audience'];
  readonly coverUrl: string | null;
  readonly profileImageUrl: string | null;
  readonly description: string | null;
  readonly locationText: string | null;
  readonly location: { lat: number; lng: number } | null;
  readonly phone: string | null;
  readonly whatsapp: string | null;
  readonly rating: { avg: number; count: number };
  readonly isOpenNow: boolean;
  readonly todayHours: { open: string; close: string } | null;
  readonly closedReason: string | null;
  readonly weeklySchedule: ScheduleDay[];
  readonly upcomingClosures: { from: string; to: string; reason: string }[];
  readonly staff: StaffSummary[];
  /** Bookable branches, main first; the place fields above are the main branch's (§5.17). */
  readonly branches: BranchSummary[];
  readonly services: {
    id: string;
    /** The branch offering it at this price (each branch has its own services). */
    branchId: string | null;
    catalogServiceId: string;
    name: string;
    imageUrl: string;
    description: string | null;
    price: string;
    durationMinutes: number;
    /** Bookable only for a bride person (§5.5 BRIDE_ONLY_SERVICE). */
    brideOnly: boolean;
    mediaUrls: string[];
  }[];
  readonly gallery: {
    id: string;
    type: string;
    url: string;
    thumbnailUrl: string | null;
    durationSec: number | null;
  }[];
  readonly isFavorite: boolean;
  /** Average, count and the latest few approved reviews. */
  readonly reviews: { avg: number; count: number; latest: ReviewView[] };
}

export interface SalonDetailsService {
  get(input: {
    salonId: string;
    language: Language;
    customerId?: string | undefined;
    /**
     * The viewer's gender for a guest (the onboarding choice). A signed-in customer's own gender
     * wins. A business the viewer may not see (§5.19) is not found.
     */
    gender?: Gender | undefined;
    /**
     * The branch the customer selected (§5.17/§5.18): staff, services and the place fields are
     * that branch's only; `BRANCH_NOT_FOUND` when it is not a bookable branch of the salon.
     * Omitted: every bookable branch's staff and services, each tagged with its `branchId`.
     */
    branchId?: string | undefined;
  }): Promise<SalonDetails>;
  staff(input: { salonId: string; memberId: string; language: Language }): Promise<StaffDetails>;
}

export interface SalonDetailsDeps {
  readonly salons: Pick<SalonsRepository, 'findById'>;
  /** The signed-in customer's gender for the visibility rule (§5.19). */
  readonly customers?: Pick<CustomersRepository, 'findById'>;
  readonly members: Pick<MembersRepository, 'findMany' | 'findOne'>;
  readonly salonServices: Pick<SalonServicesRepository, 'findMany'>;
  readonly catalog: Pick<CatalogServicesRepository, 'findMany'>;
  readonly gallery: Pick<GalleryRepository, 'forSalon'>;
  readonly closures: Pick<ClosuresRepository, 'findMany'>;
  readonly leaves: Pick<LeavesRepository, 'findMany'>;
  readonly storage: Pick<StorageProvider, 'getPublicUrl'>;
  readonly settings: Pick<SettingsService, 'get'>;
  readonly favorites?: FavoriteLookup;
  readonly reviews?: Pick<ReviewsService, 'latest'>;
  readonly now?: () => Date;
  /** Server events (salon page views); without it views are not counted. */
  readonly events?: Pick<ServerEvents, 'track'>;
  /** Branch wiring (§5.17); without it the salon is one place (its own fields). */
  readonly branches?: Pick<BranchesRepository, 'findMany'>;
}

export const createSalonDetailsService = (deps: SalonDetailsDeps): SalonDetailsService => {
  const { salons, members, salonServices, catalog, gallery, closures, leaves, storage, settings } =
    deps;
  const favorites = deps.favorites ?? noFavorites;
  const latestReviews = (
    language: Language,
    salonId: string,
    staffId?: string,
  ): Promise<ReviewView[]> =>
    deps.reviews?.latest({ salonId, staffId, limit: REVIEW_PREVIEW_COUNT, language }) ??
    Promise.resolve([]);
  const now = deps.now ?? ((): Date => new Date());
  const url = (key: string | undefined): string | null =>
    key === undefined ? null : storage.getPublicUrl(key);
  /** Lean reads skip schema defaults: a service stored before `brideOnly` existed has no field. */
  const isBrideOnly = (stored: boolean | undefined): boolean => stored === true;

  /** A salon customers may see (§5.2): LIVE and complete. Anything else is simply not found. */
  const visible = async (salonId: string): Promise<Entity<SalonRaw>> => {
    const salon = await salons.findById(salonId);
    if (salon?.state !== 'LIVE' || !salon.completeness.isComplete) {
      throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
    }
    return salon;
  };

  const statusOf = (
    member: Entity<MemberRaw>,
    today: string,
    onLeave: ReadonlySet<string>,
  ): StaffStatus => {
    if (onLeave.has(member.id)) return 'ON_LEAVE';
    const works = member.staff?.workingDays.some((d) => d.day === dayOfWeek(today)) ?? false;
    return works ? 'ON_DUTY' : 'DAY_OFF';
  };

  const staffMembers = (salonId: string): Promise<Entity<MemberRaw>[]> =>
    members.findMany({ salonId, active: true, providesServices: true });

  const leavesToday = async (salonId: string, today: string): Promise<Set<string>> => {
    const rows = await leaves.findMany({ salonId, from: { $lte: today }, to: { $gte: today } });
    return new Set(rows.map((l) => l.memberId));
  };

  const summary = (m: Entity<MemberRaw>, status: StaffStatus): StaffSummary => ({
    id: m.id,
    firstName: m.firstName,
    photoUrl: url(m.photoKey),
    status,
    branchId: m.branchId ?? null,
  });

  /** Bookable branches (ACTIVE and complete), main first. */
  const bookableBranches = async (salonId: string): Promise<Entity<BranchRaw>[]> =>
    deps.branches === undefined
      ? []
      : deps.branches.findMany(
          { salonId, status: 'ACTIVE', 'completeness.isComplete': true } as never,
          { isMain: -1, 'name.en': 1 } as never,
        );

  const placeOf = pointOf;

  /** The selected branch among the bookable ones; without branch wiring the salon is the place. */
  const selectedBranch = (
    branches: Entity<BranchRaw>[],
    branchId: string,
  ): Entity<BranchRaw> | undefined => {
    if (deps.branches === undefined) return undefined;
    const picked = branches.find((b) => b.id === branchId);
    if (picked === undefined) throw new NotFoundError({ code: ERROR_CODES.BRANCH_NOT_FOUND });
    return picked;
  };

  return {
    async get({ salonId, language, customerId, branchId, gender }) {
      const salon = await visible(salonId);
      const customer = customerId === undefined ? null : await deps.customers?.findById(customerId);
      const viewer = customer?.gender ?? gender;
      if (viewer !== undefined && !isVisibleTo(salon, viewer)) {
        throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
      }
      // Profile views for merchant statistics (M21); tracking never fails the page.
      void deps.events?.track({
        name: SALON_VIEWED_EVENT,
        actorType: 'CUSTOMER',
        ...(customerId === undefined ? {} : { actorId: customerId }),
        salonId,
      });
      const timeZone = await settings.get('timezone');
      const today = localDateOf(now(), timeZone);
      const [ranges, team, onLeave, offered, items, saved, latest, branches] = await Promise.all([
        closures.findMany({ salonId, to: { $gte: today } }, { from: 1 }),
        staffMembers(salonId),
        leavesToday(salonId, today),
        salonServices.findMany({ salonId, active: true }),
        gallery.forSalon(salonId),
        customerId === undefined
          ? Promise.resolve(new Set<string>())
          : favorites.among(customerId, [salonId]),
        latestReviews(language, salonId),
        bookableBranches(salonId),
      ]);
      const selected = branchId === undefined ? undefined : selectedBranch(branches, branchId);
      // Only what customers can book: staff and services of bookable branches (§5.17), of the
      // selected branch alone when the customer picked one (§5.18: every step uses that branch).
      const bookableIds = new Set(
        selected === undefined ? branches.map((b) => b.id) : [selected.id],
      );
      const inBookable = (rowBranchId: string | undefined): boolean =>
        branches.length === 0 || (rowBranchId !== undefined && bookableIds.has(rowBranchId));
      const main = selected ?? branches.find((b) => b.isMain) ?? branches[0];
      const closuresOf = (branchId?: string): typeof ranges =>
        branchId === undefined ? ranges : ranges.filter((r) => r.branchId === branchId);
      const entries =
        offered.length === 0
          ? []
          : await catalog.findMany({
              _id: { $in: offered.map((s) => s.catalogServiceId) },
            });
      const byId = new Map(entries.map((c) => [c.id, c]));
      const place = main ?? salon;
      const placeClosures = closuresOf(main?.id);
      const hours = todaysHours(place.weeklySchedule, placeClosures, now(), timeZone);
      const location = placeOf(place);
      return {
        id: salon.id,
        name: salon.name,
        businessType: salon.businessType,
        audience: salon.audience,
        coverUrl: url(salon.coverKey),
        profileImageUrl: url(salon.profileKey),
        description: salon.description ?? null,
        locationText: place.locationText ?? null,
        location,
        phone: place.phone ?? null,
        whatsapp: place.whatsapp ?? null,
        rating: salon.rating,
        isOpenNow: hours.isOpenNow,
        todayHours:
          hours.open === null || hours.close === null
            ? null
            : { open: hours.open, close: hours.close },
        closedReason: hours.closedReason,
        weeklySchedule: place.weeklySchedule,
        upcomingClosures: placeClosures.map(({ from, to, reason }) => ({ from, to, reason })),
        staff: team
          .filter((m) => inBookable(m.branchId))
          .map((m) => summary(m, statusOf(m, today, onLeave))),
        branches: branches.map((b): BranchSummary => {
          const own = closuresOf(b.id);
          const branchHours = todaysHours(b.weeklySchedule, own, now(), timeZone);
          return {
            id: b.id,
            name: b.name[language],
            isMain: b.isMain,
            locationText: b.locationText ?? null,
            location: placeOf(b),
            phone: b.phone ?? null,
            whatsapp: b.whatsapp ?? null,
            isOpenNow: branchHours.isOpenNow,
            todayHours:
              branchHours.open === null || branchHours.close === null
                ? null
                : { open: branchHours.open, close: branchHours.close },
            closedReason: branchHours.closedReason,
            weeklySchedule: b.weeklySchedule,
            upcomingClosures: own.map(({ from, to, reason }) => ({ from, to, reason })),
          };
        }),
        services: offered.flatMap((s) => {
          const entry = byId.get(s.catalogServiceId);
          if (entry === undefined || !inBookable(s.branchId)) return [];
          return [
            {
              id: s.id,
              branchId: s.branchId ?? null,
              catalogServiceId: s.catalogServiceId,
              name: entry.name[language],
              imageUrl: storage.getPublicUrl(entry.imageKey),
              description: s.extraDescription ?? entry.description[language],
              price: formatJod(s.price),
              durationMinutes: s.durationMinutes,
              brideOnly: isBrideOnly(s.brideOnly),
              mediaUrls: s.mediaKeys.map((key) => storage.getPublicUrl(key)),
            },
          ];
        }),
        gallery: items.map((g) => ({
          id: g.id,
          type: g.type,
          url: storage.getPublicUrl(g.key),
          thumbnailUrl: url(g.thumbnailKey),
          durationSec: g.durationSec ?? null,
        })),
        isFavorite: saved.has(salonId),
        reviews: { avg: salon.rating.avg, count: salon.rating.count, latest },
      };
    },

    async staff({ salonId, memberId, language }) {
      await visible(salonId);
      const member = await members.findOne({
        _id: memberId,
        salonId,
        active: true,
        providesServices: true,
      });
      if (member?.staff === undefined) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      // Staff of an unbookable branch are hidden on the salon page; their sheet is too (§5.17).
      const branches = await bookableBranches(salonId);
      if (
        deps.branches !== undefined &&
        branches.length > 0 &&
        !branches.some((b) => b.id === member.branchId)
      ) {
        throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      }
      const today = localDateOf(now(), await settings.get('timezone'));
      const [onLeave, latest] = await Promise.all([
        leavesToday(salonId, today),
        latestReviews(language, salonId, memberId),
      ]);
      const wanted = member.staff.serviceIds;
      // Only services of the member's own branch: those are the ones bookable with them (§5.18).
      const offered = await salonServices.findMany({
        salonId,
        active: true,
        _id: { $in: wanted },
        ...(member.branchId === undefined ? {} : { branchId: member.branchId }),
      });
      const entries =
        offered.length === 0
          ? []
          : await catalog.findMany({
              _id: { $in: offered.map((s) => s.catalogServiceId) },
            });
      return {
        ...summary(member, statusOf(member, today, onLeave)),
        role: member.role,
        rating: member.staff.rating,
        bio: member.staff.bio ?? null,
        yearsOfExperience: member.staff.yearsOfExperience ?? null,
        customersCount: member.staff.customersCount,
        workingDays: member.staff.workingDays.map((d) => ({
          day: d.day,
          start: d.start ?? null,
          end: d.end ?? null,
        })),
        services: offered.flatMap((s) => {
          const entry = entries.find((c) => c.id === s.catalogServiceId);
          return entry === undefined
            ? []
            : [
                {
                  id: s.id,
                  catalogServiceId: s.catalogServiceId,
                  name: entry.name[language],
                  brideOnly: isBrideOnly(s.brideOnly),
                },
              ];
        }),
        reviews: { avg: member.staff.rating.avg, count: member.staff.rating.count, latest },
      };
    },
  };
};
