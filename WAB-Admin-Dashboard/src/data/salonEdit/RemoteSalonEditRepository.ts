import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { SalonEditRepository } from '@/domain/salonEdit/salonEdit';

const O = OPERATIONS;
const E = {
  profile: defineEndpoint(O.getSalonsByIdProfile, { data: dto.getSalonsByIdProfileDataSchema }),
  patchProfile: defineEndpoint(O.patchSalonsByIdProfile, {
    data: dto.patchSalonsByIdProfileDataSchema,
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
  hours: defineEndpoint(O.getSalonsByIdHours, { data: dto.getSalonsByIdHoursDataSchema }),
  putHours: defineEndpoint(O.putSalonsByIdHours, {
    data: dto.putSalonsByIdHoursDataSchema,
    body: dto.putSalonsByIdHoursBodySchema,
  }),
  previewHours: defineEndpoint(O.postSalonsByIdHoursPreview, {
    data: dto.postSalonsByIdHoursPreviewDataSchema,
    body: dto.postSalonsByIdHoursPreviewBodySchema,
  }),
  previewClosure: defineEndpoint(O.postSalonsByIdClosuresPreview, {
    data: dto.postSalonsByIdClosuresPreviewDataSchema,
    body: dto.postSalonsByIdClosuresPreviewBodySchema,
  }),
  addClosure: defineEndpoint(O.postSalonsByIdClosures, {
    data: dto.postSalonsByIdClosuresDataSchema,
    body: dto.postSalonsByIdClosuresBodySchema,
  }),
  patchClosure: defineEndpoint(O.patchSalonsByIdClosuresByClosureId, {
    data: dto.patchSalonsByIdClosuresByClosureIdDataSchema,
    body: dto.patchSalonsByIdClosuresByClosureIdBodySchema,
  }),
  removeClosure: defineEndpoint(O.postSalonsByIdClosuresByClosureIdRemove, {
    data: dto.postSalonsByIdClosuresByClosureIdRemoveDataSchema,
    body: dto.postSalonsByIdClosuresByClosureIdRemoveBodySchema,
  }),
  services: defineEndpoint(O.getSalonsByIdServices, {
    data: dto.getSalonsByIdServicesDataSchema,
    query: dto.getSalonsByIdServicesQuerySchema,
  }),
  addService: defineEndpoint(O.postSalonsByIdServices, {
    data: dto.postSalonsByIdServicesDataSchema,
    body: dto.postSalonsByIdServicesBodySchema,
  }),
  patchService: defineEndpoint(O.patchSalonsByIdServicesByServiceId, {
    data: dto.patchSalonsByIdServicesByServiceIdDataSchema,
    body: dto.patchSalonsByIdServicesByServiceIdBodySchema,
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

  hours: SalonEditRepository['hours'] = async (id) =>
    (await this.api.execute(E.hours, { params: { id } })).data;

  previewHours: SalonEditRepository['previewHours'] = async (id, days) =>
    (await this.api.execute(E.previewHours, { params: { id }, body: { days: [...days] } })).data;

  saveHours: SalonEditRepository['saveHours'] = async (id, days, reason) =>
    (await this.api.execute(E.putHours, { params: { id }, body: { days: [...days], reason } }))
      .data;

  previewClosure: SalonEditRepository['previewClosure'] = async (id, range) =>
    (await this.api.execute(E.previewClosure, { params: { id }, body: range })).data;

  addClosure: SalonEditRepository['addClosure'] = async (id, input, reason) =>
    (await this.api.execute(E.addClosure, { params: { id }, body: { ...input, reason } })).data;

  updateClosure: SalonEditRepository['updateClosure'] = async (id, closureId, patch, reason) =>
    (
      await this.api.execute(E.patchClosure, {
        params: { id, closureId },
        body: { ...patch, reason },
      })
    ).data;

  removeClosure: SalonEditRepository['removeClosure'] = async (id, closureId, reason) => {
    await this.api.execute(E.removeClosure, { params: { id, closureId }, body: { reason } });
  };

  services: SalonEditRepository['services'] = async (id) =>
    (
      await this.api.execute(E.services, {
        params: { id },
        query: { pageSize: SERVICES_PAGE_SIZE },
      })
    ).data;

  addService: SalonEditRepository['addService'] = async (id, input, reason) =>
    (await this.api.execute(E.addService, { params: { id }, body: { ...input, reason } })).data;

  updateService: SalonEditRepository['updateService'] = async (id, serviceId, patch, reason) =>
    (
      await this.api.execute(E.patchService, {
        params: { id, serviceId },
        body: { ...patch, reason },
      })
    ).data;

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
