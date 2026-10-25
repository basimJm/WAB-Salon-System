import { OPEN_BRANCH_STATUSES, type BranchOfflineActorType } from '../../constants/branches';
import { ERROR_CODES, errorMessageKey } from '../../constants/errorCodes';
import type { LocalizedName } from '../../constants/referenceData';
import type { BranchRaw } from '../../models/branch.model';
import type { ScheduleDay } from '../../models/salon.model';
import type { BookingsRepository } from '../../repositories/bookings.repository';
import type { BranchesRepository } from '../../repositories/branches.repository';
import type { AreasRepository, CitiesRepository } from '../../repositories/locations.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import { toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
  type ErrorDetail,
} from '../../utils/errors';
import type { Logger } from '../../utils/logger';
import { assertPlace } from '../locations/place';
import type { SalonStateNotifier, SalonStateService } from '../salons/salonState.service';
import type { SettingsService } from '../settings/settings.service';
import { MAIN_BRANCH_MIRRORED_FIELDS } from './mainBranch';

/** A branch as the merchant and admin apps see it (§3.3a). */
export interface BranchView {
  readonly id: string;
  readonly name: LocalizedName;
  readonly isMain: boolean;
  readonly status: BranchRaw['status'];
  readonly location: { latitude: number; longitude: number } | null;
  readonly locationText: string | null;
  readonly cityId: string | null;
  readonly areaId: string | null;
  readonly phone: string | null;
  readonly whatsapp: string | null;
  readonly weeklySchedule: readonly ScheduleDay[];
  readonly offline: { reason: string; at: Date } | null;
  readonly completeness: { missing: readonly string[]; isComplete: boolean };
}

export interface BranchInput {
  readonly name: LocalizedName;
  readonly location: { latitude: number; longitude: number };
  readonly locationText: string;
  readonly cityId: string;
  readonly areaId: string;
  readonly phone: string;
  readonly whatsapp?: string | undefined;
}

/** `null` clears an optional field (whatsapp). */
export interface BranchPatch {
  readonly name?: LocalizedName | undefined;
  readonly location?: { latitude: number; longitude: number } | undefined;
  readonly locationText?: string | undefined;
  readonly cityId?: string | undefined;
  readonly areaId?: string | undefined;
  readonly phone?: string | undefined;
  readonly whatsapp?: string | null | undefined;
}

/** Who acts: the salon owner (merchant app) or an admin (admin panel). */
export interface BranchActor {
  readonly type: BranchOfflineActorType;
  readonly id: string;
}

export interface BranchesService {
  list(salonId: string): Promise<BranchView[]>;
  get(salonId: string, branchId: string): Promise<BranchView>;
  create(salonId: string, input: BranchInput): Promise<BranchView>;
  update(salonId: string, branchId: string, patch: BranchPatch): Promise<BranchView>;
  /** Makes another open branch the main one (closing the main branch needs this first). */
  setMain(salonId: string, branchId: string): Promise<BranchView>;
  setOffline(input: Scoped & { reason: string; actor: BranchActor }): Promise<BranchView>;
  setOnline(input: Scoped & { actor: BranchActor }): Promise<BranchView>;
  /** Closes for good; refused while upcoming bookings exist, for the main or the last branch. */
  close(input: Scoped & { actor: BranchActor }): Promise<BranchView>;
}

interface Scoped {
  readonly salonId: string;
  readonly branchId: string;
}

export interface BranchesDeps {
  readonly branches: BranchesRepository;
  readonly salons: Pick<SalonsRepository, 'findById' | 'patch'>;
  readonly cities: Pick<CitiesRepository, 'findOne'>;
  readonly areas: Pick<AreasRepository, 'findOne'>;
  readonly bookings: Pick<BookingsRepository, 'upcomingForBranch'>;
  readonly settings: Pick<SettingsService, 'get'>;
  readonly state: Pick<SalonStateService, 'recompute'>;
  readonly notifier?: SalonStateNotifier;
  readonly logger?: Logger;
  readonly now?: () => Date;
}

const point = (location: {
  latitude: number;
  longitude: number;
}): { type: 'Point'; coordinates: [number, number] } => ({
  type: 'Point',
  coordinates: [location.longitude, location.latitude],
});

