import type { Audience, BusinessType } from '../../constants/enums';
import { visibleAudiences } from '../businessTypes/rules';
import { ERROR_CODES, errorMessageKey } from '../../constants/errorCodes';
import type { PlacementStatus } from '../../constants/placements';
import type { RecommendedPlacementRaw } from '../../models/recommendedPlacement.model';
import type { PlacementsRepository } from '../../repositories/placements.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import { toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
  ValidationError,
  type ErrorDetail,
} from '../../utils/errors';
import { formatJod } from '../../utils/money';
import type { PaginationParams } from '../../utils/pagination';
import type { AuditWriter } from '../audit/audit.service';
import type { AdminActor } from '../auth/accountLifecycle.service';
import type { RecommendedLookup } from '../search/search.service';

export interface PlacementRow {
  readonly id: string;
  readonly salon: { id: string; name: string };
  /** Copied from the business when the placement was made (§3.7). */
  readonly businessType: BusinessType;
  readonly audience: Audience;
  readonly startAt: Date;
  readonly endAt: Date;
  readonly order: number;
  /** JOD decimal string. */
  readonly amountPaid: string;
  readonly note: string | null;
  readonly status: PlacementStatus;
}

export interface PlacementInput {
  readonly salonId: string;
  readonly startAt: Date;
  readonly endAt: Date;
  readonly order: number;
  /** Integer fils. */
  readonly amountPaid: number;
  readonly note?: string | undefined;
}

export interface PlacementPatch {
  readonly startAt?: Date | undefined;
  readonly endAt?: Date | undefined;
  readonly order?: number | undefined;
  readonly amountPaid?: number | undefined;
  /** `null` clears the note. */
  readonly note?: string | null | undefined;
}

export interface PlacementsService extends RecommendedLookup {
  list(input: {
    businessType?: BusinessType | undefined;
    audience?: Audience | undefined;
    status?: PlacementStatus | undefined;
    salonId?: string | undefined;
    params: PaginationParams;
  }): Promise<{ items: PlacementRow[]; total: number }>;
  create(input: { data: PlacementInput; reason: string; actor: AdminActor }): Promise<PlacementRow>;
  update(input: {
    id: string;
    patch: PlacementPatch;
    reason: string;
    actor: AdminActor;
  }): Promise<PlacementRow>;
  /** Stops a running or scheduled placement now (the remove action of A20). */
  end(input: { id: string; reason: string; actor: AdminActor }): Promise<PlacementRow>;
  /** Display order of one business type's section: `ids` in the wanted order (drag to reorder). */
  reorder(input: {
    businessType: BusinessType;
    ids: readonly string[];
    reason: string;
    actor: AdminActor;
  }): Promise<PlacementRow[]>;
}

