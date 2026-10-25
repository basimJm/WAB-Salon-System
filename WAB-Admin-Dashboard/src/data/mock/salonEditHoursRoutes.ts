import { defineEndpoint, optionalQuery } from '../api/endpoint';
import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { mockRoute } from './mockRoute';
import type { MockRoute } from './mockTransport';
import { type SalonEditState, uid } from './salonEditState';

const O = OPERATIONS;
const broken = [
  { bookingId: uid('64f', 1), startsAt: '2026-10-21T09:00:00.000Z', status: 'APPROVED' },
];
const hoursView = (s: SalonEditState) => ({
  weeklySchedule: s.schedule,
  closures: s.closures,
  today: {
    date: '2026-10-19',
    isClosed: false,
    closedReason: null,
    open: '09:00',
    close: '21:00',
    isOpenNow: true,
  },
});

export function salonHoursRoutes(
  of: (id: string | undefined, branchId?: string | null) => SalonEditState,
): readonly MockRoute[] {
  return [
    mockRoute(
      defineEndpoint(O.getSalonsByIdHours, {
        data: dto.getSalonsByIdHoursDataSchema,
        query: optionalQuery(dto.getSalonsByIdHoursQuerySchema),
      }),
      ({ params, query }) => ({ data: hoursView(of(params['id'], query.get('branchId'))) }),
    ),
    mockRoute(
      defineEndpoint(O.putSalonsByIdHours, {
        query: optionalQuery(dto.putSalonsByIdHoursQuerySchema),
        data: dto.putSalonsByIdHoursDataSchema,
        body: dto.putSalonsByIdHoursBodySchema,
      }),
      ({ params, query, body }) => {
        const s = of(params['id'], query.get('branchId'));
        s.schedule = (body as { days: typeof s.schedule }).days;
        return { data: hoursView(s) };
      },
    ),
    mockRoute(
      defineEndpoint(O.postSalonsByIdHoursPreview, {
        query: optionalQuery(dto.postSalonsByIdHoursPreviewQuerySchema),
        data: dto.postSalonsByIdHoursPreviewDataSchema,
        body: dto.postSalonsByIdHoursPreviewBodySchema,
      }),
      ({ body }) => ({
        data: (body as { days: { day: string; isOff: boolean }[] }).days.some(
          (d) => d.isOff && d.day === 'MON',
        )
          ? broken
          : [],
      }),
    ),
    mockRoute(
      defineEndpoint(O.postSalonsByIdClosuresPreview, {
        query: optionalQuery(dto.postSalonsByIdClosuresPreviewQuerySchema),
        data: dto.postSalonsByIdClosuresPreviewDataSchema,
        body: dto.postSalonsByIdClosuresPreviewBodySchema,
      }),
      ({ body }) => ({ data: (body as { from: string }).from === '2026-10-21' ? broken : [] }),
    ),
    mockRoute(
      defineEndpoint(O.postSalonsByIdClosures, {
        query: optionalQuery(dto.postSalonsByIdClosuresQuerySchema),
        data: dto.postSalonsByIdClosuresDataSchema,
        body: dto.postSalonsByIdClosuresBodySchema,
      }),
      ({ params, query, body }) => {
        const s = of(params['id'], query.get('branchId'));
        const b = body as { from: string; to: string; closureReason: string };
        s.seq += 1;
        const item = {
          id: uid('64b', s.seq),
          from: b.from,
          to: b.to,
          reason: b.closureReason,
          editable: true,
        };
        s.closures.push(item);
        return { data: item, status: 201 };
      },
    ),
    mockRoute(
      defineEndpoint(O.patchSalonsByIdClosuresByClosureId, {
        query: optionalQuery(dto.patchSalonsByIdClosuresByClosureIdQuerySchema),
        data: dto.patchSalonsByIdClosuresByClosureIdDataSchema,
        body: dto.patchSalonsByIdClosuresByClosureIdBodySchema,
      }),
      ({ params, query, body }) => {
        const s = of(params['id'], query.get('branchId'));
        const row = s.closures.find((c) => c.id === params['closureId']);
        if (!row) throw new Error('no closure');
        const b = body as { from?: string; to?: string; closureReason?: string };
        Object.assign(row, {
          ...(b.from ? { from: b.from } : {}),
          ...(b.to ? { to: b.to } : {}),
          ...(b.closureReason ? { reason: b.closureReason } : {}),
        });
        return { data: row };
      },
    ),
    mockRoute(
      defineEndpoint(O.postSalonsByIdClosuresByClosureIdRemove, {
        query: optionalQuery(dto.postSalonsByIdClosuresByClosureIdRemoveQuerySchema),
        data: dto.postSalonsByIdClosuresByClosureIdRemoveDataSchema,
        body: dto.postSalonsByIdClosuresByClosureIdRemoveBodySchema,
      }),
      ({ params, query }) => {
        const s = of(params['id'], query.get('branchId'));
        s.closures = s.closures.filter((c) => c.id !== params['closureId']);
        return { data: null };
      },
    ),
  ];
}
