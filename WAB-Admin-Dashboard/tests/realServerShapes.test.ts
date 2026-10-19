import { describe, expect, it } from 'vitest';
import type { ApiClient } from '@/data/api/ApiClient';
import { RemoteCampaignsRepository } from '@/data/campaigns/RemoteCampaignsRepository';
import { alertListSchema } from '@/data/alerts/RemoteAlertsRepository';
import { exportListSchema } from '@/data/exports/RemoteExportsRepository';

/** Payloads copied from a real WAB-Server answer: it leaves out empty `data` / `params` objects. */
describe('real server answers', () => {
  it('reads an alert without `data` as an alert with empty data', () => {
    const answer = [
      {
        id: '6ad65398b2d2fc8a4053c8da',
        kind: 'REVIEW_PENDING',
        severity: 'INFO',
        title: 'New review awaits moderation',
        entityType: 'REVIEW',
        entityId: '6ad652fcb2d2fc8a4053c8d1',
        status: 'NEW',
        emailedAt: null,
        acknowledgedAt: null,
        createdAt: '2026-10-19T17:30:00.024Z',
      },
    ];
    const parsed = alertListSchema().parse(answer);
    expect(parsed[0]?.data).toEqual({});
    expect(alertListSchema().parse([{ ...answer[0], data: { count: 2 } }])[0]?.data).toEqual({
      count: 2,
    });
  });

  it('reads an export job without `params` as one with empty params', () => {
    const job = {
      id: '6ad6547eb2d2fc8a4053c922',
      kind: 'BOOKINGS',
      format: 'CSV',
      status: 'QUEUED',
      rowCount: null,
      failure: null,
      createdAt: '2026-10-19T17:33:50.846Z',
      finishedAt: null,
      downloadUrl: null,
    };
    expect(exportListSchema().parse([job])[0]?.params).toEqual({});
    expect(
      exportListSchema().parse([{ ...job, params: { statuses: ['PENDING'] } }])[0]?.params,
    ).toEqual({
      statuses: ['PENDING'],
    });
  });
});

describe('campaign schedule', () => {
  const input = {
    title: { ar: 'عنوان', en: 'Title' },
    body: { ar: 'نص', en: 'Body' },
    app: 'CUSTOMER' as const,
    audience: { kind: 'ALL' as const },
  };
  const bodyOf = async (scheduledAt: string | null) => {
    let sent: Record<string, unknown> = {};
    const api = {
      execute: (_e: unknown, request: { body: Record<string, unknown> }) => {
        sent = request.body;
        return Promise.resolve({ data: {} });
      },
    } as unknown as ApiClient;
    await new RemoteCampaignsRepository(api).create({ ...input, scheduledAt }, 'reason');
    return sent;
  };

  it('leaves the date out for "send now": the server reads a null date as 1 Jan 1970', async () => {
    expect(Object.keys(await bodyOf(null))).not.toContain('scheduledAt');
  });

  it('sends a chosen date as it is', async () => {
    expect((await bodyOf('2026-10-25T09:00:00.000Z'))['scheduledAt']).toBe(
      '2026-10-25T09:00:00.000Z',
    );
  });
});