export const toBranchView = (branch: Entity<BranchRaw>): BranchView => {
  const [longitude, latitude] = branch.location?.coordinates ?? [];
  return {
    id: branch.id,
    name: branch.name,
    isMain: branch.isMain,
    status: branch.status,
    location: latitude === undefined || longitude === undefined ? null : { latitude, longitude },
    locationText: branch.locationText ?? null,
    cityId: branch.cityId ?? null,
    areaId: branch.areaId ?? null,
    phone: branch.phone ?? null,
    whatsapp: branch.whatsapp ?? null,
    weeklySchedule: branch.weeklySchedule,
    offline:
      branch.offline === undefined
        ? null
        : { reason: branch.offline.reason, at: branch.offline.at },
    completeness: branch.completeness,
  };
};

export const createBranchesService = (deps: BranchesDeps): BranchesService => {
  const { branches, salons, settings, state, notifier, logger } = deps;
  const now = deps.now ?? ((): Date => new Date());
  const places = { cities: deps.cities, areas: deps.areas };

  const find = async (salonId: string, branchId: string): Promise<Entity<BranchRaw>> => {
    const branch = await branches.findInSalon(salonId, branchId);
    if (branch === null) throw new NotFoundError({ code: ERROR_CODES.BRANCH_NOT_FOUND });
    return branch;
  };

  /** Recomputes after a change, then returns the branch as stored. */
  const settle = async (salonId: string, branchId: string): Promise<BranchView> => {
    await state.recompute(salonId);
    return toBranchView(await find(salonId, branchId));
  };

  const countOpen = async (salonId: string): Promise<void> => {
    await salons.patch(salonId, { set: { branchCount: await branches.countOpen(salonId) } });
  };

  /**
   * The salon document still carries the main branch's address, contacts and hours for the
   * readers that have not moved to branches yet (SRV-144); keep them equal to the main branch.
   */
  const mirrorToSalon = async (branch: Entity<BranchRaw>): Promise<void> => {
    if (!branch.isMain) return;
    const set: Record<string, unknown> = {};
    const unset: string[] = [];
    for (const field of MAIN_BRANCH_MIRRORED_FIELDS) {
      const value = branch[field];
      if (value === undefined) unset.push(field);
      else
        // Entity ids are strings; the salon stores city/area as ObjectIds.
        set[field] =
          typeof value === 'string' && (field === 'cityId' || field === 'areaId')
            ? toObjectId(value)
            : value;
    }
    await salons.patch(branch.salonId, { set, unset });
  };

  const tell = async (
    branch: Entity<BranchRaw>,
    event: 'branch.offline' | 'branch.online',
    reason?: string,
  ): Promise<void> => {
    try {
      await notifier?.changed({
        salonId: branch.salonId,
        event,
        branch: { id: branch.id, name: branch.name },
        ...(reason === undefined ? {} : { reason }),
      });
    } catch (error) {
      logger?.error({ err: error, branchId: branch.id, event }, 'branch notification failed');
    }
  };

  const refuseUpcoming = async (branchId: string): Promise<void> => {
    const upcoming = await deps.bookings.upcomingForBranch(branchId, now());
    if (upcoming.length === 0) return;
    throw new ConflictError({
      code: ERROR_CODES.BRANCH_HAS_UPCOMING_BOOKINGS,
      details: upcoming.map((booking): ErrorDetail => ({
        field: booking.id,
        code: ERROR_CODES.BRANCH_HAS_UPCOMING_BOOKINGS,
        messageKey: errorMessageKey(ERROR_CODES.BRANCH_HAS_UPCOMING_BOOKINGS),
      })),
    });
  };

  return {
    async list(salonId) {
      return (await branches.forSalon(salonId)).map(toBranchView);
    },

    async get(salonId, branchId) {
      return toBranchView(await find(salonId, branchId));
    },

    async create(salonId, input) {
      const salon = await salons.findById(salonId);
      if (salon === null) throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
      const open = await branches.countOpen(salonId);
      if (open >= (await settings.get('salon.maxBranches'))) {
        throw new BusinessRuleError({ code: ERROR_CODES.BRANCH_LIMIT_REACHED });
      }
      await assertPlace(places, 'body', input.cityId, input.areaId);
      const created = await branches.create({
        salonId: toObjectId(salonId),
        name: input.name,
        // The first branch of a salon is its main branch.
        isMain: open === 0,
        status: 'ACTIVE',
        location: point(input.location),
        locationText: input.locationText,
        cityId: toObjectId(input.cityId),
        areaId: toObjectId(input.areaId),
        phone: input.phone,
        ...(input.whatsapp === undefined ? {} : { whatsapp: input.whatsapp }),
      });
      if (created.isMain)
        await salons.patch(salonId, { set: { mainBranchId: toObjectId(created.id) } });
      await countOpen(salonId);
      return settle(salonId, created.id);
    },

    async update(salonId, branchId, patch) {
      const current = await find(salonId, branchId);
      if (current.status === 'CLOSED')
        throw new BusinessRuleError({ code: ERROR_CODES.INVALID_TRANSITION });
      await assertPlace(places, 'body', patch.cityId, patch.areaId);
      const set: Record<string, unknown> = {};
      const unset: string[] = [];
      if (patch.name !== undefined) set['name'] = patch.name;
      if (patch.location !== undefined) set['location'] = point(patch.location);
      if (patch.locationText !== undefined) set['locationText'] = patch.locationText;
      if (patch.cityId !== undefined) set['cityId'] = toObjectId(patch.cityId);
      if (patch.areaId !== undefined) set['areaId'] = toObjectId(patch.areaId);
      if (patch.phone !== undefined) set['phone'] = patch.phone;
      if (patch.whatsapp === null) unset.push('whatsapp');
      else if (patch.whatsapp !== undefined) set['whatsapp'] = patch.whatsapp;
      const updated = await branches.patch(branchId, { set, unset });
      if (updated !== null) await mirrorToSalon(updated);
      return settle(salonId, branchId);
    },

    async setMain(salonId, branchId) {
      const next = await find(salonId, branchId);
      if (next.status === 'CLOSED')
        throw new BusinessRuleError({ code: ERROR_CODES.INVALID_TRANSITION });
      if (next.isMain) return toBranchView(next);
      const previous = await branches.main(salonId);
      // One main branch per salon (unique index): clear the old flag before setting the new one.
      if (previous !== null) await branches.patch(previous.id, { set: { isMain: false } });
      const promoted = await branches.patch(branchId, { set: { isMain: true } });
      await salons.patch(salonId, { set: { mainBranchId: toObjectId(branchId) } });
      if (promoted !== null) await mirrorToSalon(promoted);
      return settle(salonId, branchId);
    },

    async setOffline({ salonId, branchId, reason, actor }) {
      const branch = await find(salonId, branchId);
      if (branch.status !== 'ACTIVE')
        throw new BusinessRuleError({ code: ERROR_CODES.INVALID_TRANSITION });
      await branches.patch(branchId, {
        set: {
          status: 'OFFLINE',
          offline: { reason, at: now(), actorType: actor.type, by: toObjectId(actor.id) },
        },
      });
      await tell(branch, 'branch.offline', reason);
      return settle(salonId, branchId);
    },

    async setOnline({ salonId, branchId }) {
      const branch = await find(salonId, branchId);
      if (branch.status !== 'OFFLINE')
        throw new BusinessRuleError({ code: ERROR_CODES.INVALID_TRANSITION });
      await branches.patch(branchId, { set: { status: 'ACTIVE' }, unset: ['offline'] });
      await tell(branch, 'branch.online');
      return settle(salonId, branchId);
    },

    async close({ salonId, branchId, actor }) {
      const branch = await find(salonId, branchId);
      if (!(OPEN_BRANCH_STATUSES as readonly string[]).includes(branch.status)) {
        throw new BusinessRuleError({ code: ERROR_CODES.INVALID_TRANSITION });
      }
      if ((await branches.countOpen(salonId)) <= 1) {
        throw new BusinessRuleError({ code: ERROR_CODES.LAST_BRANCH });
      }
      if (branch.isMain) {
        throw new BusinessRuleError({
          code: ERROR_CODES.INVALID_TRANSITION,
          details: [
            {
              field: 'isMain',
              code: ERROR_CODES.INVALID_TRANSITION,
              messageKey: errorMessageKey(ERROR_CODES.INVALID_TRANSITION),
            },
          ],
        });
      }
      await refuseUpcoming(branchId);
      await branches.patch(branchId, {
        set: { status: 'CLOSED', closedAt: now(), closedBy: toObjectId(actor.id) },
        unset: ['offline'],
      });
      await countOpen(salonId);
      return settle(salonId, branchId);
    },
  };
};
