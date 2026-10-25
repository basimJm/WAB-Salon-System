import ExcelJS from 'exceljs';
import { exportRequestSchema } from '../src/domain/exports/exportRequest';
import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { EXPORT_MAX_ROWS } from '../src/constants/exports';
import { createAuditWriter } from '../src/domain/audit/audit.service';
import type { ExportRequest } from '../src/domain/exports/exportRequest';
import { createExportsService } from '../src/domain/exports/exports.service';
import {
  createTableBuilders,
  factRows,
  TooManyRowsError,
  type TableBuilders,
} from '../src/domain/exports/tableBuilders';
import { renderTable, safeText, type ExportTable } from '../src/domain/exports/writers';
import { emptyFacts } from '../src/domain/reports/reports.service';
import type { DelayedJob } from '../src/jobs/jobs';
import { requireAuth } from '../src/middlewares/auth';
import { FakeStorageProvider } from '../src/providers/storage';
import { AuditLogsRepository } from '../src/repositories/auditLogs.repository';
import { ExportsRepository } from '../src/repositories/exports.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const NOW = new Date('2026-10-13T12:00:00.000Z');
const exportsM = createFakeModel();
const auditM = createFakeModel();
const storage = new FakeStorageProvider({ now: () => NOW });
let scheduled: DelayedJob[] = [];
let builderMode: 'ok' | 'big' | 'boom' = 'ok';
const adminId = new Types.ObjectId().toHexString();

const table: ExportTable = {
  title: 'Sample',
  columns: ['Name', 'Value'],
  rows: [
    ['plain', 1],
    ['with,comma', 2],
    ['say "hi"', 3],
    ['=SUM(A1)', 4],
  ],
};
const makeBuilder = (): TableBuilders['REPORT_DAILY'] => () => {
  if (builderMode === 'big') return Promise.reject(new TooManyRowsError());
  if (builderMode === 'boom') return Promise.reject(new Error('db down'));
  return Promise.resolve(table);
};
const builders = {
  REPORT_DAILY: makeBuilder(),
  REPORT_WEEKLY: makeBuilder(),
  REPORT_MONTHLY: makeBuilder(),
  TRANSACTIONS: makeBuilder(),
  AUDIT_LOGS: makeBuilder(),
} as unknown as TableBuilders;
const service = createExportsService({
  exports: new ExportsRepository(exportsM.model as never),
  builders,
  storage,
  scheduler: {
    schedule: (job) => {
      scheduled.push(job);
      return Promise.resolve(true);
    },
  },
  audit: createAuditWriter(new AuditLogsRepository(auditM.model as never)),
  logger,
  now: () => NOW,
});
const app = createApp({
  logger,
  services: { adminGuard: requireAuth('admin', SECRET), adminExports: service },
});
const token = (type: 'ADMIN' | 'CUSTOMER' = 'ADMIN'): string =>
  `Bearer ${signAccessToken({ secret: SECRET, subjectType: type, subjectId: adminId, ttlSec: 600 }).token}`;
