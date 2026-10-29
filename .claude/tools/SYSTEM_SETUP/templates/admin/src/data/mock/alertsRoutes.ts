import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { defineEndpoint } from '../api/endpoint';
import { mockRoute } from './mockRoute';
import type { MockRoute } from './mockTransport';

type Kind = dto.getAlertsData[number]['kind'];
type Subject = dto.getAlertsData[number]['entityType'];
const alert = (
  n: number,
  kind: Kind,
  severity: 'INFO' | 'WARNING' | 'CRITICAL',
  entityType: Subject,
) => ({
  id: `64c3${String(n).padStart(20, '0')}`,
  kind,
  severity,
  title: `Alert ${String(n)}`,
  titles: { ar: `تنبيه ${String(n)}`, en: `Alert ${String(n)}` },
  entityType,
  entityId: entityType ? '64d100000000000000000001' : null,
  data: {} as Record<string, unknown>,
  status: 'NEW' as 'NEW' | 'ACKNOWLEDGED',
  emailedAt: null as string | null,
  acknowledgedAt: null as string | null,
  createdAt: `2026-10-1${String(n)}T08:00:00.000Z`,
});
export const MOCK_ALERTS = [
  alert(1, 'ERROR_RATE_SPIKE', 'CRITICAL', null),
  alert(2, 'JOB_FAILED', 'WARNING', null),
  alert(3, 'ITEM_FLAGGED', 'INFO', 'ITEM'),
];

export function alertsRoutes(): readonly MockRoute[] {
  const rows = MOCK_ALERTS.map((a) => ({ ...a }));
  const O = OPERATIONS;
  return [
    mockRoute(
      defineEndpoint(O.getAlerts, {
        data: dto.getAlertsDataSchema,
        query: dto.getAlertsQuerySchema,
      }),
      ({ query }) => {
        const items = rows.filter(
          (r) =>
            (!query.get('status') || r.status === query.get('status')) &&
            (!query.get('kind') || r.kind === query.get('kind')),
        );
        return {
          data: items,
          meta: { page: 1, pageSize: 25, total: items.length, totalPages: 1 },
          empty: [],
        };
      },
    ),
    mockRoute(defineEndpoint(O.getAlertsCount, { data: dto.getAlertsCountDataSchema }), () => ({
      data: { new: rows.filter((r) => r.status === 'NEW').length },
    })),
    mockRoute(
      defineEndpoint(O.postAlertsByIdAcknowledge, {
        data: dto.postAlertsByIdAcknowledgeDataSchema,
      }),
      ({ params }) => {
        const row = rows.find((r) => r.id === params['id']);
        if (!row) throw new Error('no alert');
        Object.assign(row, { status: 'ACKNOWLEDGED', acknowledgedAt: '2026-10-18T08:00:00.000Z' });
        return { data: { ...row } };
      },
    ),
  ];
}
