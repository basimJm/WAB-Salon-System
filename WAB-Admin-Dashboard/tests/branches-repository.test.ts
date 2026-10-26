import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from '@/data/api/ApiClient';
import { RemoteBranchesRepository } from '@/data/branches/RemoteBranchesRepository';
import { HttpClient, type FetchFn } from '@/infrastructure/http/HttpClient';

const BRANCH = {
  id: '6adf0da8a2ab115e76fee5d1',
  name: { ar: 'طبربور', en: 'Tabarbour' },
  isMain: true,
  status: 'ACTIVE',
  location: { latitude: 31.95, longitude: 35.91 },
  locationText: 'Abdoun, Amman',
  cityId: null,
  areaId: null,
  phone: null,
  whatsapp: null,
  weeklySchedule: [{ day: 'SAT', isOff: false, open: '09:00', close: '21:00' }],
  offline: null,
  completeness: { missing: [], isComplete: true },
};

const repo = (body: object) => {
  const fetchFn = vi.fn<FetchFn>(() =>
    Promise.resolve(new Response(JSON.stringify(body), { status: 200 })),
  );
  const http = new HttpClient({
    baseUrl: 'https://api.test',
    fetchFn,
    getToken: () => 'tok',
    getLanguage: () => 'en',
  });
  return { branches: new RemoteBranchesRepository(new ApiClient(http)), fetchFn };
};

describe('RemoteBranchesRepository.list (e2e finding: the server sends no meta)', () => {
  it('reads every branch from an answer without pagination meta, as the real server sends it', async () => {
    const { branches, fetchFn } = repo({ success: true, message: 'ok', data: [BRANCH] });
    const list = await branches.list('6adf0da8a2ab115e76fee5ca');
    expect(list.map((b) => b.name.en)).toEqual(['Tabarbour']);
    expect(String(fetchFn.mock.calls[0]?.[0])).toContain(
      '/admin/v1/salons/6adf0da8a2ab115e76fee5ca/branches',
    );
  });

  it('still reads an answer that carries meta', async () => {
    const meta = { page: 1, pageSize: 1, total: 1, totalPages: 1 };
    const { branches } = repo({ success: true, message: 'ok', data: [BRANCH], meta });
    expect(await branches.list('6adf0da8a2ab115e76fee5ca')).toHaveLength(1);
  });

  it('refuses a malformed branch', async () => {
    const { branches } = repo({ success: true, message: 'ok', data: [{ id: 'x' }] });
    await expect(branches.list('6adf0da8a2ab115e76fee5ca')).rejects.toMatchObject({
      kind: 'parse',
    });
  });
});