interface Body {
  data: Record<string, unknown>;
  meta?: { total: number };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const actor = { adminId, ip: '10.0.0.1', userAgent: 'jest' };
const daily: ExportRequest = {
  kind: 'REPORT_DAILY',
  format: 'XLSX',
  params: { date: '2026-10-01' },
};

beforeEach(() => {
  exportsM.docs.length = 0;
  auditM.docs.length = 0;
  scheduled = [];
  builderMode = 'ok';
});

describe('file writers', () => {
  it('CSV: BOM, quoting, formula neutralized', async () => {
    const file = await renderTable(table, 'CSV');
    const text = file.body.toString('utf8');
    expect(text.startsWith('﻿')).toBe(true);
    expect(text).toContain('Name,Value\r\n');
    expect(text).toContain('"with,comma",2');
    expect(text).toContain('"say ""hi""",3');
    expect(text).toContain("'=SUM(A1),4");
    expect(file.contentType).toContain('text/csv');
  });

  it('XLSX: real workbook with header, rows, numbers kept and formulas neutralized', async () => {
    const file = await renderTable(table, 'XLSX');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(file.body as never);
    const sheet = wb.getWorksheet('Sample');
    expect(sheet?.rowCount).toBe(5);
    expect(sheet?.getRow(1).getCell(1).value).toBe('Name');
    expect(sheet?.getRow(2).getCell(2).value).toBe(1);
    expect(sheet?.getRow(5).getCell(1).value).toBe("'=SUM(A1)");
  });

  it('PDF: a real PDF, and many rows add pages', async () => {
    const file = await renderTable(table, 'PDF');
    expect(file.body.subarray(0, 5).toString()).toBe('%PDF-');
    const long: ExportTable = {
      title: 'Long',
      columns: ['A'],
      rows: Array.from({ length: 200 }, (_, i) => [i]),
    };
    const big = await renderTable(long, 'PDF');
    const pages = (b: Buffer): number =>
      (b.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length;
    expect(pages(big.body)).toBeGreaterThan(pages(file.body));
  });

  it('safeText only touches text that starts like a formula', () => {
    expect(safeText('-5')).toBe("'-5");
    expect(safeText('@x')).toBe("'@x");
    expect(safeText('ok')).toBe('ok');
    expect(safeText(null)).toBe('');
    expect(safeText(7)).toBe('7');
  });
});

describe('exports service', () => {
  it('request stores a QUEUED export, audits it and queues the job', async () => {
    const view = await service.request({ request: daily, actor });
    expect(view.status).toBe('QUEUED');
    expect(view.downloadUrl).toBeNull();
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0]?.name).toBe('export.run');
    expect(scheduled[0]?.data).toEqual({ exportId: view.id });
    expect(auditM.docs).toHaveLength(1);
    expect(auditM.docs[0]).toMatchObject({ action: 'EXPORT_REQUEST', entityId: view.id });
  });

  it('run writes a private file, marks DONE and get returns a download link', async () => {
    const { id } = await service.request({ request: daily, actor });
    await service.run(id);
    const done = await service.get(id);
    expect(done.status).toBe('DONE');
    expect(done.rowCount).toBe(4);
    expect(done.downloadUrl).toContain(`exports/${id}.xlsx`);
    expect(storage.has(`exports/${id}.xlsx`)).toBe(true);
    expect(() => storage.getPublicUrl(`exports/${id}.xlsx`)).toThrow();
  });

  it('a second run of the same export does nothing', async () => {
    const { id } = await service.request({ request: daily, actor });
    await service.run(id);
    builderMode = 'boom';
    await service.run(id);
    expect((await service.get(id)).status).toBe('DONE');
  });

  it('too many rows and generation errors end FAILED without throwing', async () => {
    builderMode = 'big';
    const a = await service.request({ request: daily, actor });
    await service.run(a.id);
    expect(await service.get(a.id)).toMatchObject({
      status: 'FAILED',
      failure: 'TOO_MANY_ROWS',
      downloadUrl: null,
    });
    builderMode = 'boom';
    const b = await service.request({ request: daily, actor });
    await expect(service.run(b.id)).resolves.toBeUndefined();
    expect(await service.get(b.id)).toMatchObject({
      status: 'FAILED',
      failure: 'GENERATION_FAILED',
    });
  });

  it('unknown or malformed id is 404 on get', async () => {
    await expect(service.get(new Types.ObjectId().toHexString())).rejects.toMatchObject({
      httpStatus: 404,
    });
    await expect(service.get('nope')).rejects.toMatchObject({ httpStatus: 404 });
  });

  it('reconcile queues QUEUED exports and exports left RUNNING for too long', async () => {
    const queued = await service.request({ request: daily, actor });
    scheduled = [];
    exportsM.docs.push({
      _id: new Types.ObjectId(),
      kind: 'REPORT_DAILY',
      format: 'CSV',
      params: { date: '2026-10-01' },
      status: 'RUNNING',
      requestedBy: new Types.ObjectId(adminId),
      createdAt: new Date(NOW.getTime() - 3_600_000),
      updatedAt: new Date(NOW.getTime() - 3_600_000),
    });
    exportsM.docs.push({
      _id: new Types.ObjectId(),
      kind: 'REPORT_DAILY',
      format: 'CSV',
      params: {},
      status: 'RUNNING',
      requestedBy: new Types.ObjectId(adminId),
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(await service.reconcile()).toBe(2);
    expect(scheduled).toHaveLength(2);
    expect(exportsM.docs.filter((d) => d.status === 'QUEUED')).toHaveLength(2);
    expect(scheduled.map((j) => j.data?.['exportId'])).toContain(queued.id);
  });
});

describe('export endpoints', () => {
  it('need an admin token', async () => {
    expect((await request(app).get('/admin/v1/exports')).status).toBe(401);
    expect(
      (
        await request(app)
          .post('/admin/v1/exports')
          .set('Authorization', token('CUSTOMER'))
          .send(daily)
      ).status,
    ).toBe(403);
  });

  it('create, list and read', async () => {
    const created = await request(app)
      .post('/admin/v1/exports')
      .set('Authorization', token())
      .send(daily);
    expect(created.status).toBe(201);
    const id = (bodyOf(created).data as { id: string }).id;
    await service.run(id);
    const list = await request(app).get('/admin/v1/exports').set('Authorization', token());
    expect(bodyOf(list).meta?.total).toBe(1);
    const one = await request(app).get(`/admin/v1/exports/${id}`).set('Authorization', token());
    expect((bodyOf(one).data as { status: string }).status).toBe('DONE');
  });

  it('rejects unknown kinds, bad formats, bad dates and filters', async () => {
    const bad = [
      { kind: 'USERS', format: 'CSV', params: {} },
      { kind: 'REPORT_DAILY', format: 'DOC', params: { date: '2026-10-01' } },
      { kind: 'REPORT_DAILY', format: 'CSV', params: { date: '2026-02-30' } },
      { kind: 'REPORT_MONTHLY', format: 'CSV', params: { month: '2026-13' } },
      { kind: 'TRANSACTIONS', format: 'CSV', params: { salonId: 'x' } },
      { kind: 'TRANSACTIONS', format: 'CSV', params: { status: 'NOPE' } },
    ];
    for (const body of bad) {
      const res = await request(app)
        .post('/admin/v1/exports')
        .set('Authorization', token())
        .send(body);
      expect(res.status).toBe(400);
    }
    expect(exportsM.docs).toHaveLength(0);
    expect(
      (
        await request(app)
          .post('/admin/v1/exports')
          .set('Authorization', token())
          .send({ kind: 'AUDIT_LOGS', format: 'PDF', params: {} })
      ).status,
    ).toBe(201);
  });
});

describe('table builders', () => {
  const txItem = (n: number): never =>
    ({
      id: String(n),
      createdAt: new Date(NOW.getTime() - n * 1000),
      salonId: 's',
      customerId: 'c',
      type: 'DEPOSIT',
      amount: 5000,
      status: 'SUCCEEDED',
      attempt: 1,
    }) as never;

  it('flattens report facts with JOD text', () => {
    const f = { ...emptyFacts(), payments: { ...emptyFacts().payments, collected: 12_500 } };
    const rows = factRows(f);
    expect(rows).toContainEqual(['Payments', 'Collected (JOD)', '12.500']);
    expect(rows.every((r) => r.length === 3)).toBe(true);
  });

  it('transactions: pages through every page and formats money', async () => {
    const pages: number[] = [];
    const b = createTableBuilders({
      customers: {} as never,
      salons: {} as never,
      reports: {} as never,
      adminSettings: {} as never,
      bookings: {} as never,
      transactions: {
        list: ({ params }) => {
          pages.push(params.page);
          const all = Array.from({ length: 250 }, (_, i) => txItem(i));
          const start = (params.page - 1) * params.pageSize;
          return Promise.resolve({ items: all.slice(start, start + params.pageSize), total: 250 });
        },
      },
    });
    const t = await b.TRANSACTIONS({});
    expect(t.rows).toHaveLength(250);
    expect(pages).toEqual([1, 2, 3]);
    expect(t.rows[0]?.[6]).toBe('5.000');
  });

  it('refuses a table bigger than one export', async () => {
    const b = createTableBuilders({
      customers: {} as never,
      salons: {} as never,
      reports: {} as never,
      adminSettings: {} as never,
      bookings: {} as never,
      transactions: {
        list: () => Promise.resolve({ items: [txItem(1)], total: EXPORT_MAX_ROWS + 1 }),
      },
    });
    await expect(b.TRANSACTIONS({})).rejects.toBeInstanceOf(TooManyRowsError);
  });

  it('audit logs and reports build tables', async () => {
    const b = createTableBuilders({
      customers: {} as never,
      salons: {} as never,
      bookings: {} as never,
      reports: {
        daily: () =>
          Promise.resolve({ date: '2026-10-01', facts: emptyFacts(), snapshot: {} as never }),
        weekly: () =>
          Promise.resolve({
            from: 'a',
            to: 'b',
            facts: emptyFacts(),
            topSalons: [{ salonId: 's', bookings: 2, completed: 1, lost: 0 }],
          }),
        monthly: () =>
          Promise.resolve({
            month: '2026-09',
            from: 'a',
            to: 'b',
            facts: emptyFacts(),
            topSalons: [],
            payouts: { count: 1, amount: 3000 },
            snapshot: {
              reviewsPending: 0,
              refundsPending: 0,
              applicationsPending: 0,
              subscriptions: { trial: 1, active: 2, expired: 3 },
            },
            growth: { bookingsPct: null, collectedPct: null },
          }),
      },
      transactions: {} as never,
      adminSettings: {
        auditLogs: () =>
          Promise.resolve({
            items: [
              {
                createdAt: NOW,
                adminId: 'a',
                action: 'X',
                entityType: 'T',
                entityId: 'e',
                reason: 'r',
                ip: '1.1.1.1',
              } as never,
            ],
            total: 1,
          }),
      },
    });
    expect((await b.REPORT_DAILY({ date: '2026-10-01' })).title).toContain('2026-10-01');
    expect((await b.REPORT_WEEKLY({ from: '2026-10-01' })).rows).toContainEqual([
      'Top salons',
      's',
      2,
    ]);
    expect((await b.REPORT_MONTHLY({ month: '2026-09' })).rows).toContainEqual([
      'Payouts',
      'Amount (JOD)',
      '3.000',
    ]);
    expect((await b.AUDIT_LOGS({})).rows[0]?.[2]).toBe('X');
  });
});

describe('BOOKINGS export', () => {
  const row = (i: number): Record<string, unknown> => ({
    id: `b${String(i)}`,
    referenceNumber: `WAB-${String(i).padStart(6, '0')}`,
    status: 'APPROVED',
    paymentMethod: 'PAY_ON_ARRIVAL',
    paymentStatus: 'PENDING',
    hasBride: false,
    appointmentStart: '2026-10-20T09:00:00.000Z',
    appointmentEnd: '2026-10-20T10:00:00.000Z',
    respondBy: '2026-10-19T09:00:00.000Z',
    personsCount: 2,
    total: '25.000',
    salon: { id: 's1', name: 'Glow' },
    customer: { id: 'c1', name: 'Layla H', phone: '+962786135059' },
    staff: [
      { id: 'm1', name: 'Rana' },
      { id: 'm2', name: 'Dina' },
    ],
  });

  it('pages through every page as the admin audience and keeps the filters', async () => {
    const calls: {
      page: number;
      query: Record<string, unknown>;
      kind: string;
      language: string;
    }[] = [];
    const b = createTableBuilders({
      customers: {} as never,
      salons: {} as never,
      reports: {} as never,
      adminSettings: {} as never,
      transactions: {} as never,
      bookings: {
        list: ({ audience, query, params, language }) => {
          calls.push({ page: params.page, query: query as never, kind: audience.kind, language });
          const all = Array.from({ length: 250 }, (_, i) => row(i));
          const start = (params.page - 1) * params.pageSize;
          return Promise.resolve({
            items: all.slice(start, start + params.pageSize) as never,
            total: 250,
          });
        },
      },
    });
    const table = await b.BOOKINGS({
      statuses: ['APPROVED'],
      salonId: 's1',
      from: '2026-10-01',
      to: '2026-10-31',
      q: 'Layla',
    });
    expect(table.rows).toHaveLength(250);
    expect(calls.map((c) => c.page)).toEqual([1, 2, 3]);
    expect(calls[0]).toMatchObject({
      kind: 'ADMIN',
      language: 'en',
      query: {
        statuses: ['APPROVED'],
        salonId: 's1',
        from: '2026-10-01',
        to: '2026-10-31',
        q: 'Layla',
      },
    });
    expect(table.rows[0]).toEqual([
      'WAB-000000',
      'APPROVED',
      '2026-10-20T09:00:00.000Z',
      'Glow',
      'Layla H',
      '+962786135059',
      2,
      'Rana, Dina',
      'PAY_ON_ARRIVAL',
      'PENDING',
      '25.000',
    ]);
    expect(table.columns).toHaveLength(table.rows[0]?.length ?? 0);
  });

  it('refuses a table bigger than one export', async () => {
    const b = createTableBuilders({
      customers: {} as never,
      salons: {} as never,
      reports: {} as never,
      adminSettings: {} as never,
      transactions: {} as never,
      bookings: {
        list: () => Promise.resolve({ items: [row(1)] as never, total: EXPORT_MAX_ROWS + 1 }),
      },
    });
    await expect(b.BOOKINGS({})).rejects.toBeInstanceOf(TooManyRowsError);
  });

  it('the export request accepts the booking filters and refuses a bad one', () => {
    const ok = exportRequestSchema.safeParse({
      kind: 'BOOKINGS',
      format: 'CSV',
      params: { statuses: ['PENDING', 'APPROVED'], from: '2026-10-01', paymentStatus: 'PAID' },
    });
    expect(ok.success).toBe(true);
    expect(
      exportRequestSchema.safeParse({
        kind: 'BOOKINGS',
        format: 'CSV',
        params: { statuses: ['NOPE'] },
      }).success,
    ).toBe(false);
    expect(
      exportRequestSchema.safeParse({
        kind: 'BOOKINGS',
        format: 'CSV',
        params: { from: '10/01/2026' },
      }).success,
    ).toBe(false);
  });
});
