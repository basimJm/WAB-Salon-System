import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { defineEndpoint } from '../api/endpoint';
import { mockRoute } from './mockRoute';
import type { MockRoute } from './mockTransport';

type Status = 'SCHEDULED' | 'SENDING' | 'SENT' | 'CANCELLED';
const campaign = (n: number, status: Status) => ({
  id: `64c5${String(n).padStart(20, '0')}`,
  title: { ar: `عرض ${String(n)}`, en: `Offer ${String(n)}` },
  body: { ar: 'خصم خاص', en: 'A special discount' },
  app: 'CUSTOMER' as const,
  audience: { kind: 'ALL' as const },
  link: null as string | null,
  status,
  scheduledAt: '2026-10-20T08:00:00.000Z',
  sentAt: status === 'SENT' ? '2026-10-20T08:00:05.000Z' : null,
  cancelledAt: null as string | null,
  stats:
    status === 'SENT'
      ? { targeted: 100, sent: 98, delivered: 90, opened: 40, failed: 2 }
      : { targeted: 0, sent: 0, delivered: 0, opened: 0, failed: 0 },
  createdBy: 'admin',
});
export const MOCK_CAMPAIGNS = [campaign(1, 'SCHEDULED'), campaign(2, 'SENT')];

export function campaignsRoutes(): readonly MockRoute[] {
  const rows = MOCK_CAMPAIGNS.map((c) => ({ ...c }));
  const O = OPERATIONS;
  return [
    mockRoute(
      defineEndpoint(O.getCampaigns, {
        data: dto.getCampaignsDataSchema,
        query: dto.getCampaignsQuerySchema,
      }),
      ({ query }) => {
        const items = rows.filter((r) => !query.get('status') || r.status === query.get('status'));
        return {
          data: items,
          meta: { page: 1, pageSize: 25, total: items.length, totalPages: 1 },
          empty: [],
        };
      },
    ),
    mockRoute(
      defineEndpoint(O.postCampaignsAudienceSize, {
        data: dto.postCampaignsAudienceSizeDataSchema,
        body: dto.postCampaignsAudienceSizeBodySchema,
      }),
      ({ body }) => ({
        data: {
          size: (body as { audience: { kind: string } }).audience.kind === 'ALL' ? 1200 : 87,
        },
      }),
    ),
    mockRoute(
      defineEndpoint(O.postCampaigns, {
        data: dto.postCampaignsDataSchema,
        body: dto.postCampaignsBodySchema,
      }),
      ({ body }) => {
        const b = body as {
          title: { ar: string; en: string };
          body: { ar: string; en: string };
          audience: { kind: 'ALL' };
          scheduledAt?: string | null;
        };
        const row = {
          ...campaign(rows.length + 1, b.scheduledAt ? 'SCHEDULED' : 'SENDING'),
          title: b.title,
          body: b.body,
          audience: b.audience,
        };
        rows.unshift(row);
        return { data: row, status: 201 };
      },
    ),
    mockRoute(
      defineEndpoint(O.postCampaignsByIdCancel, {
        data: dto.postCampaignsByIdCancelDataSchema,
        body: dto.postCampaignsByIdCancelBodySchema,
      }),
      ({ params }) => {
        const row = rows.find((r) => r.id === params['id']);
        if (!row) throw new Error('no campaign');
        Object.assign(row, { status: 'CANCELLED', cancelledAt: '2026-10-18T08:00:00.000Z' });
        return { data: { ...row } };
      },
    ),
  ];
}
