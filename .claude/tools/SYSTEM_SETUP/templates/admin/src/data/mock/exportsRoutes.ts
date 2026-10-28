import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { defineEndpoint } from '../api/endpoint';
import { mockRoute } from './mockRoute';
import type { MockRoute } from './mockTransport';

import type { ApiFormat, ExportJob, ExportKind, ExportStatus } from '@/domain/exports/exports';

const job = (n: number, kind: ExportKind, format: ApiFormat, status: ExportStatus) => ({
  id: `64c1${String(n).padStart(20, '0')}`,
  kind,
  format,
  params: {} as Record<string, unknown>,
  status,
  rowCount: status === 'DONE' ? 120 : null,
  failure: (status === 'FAILED' ? 'TOO_MANY_ROWS' : null) as ExportJob['failure'],
  createdAt: '2026-10-17T08:00:00.000Z',
  finishedAt: status === 'DONE' || status === 'FAILED' ? '2026-10-17T08:00:05.000Z' : null,
  downloadUrl: status === 'DONE' ? 'https://files.example.test/export.xlsx?sig=1' : null, // hardcoded-ok: mock data
});
export const MOCK_EXPORTS = [
  job(1, 'TRANSACTIONS', 'XLSX', 'DONE'),
  job(2, 'AUDIT_LOGS', 'CSV', 'FAILED'),
];

export function exportsRoutes(): readonly MockRoute[] {
  const rows = MOCK_EXPORTS.map((j) => ({ ...j }));
  const O = OPERATIONS;
  return [
    mockRoute(
      defineEndpoint(O.getExports, {
        data: dto.getExportsDataSchema,
        query: dto.getExportsQuerySchema,
      }),
      () => ({
        data: rows,
        meta: { page: 1, pageSize: 25, total: rows.length, totalPages: 1 },
        empty: [],
      }),
    ),
    mockRoute(
      defineEndpoint(O.postExports, {
        data: dto.postExportsDataSchema,
        body: dto.postExportsBodySchema,
      }),
      ({ body }) => {
        const b = body as { kind: ExportKind; format: ApiFormat };
        // The mock finishes at once: the first read already says DONE.
        const row = job(rows.length + 1, b.kind, b.format, 'DONE');
        rows.unshift(row);
        return { data: row, status: 201 };
      },
    ),
    mockRoute(
      defineEndpoint(O.getExportsById, { data: dto.getExportsByIdDataSchema }),
      ({ params }) => {
        const row = rows.find((r) => r.id === params['id']);
        if (!row) throw new Error('no export');
        return { data: { ...row } };
      },
    ),
  ];
}
