import { ERROR_CODES, errorMessageKey } from '../../constants/errorCodes';
import type { CatalogRequestStatus } from '../../constants/salonServices';
import type { CatalogRequestRaw } from '../../models/catalogRequest.model';
import type { CatalogServicesRepository } from '../../repositories/catalog.repository';
import type { CatalogRequestsRepository } from '../../repositories/catalogRequests.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import { toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import {
  BusinessRuleError,
  NotFoundError,
  ValidationError,
  type ErrorDetail,
} from '../../utils/errors';
import type { Logger } from '../../utils/logger';
import type { PaginationMeta, PaginationParams } from '../../utils/pagination';
import type { AuditWriter } from '../audit/audit.service';
import type { AdminActor } from '../auth/accountLifecycle.service';
import type { UploadVerifier } from '../uploads/uploads.service';

export interface CatalogRequestView {
  readonly id: string;
  readonly salonId: string;
  readonly salonName: string | null;
  readonly name: string;
  readonly description: string;
  readonly imageKey: string | null;
  readonly status: CatalogRequestStatus;
  readonly adminNote: string | null;
  readonly catalogServiceId: string | null;
  readonly createdAt: Date;
}

export interface LocalizedText {
  readonly ar: string;
  readonly en: string;
}

export interface CatalogRequestNotifier {
  decided(input: {
    salonId: string;
    requestId: string;
    decision: 'approved' | 'rejected';
    note: string;
  }): Promise<void>;
}

export interface CatalogRequestsService {
  create(input: {
    salonId: string;
    memberId: string;
    name: string;
    description: string;
    imageKey?: string | undefined;
  }): Promise<CatalogRequestView>;
  listForSalon(input: {
    salonId: string;
    params: PaginationParams;
  }): Promise<{ items: CatalogRequestView[]; meta: PaginationMeta }>;
  /** Admin queue (pending by default, oldest first). */
  listForAdmin(input: {
    status?: CatalogRequestStatus | undefined;
    params: PaginationParams;
  }): Promise<{ items: CatalogRequestView[]; meta: PaginationMeta }>;
  /**
   * Approve by creating a catalog service (`name` + `description`), or by mapping the request to
   * an existing active catalog service of the salon's gender (`catalogServiceId`, SRV-125).
   */
  approve(
    input: {
      id: string;
      reason: string;
      actor: AdminActor;
    } & (
      | {
          catalogServiceId?: undefined;
          name: LocalizedText;
          description: LocalizedText;
          imageKey?: string | undefined;
          sortOrder: number;
        }
      | { catalogServiceId: string }
    ),
  ): Promise<CatalogRequestView>;
  reject(input: { id: string; reason: string; actor: AdminActor }): Promise<CatalogRequestView>;
}

export interface CatalogRequestsDeps {
  readonly requests: CatalogRequestsRepository;
  readonly salons: Pick<SalonsRepository, 'findById' | 'findMany'>;
  readonly catalog: Pick<CatalogServicesRepository, 'create' | 'findById'>;
  readonly uploads: UploadVerifier;
  readonly audit: AuditWriter;
  readonly notifier: CatalogRequestNotifier;
  readonly logger: Logger;
  readonly now?: () => Date;
}

const invalid = (field: string): ValidationError =>
  new ValidationError({
    code: ERROR_CODES.VALIDATION_ERROR,
    details: [
      {
        field,
        code: ERROR_CODES.VALIDATION_ERROR,
        messageKey: errorMessageKey(ERROR_CODES.VALIDATION_ERROR),
      } satisfies ErrorDetail,
    ],
  });

