import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { defineEndpoint } from '../api/endpoint';
import { mockRoute } from './mockRoute';
import type { MockRoute } from './mockTransport';

type Kind = 'PAYMENT_FAILURE_SPIKE' | 'REFUND_FAILED' | 'SALON_APPLICATION';
const alert = (
  n: number,
  kind: Kind,
  severity: 'INFO' | 'WARNING' | 'CRITICAL',
  entityType: string | null,
) => ({
  id: `64c3${String(n).padStart(20, '0')}`,
  kind,
  severity,
  title: `Alert ${String(n)}`,
  entityType,
  entityId: entityType ? '64f000000000000000000001' : null,
  data: {} as Record<string, unknown>,
  status: 'NEW' as 'NEW' | 'ACKNOWLEDGED',
  emailedAt: null as string | null,
  acknowledgedAt: null as string | null,
  createdAt: `2026-10-1${String(n)}T08:00:00.000Z`,
});
export const MOCK_ALERTS = [
  alert(1, 'PAYMENT_FAILURE_SPIKE', 'CRITICAL', null),
  // Subjects spelled like the real server (UPPER_SNAKE entity types, ADM-079).
  alert(2, 'REFUND_FAILED', 'WARNING', 'REFUND'),
  alert(3, 'SALON_APPLICATION', 'INFO', 'SALON'),
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
