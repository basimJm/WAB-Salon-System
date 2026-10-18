import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { defineEndpoint } from '../api/endpoint';
import { mockRoute } from './mockRoute';
import type { MockRoute } from './mockTransport';

const log = (n: number, action: string, entityType: string, withDiff: boolean) => ({
  id: `64c2${String(n).padStart(20, '0')}`,
  adminId: '64c000000000000000000a01',
  action,
  entityType,
  entityId: '64f000000000000000000001',
  ...(withDiff ? { before: { state: 'LIVE' }, after: { state: 'OFFLINE' } } : {}),
  reason: `Reason ${String(n)}`,
  ip: '203.0.113.7', // hardcoded-ok: mock data
  userAgent: 'Mozilla/5.0',
  createdAt: `2026-10-1${String(n)}T08:00:00.000Z`,
});
export const MOCK_AUDIT = [
  log(1, 'SALON_SET_OFFLINE', 'salon', true),
  log(2, 'SETTING_UPDATE', 'setting', true),
  log(3, 'REVIEW_APPROVE', 'review', false),
];

export function auditRoutes(): readonly MockRoute[] {
  return [
    mockRoute(
      defineEndpoint(OPERATIONS.getAuditLogs, {
        data: dto.getAuditLogsDataSchema,
        query: dto.getAuditLogsQuerySchema,
      }),
      ({ query }) => {
        const action = (query.get('action') ?? '').toLowerCase();
        const type = query.get('entityType');
        const items = MOCK_AUDIT.filter(
          (l) => l.action.toLowerCase().includes(action) && (!type || l.entityType === type),
        );
        return {
          data: items,
          meta: { page: 1, pageSize: 25, total: items.length, totalPages: 1 },
          empty: [],
        };
      },
    ),
  ];
}