export const createCatalogRequestsService = (deps: CatalogRequestsDeps): CatalogRequestsService => {
  const { requests, salons, catalog, uploads, audit, notifier, logger } = deps;
  const now = deps.now ?? ((): Date => new Date());

  const view = (
    r: Entity<CatalogRequestRaw>,
    salonName: string | null = null,
  ): CatalogRequestView => ({
    id: r.id,
    salonId: r.salonId,
    salonName,
    name: r.name,
    description: r.description,
    imageKey: r.imageKey ?? null,
    status: r.status,
    adminNote: r.adminNote ?? null,
    catalogServiceId: r.catalogServiceId ?? null,
    createdAt: r.createdAt,
  });

  const names = async (
    items: readonly Entity<CatalogRequestRaw>[],
  ): Promise<Map<string, string>> => {
    const ids = [...new Set(items.map((r) => r.salonId))];
    const found = ids.length === 0 ? [] : await salons.findMany({ _id: { $in: ids } });
    return new Map(found.map((s) => [s.id, s.name]));
  };

  const pending = async (id: string): Promise<Entity<CatalogRequestRaw>> => {
    const request = await requests.findById(id);
    if (request === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
    if (request.status !== 'PENDING') {
      throw new BusinessRuleError({ code: ERROR_CODES.ALREADY_HANDLED });
    }
    return request;
  };

  const record = async (
    action: string,
    id: string,
    after: unknown,
    reason: string,
    actor: AdminActor,
  ): Promise<void> => {
    await audit.record({
      adminId: actor.adminId,
      action,
      entityType: 'catalogRequest',
      entityId: id,
      before: { status: 'PENDING' },
      after,
      reason,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });
  };

  const tellSalon = async (
    request: Entity<CatalogRequestRaw>,
    decision: 'approved' | 'rejected',
    note: string,
  ): Promise<void> => {
    try {
      await notifier.decided({ salonId: request.salonId, requestId: request.id, decision, note });
    } catch (error) {
      logger.error({ err: error, requestId: request.id }, 'catalog request notification failed');
    }
  };

  return {
    async create({ salonId, memberId, name, description, imageKey }) {
      if (imageKey !== undefined) {
        await uploads.assertConfirmed({
          keys: [imageKey],
          purpose: 'CATALOG_IMAGE',
          field: 'body.imageKey',
          accept: (upload) => upload.salonId === salonId,
        });
      }
      const created = await requests.create({
        salonId: toObjectId(salonId),
        requestedByMemberId: toObjectId(memberId),
        name,
        description,
        ...(imageKey === undefined ? {} : { imageKey }),
        status: 'PENDING',
      });
      return view(created);
    },

    async listForSalon({ salonId, params }) {
      const page = await requests.findPage({ salonId }, params, { createdAt: -1 });
      return { items: page.items.map((r) => view(r)), meta: page.meta };
    },

    async listForAdmin({ status = 'PENDING', params }) {
      const page = await requests.findPage({ status }, params, { createdAt: 1 });
      const byId = await names(page.items);
      return {
        items: page.items.map((r) => view(r, byId.get(r.salonId) ?? null)),
        meta: page.meta,
      };
    },

    async approve(input) {
      const { id, reason, actor } = input;
      const request = await pending(id);
      const salon = await salons.findById(request.salonId);
      if (salon === null) throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
      // Mapping: the service already exists in the catalog; nothing new is created.
      const existing =
        input.catalogServiceId === undefined
          ? null
          : await catalog.findById(input.catalogServiceId);
      if (input.catalogServiceId !== undefined) {
        if (existing?.active !== true) {
          throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
        }
        if (existing.gender !== salon.gender) {
          throw new BusinessRuleError({ code: ERROR_CODES.GENDER_MISMATCH });
        }
      }
      const finalImage =
        input.catalogServiceId === undefined ? (input.imageKey ?? request.imageKey) : undefined;
      if (input.catalogServiceId === undefined) {
        if (finalImage === undefined) throw invalid('body.imageKey');
        if (input.imageKey !== undefined) {
          await uploads.assertConfirmed({
            keys: [input.imageKey],
            purpose: 'CATALOG_IMAGE',
            field: 'body.imageKey',
            accept: (upload) => upload.ownerType === 'ADMIN',
          });
        }
      }
      // Claim first so two admins cannot both approve; undone if the catalog entry cannot be made.
      const claimed = await requests.decide(id, {
        status: 'APPROVED',
        adminNote: reason,
        decidedBy: toObjectId(actor.adminId),
        decidedAt: now(),
      });
      if (claimed === null) throw new BusinessRuleError({ code: ERROR_CODES.ALREADY_HANDLED });
      let serviceId: string;
      if (existing !== null) {
        serviceId = existing.id;
      } else if (input.catalogServiceId === undefined && finalImage !== undefined) {
        try {
          const created = await catalog.create({
            name: input.name,
            description: input.description,
            imageKey: finalImage,
            gender: salon.gender,
            active: true,
            sortOrder: input.sortOrder,
          });
          serviceId = created.id;
        } catch (error) {
          await requests.updateById(id, { status: 'PENDING' });
          throw error;
        }
      } else {
        throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      }
      const done =
        (await requests.updateById(id, { catalogServiceId: toObjectId(serviceId) })) ?? claimed;
      await record(
        'CATALOG_REQUEST_APPROVE',
        id,
        { status: 'APPROVED', catalogServiceId: serviceId, mapped: existing !== null },
        reason,
        actor,
      );
      await tellSalon(done, 'approved', reason);
      return view(done);
    },

    async reject({ id, reason, actor }) {
      await pending(id);
      const rejected = await requests.decide(id, {
        status: 'REJECTED',
        adminNote: reason,
        decidedBy: toObjectId(actor.adminId),
        decidedAt: now(),
      });
      if (rejected === null) throw new BusinessRuleError({ code: ERROR_CODES.ALREADY_HANDLED });
      await record('CATALOG_REQUEST_REJECT', id, { status: 'REJECTED' }, reason, actor);
      await tellSalon(rejected, 'rejected', reason);
      return view(rejected);
    },
  };
};
