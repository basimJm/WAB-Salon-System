import type { BranchesService } from '../branches/branches.service';
import { MAIN_BRANCH_MIRRORED_FIELDS, type MainBranches } from '../branches/mainBranch';
import { ERROR_CODES } from '../../constants/errorCodes';
import type { SalonState } from '../../constants/salon';
import type { SalonRaw } from '../../models/salon.model';
import type { StorageProvider } from '../../providers/storage';
import type { AreasRepository, CitiesRepository } from '../../repositories/locations.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import { toObjectId } from '../../utils/database/ids';
import type { UploadRaw } from '../../models/upload.model';
import type { Entity } from '../../utils/database/plain';
import { ForbiddenError, NotFoundError } from '../../utils/errors';
import { assertPlace } from '../locations/place';
import type { UploadVerifier } from '../uploads/uploads.service';
import type { SalonStateService } from './salonState.service';

export interface SalonProfile {
  readonly id: string;
  readonly name: string;
  readonly gender: SalonRaw['gender'];
  readonly state: SalonState;
  readonly description: string | null;
  readonly coverUrl: string | null;
  readonly profileUrl: string | null;
  readonly coverKey: string | null;
  readonly profileKey: string | null;
  readonly location: { latitude: number; longitude: number } | null;
  readonly locationText: string | null;
  readonly cityId: string | null;
  readonly areaId: string | null;
  readonly phone: string | null;
  readonly whatsapp: string | null;
  readonly completeness: { missing: string[]; isComplete: boolean };
  readonly rating: { avg: number; count: number };
}

/** Fields the owner or a manager may change; absent = unchanged, `null` clears an optional one. */
export interface ProfilePatch {
  readonly name?: string | undefined;
  readonly description?: string | null | undefined;
  readonly coverKey?: string | null | undefined;
  readonly profileKey?: string | null | undefined;
  readonly location?: { latitude: number; longitude: number } | null | undefined;
  readonly locationText?: string | null | undefined;
  readonly cityId?: string | undefined;
  readonly areaId?: string | undefined;
  readonly phone?: string | undefined;
  readonly whatsapp?: string | null | undefined;
}

export interface SalonProfileService {
  get(salonId: string): Promise<SalonProfile>;
  /** `acceptUpload` replaces the default "uploaded by this salon" check (an admin edits for the salon). */
  /**
   * `options.scope` = the caller's branch: a branch member edits only that branch's address and
   * contacts (`SALON_PROFILE_MANAGE`, §6); salon-wide fields stay with the owner.
   */
  update(
    salonId: string,
    patch: ProfilePatch,
    options?: {
      acceptUpload?: (upload: Entity<UploadRaw>) => boolean;
      scope?: string | undefined;
    },
  ): Promise<SalonProfile>;
}

export interface SalonProfileDeps {
  readonly salons: SalonsRepository;
  readonly cities: Pick<CitiesRepository, 'findOne'>;
  readonly areas: Pick<AreasRepository, 'findOne'>;
  readonly storage: Pick<StorageProvider, 'getPublicUrl'>;
  /** Recomputes completeness after every write (may promote the salon to LIVE). */
  readonly state: Pick<SalonStateService, 'recompute'>;
  /** When set, images must be files this salon uploaded and confirmed. */
  readonly uploads?: UploadVerifier;
  /** Salon-level endpoint: address and contacts are copied to the main branch (§5.16). */
  readonly mainBranches?: Pick<MainBranches, 'mirror'>;
  /** Edits a branch member's own branch (address/contacts). */
  readonly branchEditor?: Pick<BranchesService, 'update'>;
}

