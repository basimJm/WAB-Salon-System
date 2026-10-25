import { MOCK_CDN_BASE } from '@/constants/mock';
import { defineEndpoint, optionalQuery } from '../api/endpoint';
import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { mockRoute } from './mockRoute';
import type { MockRoute } from './mockTransport';
import { type Day, type SalonEditState, uid, withoutReason } from './salonEditState';

const O = OPERATIONS;
export function salonMenuRoutes(
  of: (id: string | undefined, branchId?: string | null) => SalonEditState,
): readonly MockRoute[] {
  return [
    mockRoute(
      defineEndpoint(O.getSalonsByIdServices, {
        data: dto.getSalonsByIdServicesDataSchema,
        query: dto.getSalonsByIdServicesQuerySchema,
      }),
      ({ params, query }) => {
        const rows = of(params['id'], query.get('branchId')).services;
        return {
          data: rows,
          meta: { page: 1, pageSize: 100, total: rows.length, totalPages: 1 },
          empty: [],
        };
      },
    ),
    mockRoute(
      defineEndpoint(O.postSalonsByIdServices, {
        query: optionalQuery(dto.postSalonsByIdServicesQuerySchema),
        data: dto.postSalonsByIdServicesDataSchema,
        body: dto.postSalonsByIdServicesBodySchema,
      }),
      ({ params, query, body }) => {
        const s = of(params['id'], query.get('branchId'));
        const b = body as {
          catalogServiceId: string;
          price: string;
          durationMinutes: number;
          brideOnly?: boolean;
          extraDescription?: string;
          active?: boolean;
        };
        s.seq += 1;
        const item = {
          id: uid('64d', s.seq),
          catalogServiceId: b.catalogServiceId,
          name: 'New service',
          imageUrl: `${MOCK_CDN_BASE}/s2.jpg`,
          price: b.price,
          durationMinutes: b.durationMinutes,
          brideOnly: b.brideOnly ?? false,
          extraDescription: b.extraDescription ?? null,
          mediaUrls: [] as string[],
          active: b.active ?? true,
        };
        s.services.push(item);
        return { data: item, status: 201 };
      },
    ),
    mockRoute(
      defineEndpoint(O.patchSalonsByIdServicesByServiceId, {
        query: optionalQuery(dto.patchSalonsByIdServicesByServiceIdQuerySchema),
        data: dto.patchSalonsByIdServicesByServiceIdDataSchema,
        body: dto.patchSalonsByIdServicesByServiceIdBodySchema,
      }),
      ({ params, query, body }) => {
        const row = of(params['id'], query.get('branchId')).services.find(
          (x) => x.id === params['serviceId'],
        );
        if (!row) throw new Error('no service');
        const patch = withoutReason(body);
        Object.assign(row, patch);
        return { data: row };
      },
    ),
    mockRoute(
      defineEndpoint(O.getSalonsByIdMembersByMemberIdStaff, {
        data: dto.getSalonsByIdMembersByMemberIdStaffDataSchema,
      }),
      ({ params }) => {
        const s = of(params['id']);
        const memberId = params['memberId'] ?? '';
        const row = s.staff.get(memberId) ?? {
          memberId,
          providesServices: true,
          bio: null,
          yearsOfExperience: null,
          serviceIds: [],
          brideQualified: false,
          workingDays: [],
          rating: { avg: 0, count: 0 },
          customersCount: 0,
        };
        return { data: row };
      },
    ),
    mockRoute(
      defineEndpoint(O.putSalonsByIdMembersByMemberIdStaff, {
        data: dto.putSalonsByIdMembersByMemberIdStaffDataSchema,
        body: dto.putSalonsByIdMembersByMemberIdStaffBodySchema,
      }),
      ({ params, body }) => {
        const s = of(params['id']);
        const b = body as {
          providesServices: boolean;
          bio?: string;
          yearsOfExperience?: number;
          serviceIds: string[];
          brideQualified: boolean;
          workingDays: { day: Day; start?: string; end?: string }[];
        };
        const row = {
          memberId: params['memberId'] ?? '',
          providesServices: b.providesServices,
          bio: b.bio ?? null,
          yearsOfExperience: b.yearsOfExperience ?? null,
          serviceIds: b.serviceIds,
          brideQualified: b.brideQualified,
          workingDays: b.workingDays.map((d) => ({
            day: d.day,
            start: d.start ?? null,
            end: d.end ?? null,
          })),
          rating: { avg: 0, count: 0 },
          customersCount: 0,
        };
        s.staff.set(row.memberId, row);
        return { data: row };
      },
    ),
    mockRoute(
      defineEndpoint(O.getSalonsByIdPolicy, { data: dto.getSalonsByIdPolicyDataSchema }),
      ({ params }) => ({ data: of(params['id']).policy }),
    ),
    mockRoute(
      defineEndpoint(O.putSalonsByIdPolicy, {
        data: dto.putSalonsByIdPolicyDataSchema,
        body: dto.putSalonsByIdPolicyBodySchema,
      }),
      ({ params, body }) => {
        const s = of(params['id']);
        const p = withoutReason(body) as {
          depositPercentage?: number;
          notes?: string;
        } & NonNullable<typeof s.policy>;
        s.policy = { ...p, depositPercentage: p.depositPercentage ?? null, notes: p.notes ?? null };
        return { data: s.policy };
      },
    ),
  ];
}
