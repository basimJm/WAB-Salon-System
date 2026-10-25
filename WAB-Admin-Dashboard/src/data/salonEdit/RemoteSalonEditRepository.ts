import { z } from 'zod';
import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import { OBJECT_ID, branchQuerySchema } from '@/data/api/objectId';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { BranchScope, SalonEditRepository } from '@/domain/salonEdit/salonEdit';

const O = OPERATIONS;
const KEY = z
  .string()
  .max(1024)
  .regex(/^[A-Za-z0-9_-]+(\/[A-Za-z0-9._-]+)*$/);
const E164 = z.string().regex(/^\+[1-9][0-9]{6,14}$/);
const REASON = z.string().min(1).max(1000);
const LATITUDE_LIMIT = 90;
const LONGITUDE_LIMIT = 180;
/** The generated profile body is an intersection that cannot be extended, so it is restated with the id override. */
const profileBody = () =>
  z.object({
    name: z.string().min(1).max(80).optional(),
    description: z.string().max(1000).nullable().optional(),
    coverKey: KEY.nullable().optional(),
    profileKey: KEY.nullable().optional(),
    location: z
      .object({
        latitude: z.number().min(-LATITUDE_LIMIT).max(LATITUDE_LIMIT),
        longitude: z.number().min(-LONGITUDE_LIMIT).max(LONGITUDE_LIMIT),
      })
      .nullable()
      .optional(),
    locationText: z.string().max(300).nullable().optional(),
    cityId: OBJECT_ID.optional(),
    areaId: OBJECT_ID.optional(),
    phone: E164.optional(),
    whatsapp: E164.nullable().optional(),
    reason: REASON,
  });
const E = {
  profile: defineEndpoint(O.getSalonsByIdProfile, { data: dto.getSalonsByIdProfileDataSchema }),
  patchProfile: defineEndpoint(O.patchSalonsByIdProfile, {
    data: dto.patchSalonsByIdProfileDataSchema,
    body: profileBody,
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
    body: () =>
      dto.putSalonsByIdGalleryOrderBodySchema().extend({ ids: z.array(OBJECT_ID).max(100) }),
  }),
  hours: defineEndpoint(O.getSalonsByIdHours, {
    data: dto.getSalonsByIdHoursDataSchema,
    query: branchQuerySchema,
  }),
  putHours: defineEndpoint(O.putSalonsByIdHours, {
    query: branchQuerySchema,
    data: dto.putSalonsByIdHoursDataSchema,
    body: dto.putSalonsByIdHoursBodySchema,
  }),
  previewHours: defineEndpoint(O.postSalonsByIdHoursPreview, {
    query: branchQuerySchema,
    data: dto.postSalonsByIdHoursPreviewDataSchema,
    body: dto.postSalonsByIdHoursPreviewBodySchema,
  }),
  previewClosure: defineEndpoint(O.postSalonsByIdClosuresPreview, {
    query: branchQuerySchema,
    data: dto.postSalonsByIdClosuresPreviewDataSchema,
    body: dto.postSalonsByIdClosuresPreviewBodySchema,
  }),
  addClosure: defineEndpoint(O.postSalonsByIdClosures, {
    query: branchQuerySchema,
    data: dto.postSalonsByIdClosuresDataSchema,
    body: dto.postSalonsByIdClosuresBodySchema,
  }),
  patchClosure: defineEndpoint(O.patchSalonsByIdClosuresByClosureId, {
    query: branchQuerySchema,
    data: dto.patchSalonsByIdClosuresByClosureIdDataSchema,
    body: dto.patchSalonsByIdClosuresByClosureIdBodySchema,
  }),
  removeClosure: defineEndpoint(O.postSalonsByIdClosuresByClosureIdRemove, {
    query: branchQuerySchema,
    data: dto.postSalonsByIdClosuresByClosureIdRemoveDataSchema,
    body: dto.postSalonsByIdClosuresByClosureIdRemoveBodySchema,
  }),
  services: defineEndpoint(O.getSalonsByIdServices, {
    data: dto.getSalonsByIdServicesDataSchema,
    query: () => dto.getSalonsByIdServicesQuerySchema().extend({ branchId: OBJECT_ID.optional() }),
  }),
  addService: defineEndpoint(O.postSalonsByIdServices, {
    query: branchQuerySchema,
    data: dto.postSalonsByIdServicesDataSchema,
    body: () => dto.postSalonsByIdServicesBodySchema().extend({ catalogServiceId: OBJECT_ID }),
  }),
  patchService: defineEndpoint(O.patchSalonsByIdServicesByServiceId, {
    query: branchQuerySchema,
    data: dto.patchSalonsByIdServicesByServiceIdDataSchema,
    body: dto.patchSalonsByIdServicesByServiceIdBodySchema,
  }),
  moveMember: defineEndpoint(O.postSalonsByIdMembersByMemberIdBranch, {
    data: dto.postSalonsByIdMembersByMemberIdBranchDataSchema,
    body: () =>
      dto.postSalonsByIdMembersByMemberIdBranchBodySchema().extend({ branchId: OBJECT_ID }),
  }),
  staff: defineEndpoint(O.getSalonsByIdMembersByMemberIdStaff, {
    data: dto.getSalonsByIdMembersByMemberIdStaffDataSchema,
  }),
  putStaff: defineEndpoint(O.putSalonsByIdMembersByMemberIdStaff, {
    data: dto.putSalonsByIdMembersByMemberIdStaffDataSchema,
    body: () =>
      dto.putSalonsByIdMembersByMemberIdStaffBodySchema().extend({
        serviceIds: z.array(OBJECT_ID).max(200),
      }),
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