export const createSalonProfileService = ({
  salons,
  cities,
  areas,
  storage,
  state,
  uploads,
  mainBranches,
  branchEditor,
}: SalonProfileDeps): SalonProfileService => {
  /** A branch member's edit: only the branch's address and contacts, applied to their branch. */
  const updateBranch = async (
    salonId: string,
    branchId: string,
    patch: ProfilePatch,
  ): Promise<SalonProfile> => {
    const salonWide = [patch.name, patch.description, patch.coverKey, patch.profileKey];
    if (salonWide.some((value) => value !== undefined) || branchEditor === undefined) {
      throw new ForbiddenError({ code: ERROR_CODES.OWNER_REQUIRED });
    }
    // Clearing the pin or the address is not allowed on a branch: both are required there.
    await branchEditor.update(salonId, branchId, {
      ...(patch.location == null ? {} : { location: patch.location }),
      ...(patch.locationText == null ? {} : { locationText: patch.locationText }),
      ...(patch.cityId === undefined ? {} : { cityId: patch.cityId }),
      ...(patch.areaId === undefined ? {} : { areaId: patch.areaId }),
      ...(patch.phone === undefined ? {} : { phone: patch.phone }),
      ...(patch.whatsapp === undefined ? {} : { whatsapp: patch.whatsapp }),
    });
    return toProfile(await load(salonId));
  };

  const toProfile = (s: Entity<SalonRaw>): SalonProfile => ({
    id: s.id,
    name: s.name,
    gender: s.gender,
    state: s.state,
    description: s.description ?? null,
    coverUrl: s.coverKey === undefined ? null : storage.getPublicUrl(s.coverKey),
    profileUrl: s.profileKey === undefined ? null : storage.getPublicUrl(s.profileKey),
    coverKey: s.coverKey ?? null,
    profileKey: s.profileKey ?? null,
    location:
      s.location === undefined
        ? null
        : { latitude: s.location.coordinates[1] ?? 0, longitude: s.location.coordinates[0] ?? 0 },
    locationText: s.locationText ?? null,
    cityId: s.cityId ?? null,
    areaId: s.areaId ?? null,
    phone: s.phone ?? null,
    whatsapp: s.whatsapp ?? null,
    completeness: s.completeness,
    rating: s.rating,
  });

  const load = async (salonId: string): Promise<Entity<SalonRaw>> => {
    const salon = await salons.findById(salonId);
    if (salon === null) throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
    return salon;
  };

  return {
    async get(salonId) {
      return toProfile(await load(salonId));
    },

    async update(salonId, patch, options) {
      if (options?.scope !== undefined) return updateBranch(salonId, options.scope, patch);
      const current = await load(salonId);
      // A new area must belong to the (new or current) city.
      const cityId = patch.cityId ?? (patch.areaId === undefined ? undefined : current.cityId);
      await assertPlace({ cities, areas }, 'body', cityId, patch.areaId);

      for (const [purpose, key, current_] of [
        ['SALON_COVER', patch.coverKey, current.coverKey],
        ['SALON_PROFILE', patch.profileKey, current.profileKey],
      ] as const) {
        if (typeof key === 'string' && key !== current_) {
          await uploads?.assertConfirmed({
            keys: [key],
            purpose,
            field: purpose === 'SALON_COVER' ? 'body.coverKey' : 'body.profileKey',
            accept: options?.acceptUpload ?? ((upload) => upload.salonId === salonId),
          });
        }
      }

      const set: Record<string, unknown> = {};
      const unset: string[] = [];
      const put = (field: string, value: unknown): void => {
        if (value === null) unset.push(field);
        else if (value !== undefined) set[field] = value;
      };
      if (patch.name !== undefined) {
        set['name'] = patch.name;
      }
      put('description', patch.description);
      put('coverKey', patch.coverKey);
      put('profileKey', patch.profileKey);
      put('locationText', patch.locationText);
      put('phone', patch.phone);
      put('whatsapp', patch.whatsapp);
      if (patch.cityId !== undefined) set['cityId'] = toObjectId(patch.cityId);
      if (patch.areaId !== undefined) set['areaId'] = toObjectId(patch.areaId);
      if (patch.location === null) unset.push('location');
      else if (patch.location !== undefined) {
        set['location'] = {
          type: 'Point',
          coordinates: [patch.location.longitude, patch.location.latitude],
        };
      }
      if (patch.name !== undefined || patch.locationText !== undefined) {
        set['searchText'] = [
          patch.name ?? current.name,
          patch.locationText ?? current.locationText ?? '',
        ]
          .join(' ')
          .trim();
      }
      const updated = await salons.patch(salonId, { set, unset });
      if (updated === null) throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
      const mirrored = (field: string): field is (typeof MAIN_BRANCH_MIRRORED_FIELDS)[number] =>
        (MAIN_BRANCH_MIRRORED_FIELDS as readonly string[]).includes(field);
      const branchSet = Object.fromEntries(
        Object.entries(set).filter(([field]) => mirrored(field)),
      );
      const branchUnset = unset.filter(mirrored);
      if (Object.keys(branchSet).length > 0 || branchUnset.length > 0) {
        await mainBranches?.mirror(salonId, branchSet, branchUnset);
      }
      const status = await state.recompute(salonId);
      return toProfile({
        ...updated,
        state: status.state,
        completeness: { missing: [...status.missing], isComplete: status.isComplete },
      });
    },
  };
};
