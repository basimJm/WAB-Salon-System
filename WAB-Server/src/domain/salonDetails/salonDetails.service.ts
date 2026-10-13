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
import { noFavorites, type FavoriteLookup } from '../search/search.service';

export interface StaffSummary {
  readonly id: string;
  readonly firstName: string;
  readonly photoUrl: string | null;
  readonly status: StaffStatus;
}

export interface StaffDetails extends StaffSummary {
  readonly role: MemberRaw['role'];
  readonly rating: { avg: number; count: number };
  readonly bio: string | null;
  readonly yearsOfExperience: number | null;
  readonly customersCount: number;
  readonly workingDays: { day: string; start: string | null; end: string | null }[];
  readonly services: { catalogServiceId: string; name: string }[];
}

export interface SalonDetails {
  readonly id: string;
  readonly name: string;
  readonly gender: SalonRaw['gender'];
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
  readonly services: {
    id: string;
    catalogServiceId: string;
    name: string;
    imageUrl: string;
    description: string | null;
    price: string;
    durationMinutes: number;
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
}

export interface SalonDetailsService {
  get(input: {
    salonId: string;
    language: Language;
    customerId?: string | undefined;
  }): Promise<SalonDetails>;
  staff(input: { salonId: string; memberId: string; language: Language }): Promise<StaffDetails>;
}

export interface SalonDetailsDeps {
  readonly salons: Pick<SalonsRepository, 'findById'>;
  readonly members: Pick<MembersRepository, 'findMany' | 'findOne'>;
  readonly salonServices: Pick<SalonServicesRepository, 'findMany'>;
  readonly catalog: Pick<CatalogServicesRepository, 'findMany'>;
  readonly gallery: Pick<GalleryRepository, 'forSalon'>;
  readonly closures: Pick<ClosuresRepository, 'findMany'>;
  readonly leaves: Pick<LeavesRepository, 'findMany'>;
  readonly storage: Pick<StorageProvider, 'getPublicUrl'>;
  readonly settings: Pick<SettingsService, 'get'>;
  readonly favorites?: FavoriteLookup;
  readonly now?: () => Date;
}

export const createSalonDetailsService = (deps: SalonDetailsDeps): SalonDetailsService => {
  const { salons, members, salonServices, catalog, gallery, closures, leaves, storage, settings } =
    deps;
  const favorites = deps.favorites ?? noFavorites;
  const now = deps.now ?? ((): Date => new Date());
  const url = (key: string | undefined): string | null =>
    key === undefined ? null : storage.getPublicUrl(key);

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
  });

  return {
    async get({ salonId, language, customerId }) {
      const salon = await visible(salonId);
      const timeZone = await settings.get('timezone');
      const today = localDateOf(now(), timeZone);
      const [ranges, team, onLeave, offered, items, saved] = await Promise.all([
        closures.findMany({ salonId, to: { $gte: today } }, { from: 1 }),
        staffMembers(salonId),
        leavesToday(salonId, today),
        salonServices.findMany({ salonId, active: true }),
        gallery.forSalon(salonId),
        customerId === undefined
          ? Promise.resolve(new Set<string>())
          : favorites.among(customerId, [salonId]),
      ]);
      const entries =
        offered.length === 0
          ? []
          : await catalog.findMany({
              _id: { $in: offered.map((s) => s.catalogServiceId) },
            });
      const byId = new Map(entries.map((c) => [c.id, c]));
      const hours = todaysHours(salon.weeklySchedule, ranges, now(), timeZone);
      const [lng, lat] = salon.location?.coordinates ?? [];
      return {
        id: salon.id,
        name: salon.name,
        gender: salon.gender,
        coverUrl: url(salon.coverKey),
        profileImageUrl: url(salon.profileKey),
        description: salon.description ?? null,
        locationText: salon.locationText ?? null,
        location: lat === undefined || lng === undefined ? null : { lat, lng },
        phone: salon.phone ?? null,
        whatsapp: salon.whatsapp ?? null,
        rating: salon.rating,
        isOpenNow: hours.isOpenNow,
        todayHours:
          hours.open === null || hours.close === null
            ? null
            : { open: hours.open, close: hours.close },
        closedReason: hours.closedReason,
        weeklySchedule: salon.weeklySchedule,
        upcomingClosures: ranges.map(({ from, to, reason }) => ({ from, to, reason })),
        staff: team.map((m) => summary(m, statusOf(m, today, onLeave))),
        services: offered.flatMap((s) => {
          const entry = byId.get(s.catalogServiceId);
          if (entry === undefined) return [];
          return [
            {
              id: s.id,
              catalogServiceId: s.catalogServiceId,
              name: entry.name[language],
              imageUrl: storage.getPublicUrl(entry.imageKey),
              description: s.extraDescription ?? entry.description[language],
              price: formatJod(s.price),
              durationMinutes: s.durationMinutes,
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
      const today = localDateOf(now(), await settings.get('timezone'));
      const onLeave = await leavesToday(salonId, today);
      const wanted = member.staff.serviceIds;
      const offered = await salonServices.findMany({
        salonId,
        active: true,
        catalogServiceId: { $in: wanted },
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
        services: entries.map((c) => ({ catalogServiceId: c.id, name: c.name[language] })),
      };
    },
  };
};