export interface PlacementsDeps {
  readonly placements: PlacementsRepository;
  readonly salons: Pick<SalonsRepository, 'findById' | 'findMany'>;
  readonly audit: AuditWriter;
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

export const createPlacementsService = (deps: PlacementsDeps): PlacementsService => {
  const { placements, salons, audit } = deps;
  const now = deps.now ?? ((): Date => new Date());

  const statusOf = (p: Entity<RecommendedPlacementRaw>, at: Date): PlacementStatus =>
    p.endAt <= at ? 'ENDED' : p.startAt > at ? 'SCHEDULED' : 'ACTIVE';

  const rows = async (
    items: readonly Entity<RecommendedPlacementRaw>[],
  ): Promise<PlacementRow[]> => {
    const ids = [...new Set(items.map((p) => p.salonId))];
    const found = ids.length === 0 ? [] : await salons.findMany({ _id: { $in: ids } });
    const names = new Map(found.map((s) => [s.id, s.name]));
    const at = now();
    return items.map((p) => ({
      id: p.id,
      salon: { id: p.salonId, name: names.get(p.salonId) ?? '' },
      businessType: p.businessType,
      audience: p.audience,
      startAt: p.startAt,
      endAt: p.endAt,
      order: p.order,
      amountPaid: formatJod(p.amountPaid),
      note: p.note ?? null,
      status: statusOf(p, at),
    }));
  };

  const one = async (p: Entity<RecommendedPlacementRaw>): Promise<PlacementRow> => {
    const [row] = await rows([p]);
    if (row === undefined) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
    return row;
  };

  const find = async (id: string): Promise<Entity<RecommendedPlacementRaw>> => {
    const found = await placements.findById(id);
    if (found === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
    return found;
  };

  /** One salon is never shown twice at the same time. */
  const assertNoOverlap = async (
    salonId: string,
    startAt: Date,
    endAt: Date,
    exceptId?: string,
  ): Promise<void> => {
    const clash = await placements.exists({
      salonId,
      startAt: { $lt: endAt },
      endAt: { $gt: startAt },
      ...(exceptId === undefined ? {} : { _id: { $ne: exceptId } }),
    });
    if (clash) throw new ConflictError({ code: ERROR_CODES.CONFLICT });
  };

  const record = (
    action: string,
    entityId: string,
    reason: string,
    actor: AdminActor,
    before: unknown,
    after: unknown,
  ): Promise<unknown> =>
    audit.record({
      adminId: actor.adminId,
      action,
      entityType: 'recommendedPlacement',
      entityId,
      ...(before === undefined ? {} : { before }),
      after,
      reason,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

  return {
    async salonIds({ businessType, gender }, at) {
      return (await placements.activeAt(businessType, visibleAudiences(gender), at)).map(
        (p) => p.salonId,
      );
    },

    async list({ businessType, audience, status, salonId, params }) {
      const at = now();
      const page = await placements.findPage(
        {
          ...(businessType === undefined ? {} : { businessType }),
          ...(audience === undefined ? {} : { audience }),
          ...(salonId === undefined ? {} : { salonId }),
          ...(status === 'ACTIVE' ? { startAt: { $lte: at }, endAt: { $gt: at } } : {}),
          ...(status === 'SCHEDULED' ? { startAt: { $gt: at } } : {}),
          ...(status === 'ENDED' ? { endAt: { $lte: at } } : {}),
        },
        params,
        { businessType: 1, order: 1, startAt: 1 },
      );
      return { items: await rows(page.items), total: page.meta.total };
    },

    async create({ data, reason, actor }) {
      if (data.endAt <= data.startAt) throw invalid('endAt');
      const salon = await salons.findById(data.salonId);
      if (salon === null) throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
      await assertNoOverlap(data.salonId, data.startAt, data.endAt);
      const created = await placements.create({
        salonId: toObjectId(data.salonId),
        businessType: salon.businessType,
        audience: salon.audience,
        startAt: data.startAt,
        endAt: data.endAt,
        order: data.order,
        amountPaid: data.amountPaid,
        ...(data.note === undefined ? {} : { note: data.note }),
      });
      await record('RECOMMENDED_CREATE', created.id, reason, actor, undefined, created);
      return one(created);
    },

    async update({ id, patch, reason, actor }) {
      const before = await find(id);
      if (before.endAt <= now())
        throw new BusinessRuleError({ code: ERROR_CODES.INVALID_TRANSITION });
      const startAt = patch.startAt ?? before.startAt;
      const endAt = patch.endAt ?? before.endAt;
      if (endAt <= startAt) throw invalid('endAt');
      if (patch.startAt !== undefined || patch.endAt !== undefined) {
        await assertNoOverlap(before.salonId, startAt, endAt, id);
      }
      const set = Object.fromEntries(
        Object.entries({
          startAt: patch.startAt,
          endAt: patch.endAt,
          order: patch.order,
          amountPaid: patch.amountPaid,
          ...(typeof patch.note === 'string' ? { note: patch.note } : {}),
        }).filter(([, value]) => value !== undefined),
      );
      const after = await placements.updateById(id, set);
      if (after === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      await record('RECOMMENDED_UPDATE', id, reason, actor, before, after);
      return one(after);
    },

    async end({ id, reason, actor }) {
      const before = await find(id);
      const at = now();
      if (before.endAt <= at) throw new BusinessRuleError({ code: ERROR_CODES.ALREADY_HANDLED });
      // A scheduled one that never started simply collapses to an empty, ended period.
      const after = await placements.updateById(id, {
        endAt: at,
        ...(before.startAt > at ? { startAt: at } : {}),
      });
      if (after === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      await record('RECOMMENDED_END', id, reason, actor, before, after);
      return one(after);
    },

    async reorder({ businessType, ids, reason, actor }) {
      const unique = [...new Set(ids)];
      const found = await Promise.all(unique.map((id) => placements.findById(id)));
      if (found.some((p) => p === null || p.businessType !== businessType)) {
        throw invalid('body.ids');
      }
      const updated = await Promise.all(
        unique.map((id, order) => placements.updateById(id, { order })),
      );
      const done = updated.flatMap((p) => p ?? []);
      await record('RECOMMENDED_REORDER', unique[0] ?? businessType, reason, actor, undefined, {
        businessType,
        ids: unique,
      });
      return rows(done);
    },
  };
};
