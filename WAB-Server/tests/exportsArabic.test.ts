import { exportRequestSchema } from '../src/domain/exports/exportRequest';
import { createTableBuilders } from '../src/domain/exports/tableBuilders';
import { renderTable } from '../src/domain/exports/writers';

const NOW = new Date('2026-10-26T09:00:00.000Z');

describe('Arabic PDF and new export kinds (SRV-126)', () => {
  it('a PDF embeds the Arabic-capable font instead of the Latin standard font', async () => {
    const file = await renderTable(
      {
        title: 'الصالونات',
        columns: ['Name', 'الاسم'],
        rows: [['Hifa', 'صالون هيفاء للتجميل']],
      },
      'PDF',
    );
    const pdf = file.body.toString('latin1');
    expect(file.contentType).toBe('application/pdf');
    expect(pdf).toContain('IBMPlexSansArabic');
    expect(pdf).not.toContain('/BaseFont /Helvetica');
  });

  it('exports customers and salons with the filters of their screens', async () => {
    const asked: Record<string, unknown>[] = [];
    const builders = createTableBuilders({
      reports: {} as never,
      transactions: {} as never,
      adminSettings: {} as never,
      bookings: {} as never,
      customers: {
        list: (input) => {
          asked.push({ ...input });
          return Promise.resolve({
            items: [
              {
                id: 'c1',
                name: 'رنا خالد',
                phone: '+962790000001',
                gender: 'FEMALE',
                cityId: 'amman',
                status: 'ACTIVE',
                registeredAt: NOW,
                lastActiveAt: null,
                bookingsCount: 3,
              },
            ],
            total: 1,
          });
        },
      },
      salons: {
        list: ({ filter }) => {
          asked.push({ ...filter });
          return Promise.resolve({
            items: [
              {
                id: 's1',
                name: 'Hifa',
                gender: 'FEMALE',
                state: 'LIVE',
                cityId: 'amman',
                areaId: null,
                rating: { avg: 4.5, count: 8 },
                subscriptionStatus: 'TRIAL',
                recommended: true,
                bookings30d: 12,
                deletionRequestedAt: null,
                createdAt: NOW,
              },
            ],
            meta: { page: 1, pageSize: 100, total: 1 },
          });
        },
      },
    });
    const customers = await builders.CUSTOMERS({ status: 'ACTIVE', q: 'رنا' });
    expect(customers.rows).toEqual([
      ['رنا خالد', '+962790000001', 'FEMALE', 'amman', 'ACTIVE', NOW.toISOString(), null, 3],
    ]);
    const salons = await builders.SALONS({ state: 'LIVE' });
    expect(salons.rows[0]).toEqual([
      'Hifa',
      'FEMALE',
      'LIVE',
      'amman',
      4.5,
      8,
      'TRIAL',
      'yes',
      12,
      NOW.toISOString(),
    ]);
    expect(asked[0]).toMatchObject({ status: 'ACTIVE', q: 'رنا' });
    expect(asked[1]).toMatchObject({ state: 'LIVE' });
  });

  it('accepts the new kinds and validates their filters', () => {
    expect(
      exportRequestSchema.safeParse({
        kind: 'CUSTOMERS',
        format: 'PDF',
        params: { status: 'ACTIVE' },
      }).success,
    ).toBe(true);
    expect(
      exportRequestSchema.safeParse({ kind: 'SALONS', format: 'XLSX', params: { state: 'NOPE' } })
        .success,
    ).toBe(false);
  });
});
