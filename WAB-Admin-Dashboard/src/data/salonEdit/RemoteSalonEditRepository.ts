import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint, optionalQuery } from '@/data/api/endpoint';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { BranchScope, SalonEditRepository } from '@/domain/salonEdit/salonEdit';

const O = OPERATIONS;
/**
 * Admin contract 1.12.0 still lists `gender` on the salon-edit profile while the server's profile service now
 * answers `businessType` + `audience` (SRV-174): read it without `gender`, type and audience come from the salon.
 */
const profileData = () => dto.getSalonsByIdProfileDataSchema().omit({ gender: true });
const patchedProfileData = () => dto.patchSalonsByIdProfileDataSchema().omit({ gender: true });
const E = {
  profile: defineEndpoint(O.getSalonsByIdProfile, { data: profileData }),
  patchProfile: defineEndpoint(O.patchSalonsByIdProfile, {
    data: patchedProfileData,
    body: dto.patchSalonsByIdProfileBodySchema,
  }),
  gallery: defineEndpoint(O.getSalonsByIdGallery, { data: dto.getSalonsByIdGalleryDataSchema }),
  addGallery: defineEndpoint(O.postSalonsByIdGallery, {
    data: dto.postSalonsByIdGalleryDataSchema,
    body: dto.postSalonsByIdGalleryBodySchema,
  }),
  removeGallery: defineEndpoint(O.postSalonsByIdGalleryByItemIdRemove, {
    data: dto.postSalonsByIdGalleryByItemIdRemoveDataSchema,
    body: dto.postSalonsByIdGalleryByItemIdRemoveBodySchema,
  }),
  orderGallery: defineEndpoint(O.putSalonsByIdGalleryOrder, {
    data: dto.putSalonsByIdGalleryOrderDataSchema,
    body: dto.putSalonsByIdGalleryOrderBodySchema,
  }),
  hours: defineEndpoint(O.getSalonsByIdHours, {
    data: dto.getSalonsByIdHoursDataSchema,
    query: optionalQuery(dto.getSalonsByIdHoursQuerySchema),
  }),
  putHours: defineEndpoint(O.putSalonsByIdHours, {
    query: optionalQuery(dto.putSalonsByIdHoursQuerySchema),
    data: dto.putSalonsByIdHoursDataSchema,
    body: dto.putSalonsByIdHoursBodySchema,
  }),
  previewHours: defineEndpoint(O.postSalonsByIdHoursPreview, {
    query: optionalQuery(dto.postSalonsByIdHoursPreviewQuerySchema),
    data: dto.postSalonsByIdHoursPreviewDataSchema,
    body: dto.postSalonsByIdHoursPreviewBodySchema,
  }),
  previewClosure: defineEndpoint(O.postSalonsByIdClosuresPreview, {
    query: optionalQuery(dto.postSalonsByIdClosuresPreviewQuerySchema),
    data: dto.postSalonsByIdClosuresPreviewDataSchema,
    body: dto.postSalonsByIdClosuresPreviewBodySchema,
  }),
  addClosure: defineEndpoint(O.postSalonsByIdClosures, {
    query: optionalQuery(dto.postSalonsByIdClosuresQuerySchema),
    data: dto.postSalonsByIdClosuresDataSchema,
    body: dto.postSalonsByIdClosuresBodySchema,
  }),
  patchClosure: defineEndpoint(O.patchSalonsByIdClosuresByClosureId, {
    query: optionalQuery(dto.patchSalonsByIdClosuresByClosureIdQuerySchema),
    data: dto.patchSalonsByIdClosuresByClosureIdDataSchema,
    body: dto.patchSalonsByIdClosuresByClosureIdBodySchema,
  }),
  removeClosure: defineEndpoint(O.postSalonsByIdClosuresByClosureIdRemove, {
    query: optionalQuery(dto.postSalonsByIdClosuresByClosureIdRemoveQuerySchema),
    data: dto.postSalonsByIdClosuresByClosureIdRemoveDataSchema,
    body: dto.postSalonsByIdClosuresByClosureIdRemoveBodySchema,
  }),
  services: defineEndpoint(O.getSalonsByIdServices, {
    data: dto.getSalonsByIdServicesDataSchema,
    query: dto.getSalonsByIdServicesQuerySchema,
  }),
  addService: defineEndpoint(O.postSalonsByIdServices, {
    query: optionalQuery(dto.postSalonsByIdServicesQuerySchema),
    data: dto.postSalonsByIdServicesDataSchema,
    body: dto.postSalonsByIdServicesBodySchema,
  }),
  patchService: defineEndpoint(O.patchSalonsByIdServicesByServiceId, {
    query: optionalQuery(dto.patchSalonsByIdServicesByServiceIdQuerySchema),
    data: dto.patchSalonsByIdServicesByServiceIdDataSchema,
    body: dto.patchSalonsByIdServicesByServiceIdBodySchema,
  }),
  moveMember: defineEndpoint(O.postSalonsByIdMembersByMemberIdBranch, {
    data: dto.postSalonsByIdMembersByMemberIdBranchDataSchema,
    body: dto.postSalonsByIdMembersByMemberIdBranchBodySchema,
  }),
  staff: defineEndpoint(O.getSalonsByIdMembersByMemberIdStaff, {
    data: dto.getSalonsByIdMembersByMemberIdStaffDataSchema,
  }),
  putStaff: defineEndpoint(O.putSalonsByIdMembersByMemberIdStaff, {
    data: dto.putSalonsByIdMembersByMemberIdStaffDataSchema,
    body: dto.putSalonsByIdMembersByMemberIdStaffBodySchema,
  }),
  policy: defineEndpoint(O.getSalonsByIdPolicy, { data: dto.getSalonsByIdPolicyDataSchema }),
  putPolicy: defineEndpoint(O.putSalonsByIdPolicy, {
    data: dto.putSalonsByIdPolicyDataSchema,
    body: dto.putSalonsByIdPolicyBodySchema,
  }),
};

