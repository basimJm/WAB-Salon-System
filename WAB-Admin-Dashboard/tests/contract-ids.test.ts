import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import { optionalQuery } from '@/data/api/endpoint';
import * as dto from '@/data/contract/generated/dto';
import { AppError } from '@/infrastructure/errors/AppError';
import { listFiles } from './helpers/files';
import { makeContainer } from './helpers/render';

const ROOT = process.cwd();
const ID = '64e000000000000000000001';
const UPPER_ID = '64E0A0B0C0D0E0F000000001';
const BAD_IDS = ['nope', `${ID}0`, 'g4e000000000000000000001'];
const REASON = 'QA';

/** Every place where the panel used to re-check ids with its own pattern (server issue S6), now on generated schemas. */
const SITES: ReadonlyArray<readonly [string, () => z.ZodType, (id: string) => unknown]> = [
  ['getBookings salonId', dto.getBookingsQuerySchema, (id) => ({ salonId: id, branchId: id })],
  ['getBookings customerId', dto.getBookingsQuerySchema, (id) => ({ customerId: id })],
  [
    'postBookingsByIdReassign',
    dto.postBookingsByIdReassignBodySchema,
    (id) => ({ personIndex: 0, staffId: id, reason: REASON }),
  ],
  [
    'postCatalogRequestsByIdApprove',
    dto.postCatalogRequestsByIdApproveBodySchema,
    (id) => ({ catalogServiceId: id, reason: REASON }),
  ],
  ['getCustomers cityId', dto.getCustomersQuerySchema, (id) => ({ cityId: id })],
  [
    'patchCustomersById',
    dto.patchCustomersByIdBodySchema,
    (id) => ({ cityId: id, areaId: id, reason: REASON }),
  ],
  [
    'postExports CUSTOMERS',
    dto.postExportsBodySchema,
    (id) => ({ kind: 'CUSTOMERS', format: 'XLSX', params: { cityId: id } }),
  ],
  [
    'postExports TRANSACTIONS',
    dto.postExportsBodySchema,
    (id) => ({ kind: 'TRANSACTIONS', format: 'CSV', params: { salonId: id, branchId: id } }),
  ],
  ['getSalons cityId', dto.getSalonsQuerySchema, (id) => ({ cityId: id })],
  ['getSalonsByIdMembers', dto.getSalonsByIdMembersQuerySchema, (id) => ({ branchId: id })],
  ['getLocationsAreas', dto.getLocationsAreasQuerySchema, (id) => ({ cityId: id })],
  [
    'postLocationsAreas',
    dto.postLocationsAreasBodySchema,
    (id) => ({ cityId: id, name: { ar: 'ع', en: 'A' }, reason: REASON }),
  ],
  ['getReviews', dto.getReviewsQuerySchema, (id) => ({ salonId: id, branchId: id, staffId: id })],
  ['postReviewsBulk', dto.postReviewsBulkBodySchema, (id) => ({ ids: [id], decision: 'approve' })],
  ['getRefunds', dto.getRefundsQuerySchema, (id) => ({ bookingId: id, salonId: id, branchId: id })],
  [
    'getTransactions',
    dto.getTransactionsQuerySchema,
    (id) => ({ salonId: id, branchId: id, customerId: id, bookingId: id }),
  ],
  [
    'getFinanceReconciliation',
    dto.getFinanceReconciliationQuerySchema,
    (id) => ({ salonId: id, branchId: id }),
  ],
  ['putSalonsByIdHours', dto.putSalonsByIdHoursQuerySchema, (id) => ({ branchId: id })],
  [
    'postSalonsByIdServices query',
    dto.postSalonsByIdServicesQuerySchema,
    (id) => ({ branchId: id }),
  ],
  [
    'postSalonsByIdServices body',
    dto.postSalonsByIdServicesBodySchema,
    (id) => ({ catalogServiceId: id, price: '10.000', durationMinutes: 30, reason: REASON }),
  ],
  [
    'postSalonsByIdMembersByMemberIdBranch',
    dto.postSalonsByIdMembersByMemberIdBranchBodySchema,
    (id) => ({ branchId: id, reason: REASON }),
  ],
  [
    'putSalonsByIdGalleryOrder',
    dto.putSalonsByIdGalleryOrderBodySchema,
    (id) => ({ ids: [id], reason: REASON }),
  ],
  ['getAuditLogs', dto.getAuditLogsQuerySchema, (id) => ({ adminId: id })],
  ['getRecommended', dto.getRecommendedQuerySchema, (id) => ({ salonId: id })],
  [
    'postRecommended',
    dto.postRecommendedBodySchema,
    (id) => ({
      salonId: id,
      startAt: '2026-11-01T00:00:00.000Z',
      endAt: null,
      amountPaid: '50.000',
      reason: REASON,
    }),
  ],
  [
    'putRecommendedReorder',
    dto.putRecommendedReorderBodySchema,
    (id) => ({ businessType: 'SALON', ids: [id], reason: REASON }),
  ],
  [
    'getPayoutsPreview',
    dto.getPayoutsPreviewQuerySchema,
    (id) => ({ salonId: id, periodTo: '2026-10-31T21:00:00.000Z' }),
  ],
  ['getPayouts', dto.getPayoutsQuerySchema, (id) => ({ salonId: id })],
  [
    'postPayouts',
    dto.postPayoutsBodySchema,
    (id) => ({ salonId: id, periodTo: '2026-10-31T21:00:00.000Z' }),
  ],
  [
    'postCampaignsAudienceSize',
    dto.postCampaignsAudienceSizeBodySchema,
    (id) => ({ app: 'CUSTOMER', audience: { kind: 'CITY', cityIds: [id] } }),
  ],
  [
    'postCampaigns audience',
    dto.postCampaignsBodySchema,
    (id) => ({
      title: { ar: 'ع', en: 'T' },
      body: { ar: 'ع', en: 'B' },
      app: 'CUSTOMER',
      audience: { kind: 'SPECIFIC_USERS', customerIds: [id] },
      reason: REASON,
    }),
  ],
];

describe('contract 1.5.0 id patterns (SRV-151, server issue S6 fixed)', () => {
  it('every 24-character id pattern of the snapshot is ^[a-fA-F0-9]{24}$ with no leaked flag', () => {
    const spec = readFileSync(join(ROOT, 'contract/openapi.admin.json'), 'utf8');
    const patterns = [...spec.matchAll(/"pattern": "([^"]*\{24\}[^"]*)"/g)].map((m) => m[1]);
    expect(patterns.length).toBeGreaterThan(0);
    expect(new Set(patterns)).toEqual(new Set(['^[a-fA-F0-9]{24}$']));
  });

  it.each(SITES)(
    '%s accepts real ids (lower and upper case) and refuses malformed ones',
    (_n, schema, of) => {
      expect(schema().safeParse(of(ID)).success).toBe(true);
      expect(schema().safeParse(of(UPPER_ID)).success).toBe(true);
      for (const bad of BAD_IDS) expect(schema().safeParse(of(bad)).success).toBe(false);
    },
  );

  it('optionalQuery keeps the generated check and also accepts no query (main branch)', () => {
    const query = optionalQuery(dto.patchSalonsByIdClosuresByClosureIdQuerySchema);
    expect(query().safeParse(undefined).success).toBe(true);
    expect(query().safeParse({ branchId: ID }).success).toBe(true);
    expect(query().safeParse({ branchId: 'nope' }).success).toBe(false);
  });

  it('no hand-written id pattern is left in the data layer', () => {
    const files = listFiles(join(ROOT, 'src/data'), /\.ts$/).filter(
      (f) => !f.includes('generated'),
    );
    for (const file of files) expect(readFileSync(file, 'utf8'), file).not.toMatch(/\{24\}/);
  });
});

describe('repositories send ids through the generated schemas', () => {
  it('a real city id reaches the export; a malformed one stops before the request', async () => {
    const { repositories } = makeContainer();
    const job = await repositories.exports.request({
      kind: 'CUSTOMERS',
      format: 'XLSX',
      params: { cityId: ID },
    });
    expect(job.kind).toBe('CUSTOMERS');
    const bad = repositories.exports.request({
      kind: 'SALONS',
      format: 'XLSX',
      params: { cityId: 'x' },
    });
    await expect(bad).rejects.toBeInstanceOf(AppError);
    await expect(bad).rejects.toMatchObject({ kind: 'validation' });
  });

  it('reconciliation runs with no scope, a real scope, and refuses a malformed salon id', async () => {
    const { repositories } = makeContainer();
    await expect(repositories.transactions.reconciliation()).resolves.toBeTruthy();
    await expect(
      repositories.transactions.reconciliation({ salonId: UPPER_ID, branchId: ID }),
    ).resolves.toBeTruthy();
    await expect(repositories.transactions.reconciliation({ salonId: 'x' })).rejects.toMatchObject({
      kind: 'validation',
    });
  });
});