const branchOf = (scope: BranchScope) => (scope.branchId ? { branchId: scope.branchId } : {});
/** Path params and the optional `?branchId=` of a branch-scoped call (no branch = the main branch). */
const at = (scope: BranchScope, extra: Record<string, string> = {}) => ({
  params: { id: scope.salonId, ...extra },
  query: branchOf(scope),
});

/** Largest page the services list accepts: a salon's whole menu in one request. */
const SERVICES_PAGE_SIZE = 100;

export class RemoteSalonEditRepository implements SalonEditRepository {
  constructor(private readonly api: ApiClient) {}

  profile: SalonEditRepository['profile'] = async (id) =>
    (await this.api.execute(E.profile, { params: { id } })).data;

  updateProfile: SalonEditRepository['updateProfile'] = async (id, patch, reason) =>
    (await this.api.execute(E.patchProfile, { params: { id }, body: { ...patch, reason } })).data;

  gallery: SalonEditRepository['gallery'] = async (id) =>
    (await this.api.execute(E.gallery, { params: { id } })).data;

  addGalleryItem: SalonEditRepository['addGalleryItem'] = async (id, item, reason) =>
    (await this.api.execute(E.addGallery, { params: { id }, body: { ...item, reason } })).data;

  removeGalleryItem: SalonEditRepository['removeGalleryItem'] = async (id, itemId, reason) => {
    await this.api.execute(E.removeGallery, { params: { id, itemId }, body: { reason } });
  };

  reorderGallery: SalonEditRepository['reorderGallery'] = async (id, ids, reason) =>
    (await this.api.execute(E.orderGallery, { params: { id }, body: { ids: [...ids], reason } }))
      .data;

  hours: SalonEditRepository['hours'] = async (scope) =>
    (await this.api.execute(E.hours, at(scope))).data;

  previewHours: SalonEditRepository['previewHours'] = async (scope, days) =>
    (await this.api.execute(E.previewHours, { ...at(scope), body: { days: [...days] } })).data;

  saveHours: SalonEditRepository['saveHours'] = async (scope, days, reason) =>
    (await this.api.execute(E.putHours, { ...at(scope), body: { days: [...days], reason } })).data;

  previewClosure: SalonEditRepository['previewClosure'] = async (scope, range) =>
    (await this.api.execute(E.previewClosure, { ...at(scope), body: range })).data;

  addClosure: SalonEditRepository['addClosure'] = async (scope, input, reason) =>
    (await this.api.execute(E.addClosure, { ...at(scope), body: { ...input, reason } })).data;

  updateClosure: SalonEditRepository['updateClosure'] = async (scope, closureId, patch, reason) =>
    (
      await this.api.execute(E.patchClosure, {
        ...at(scope, { closureId }),
        body: { ...patch, reason },
      })
    ).data;

  removeClosure: SalonEditRepository['removeClosure'] = async (scope, closureId, reason) => {
    await this.api.execute(E.removeClosure, { ...at(scope, { closureId }), body: { reason } });
  };

  services: SalonEditRepository['services'] = async (scope) =>
    (
      await this.api.execute(E.services, {
        params: { id: scope.salonId },
        query: { pageSize: SERVICES_PAGE_SIZE, ...branchOf(scope) },
      })
    ).data;

  addService: SalonEditRepository['addService'] = async (scope, input, reason) =>
    (await this.api.execute(E.addService, { ...at(scope), body: { ...input, reason } })).data;

  updateService: SalonEditRepository['updateService'] = async (scope, serviceId, patch, reason) =>
    (
      await this.api.execute(E.patchService, {
        ...at(scope, { serviceId }),
        body: { ...patch, reason },
      })
    ).data;

  moveMember: SalonEditRepository['moveMember'] = async (id, memberId, branchId, reason) => {
    await this.api.execute(E.moveMember, { params: { id, memberId }, body: { branchId, reason } });
  };

  staff: SalonEditRepository['staff'] = async (id, memberId) =>
    (await this.api.execute(E.staff, { params: { id, memberId } })).data;

  saveStaff: SalonEditRepository['saveStaff'] = async (id, memberId, input, reason) =>
    (
      await this.api.execute(E.putStaff, {
        params: { id, memberId },
        body: {
          ...input,
          serviceIds: [...input.serviceIds],
          workingDays: [...input.workingDays],
          reason,
        },
      })
    ).data;

  policy: SalonEditRepository['policy'] = async (id) =>
    (await this.api.execute(E.policy, { params: { id } })).data;

  savePolicy: SalonEditRepository['savePolicy'] = async (id, input, reason) =>
    (
      await this.api.execute(E.putPolicy, {
        params: { id },
        body: { ...input, paymentOptions: [...input.paymentOptions], reason },
      })
    ).data;
}
