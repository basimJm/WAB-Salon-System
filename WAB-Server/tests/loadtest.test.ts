import { buildTargets } from '../src/utils/loadtest/cli';
import { formatReport, runLoad, type LoadTarget } from '../src/utils/loadtest/run';
import { percentile, summarize } from '../src/utils/loadtest/stats';

describe('percentile / summarize', () => {
  it('uses the nearest-rank rule', () => {
    const list = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentile(list, 50)).toBe(50);
    expect(percentile(list, 95)).toBe(95);
    expect(percentile(list, 99)).toBe(99);
    expect(percentile(list, 100)).toBe(100);
    expect(percentile([7], 95)).toBe(7);
    expect(percentile([], 95)).toBe(0);
  });

  it('counts errors and orders unsorted input', () => {
    const s = summarize([
      { ms: 30, ok: true },
      { ms: 10, ok: true },
      { ms: 500, ok: false },
      { ms: 20, ok: true },
    ]);
    expect(s).toMatchObject({ requests: 4, errors: 1, errorRate: 0.25, p50: 20, max: 500 });
    expect(summarize([])).toMatchObject({ requests: 0, errorRate: 0, p95: 0, max: 0 });
  });
});

/** A clock the fake requests move forward: each request "takes" its own number of ms. */
const virtualRun = async (
  timings: Record<string, { ms: number; status?: number; throws?: boolean }>,
  durationMs = 1000,
): ReturnType<typeof runLoad> => {
  let clock = 0;
  const targets: LoadTarget[] = Object.entries(timings).map(([name, t]) => ({
    name,
    send: () => {
      clock += t.ms;
      return t.throws === true
        ? Promise.reject(new Error('network'))
        : Promise.resolve(t.status ?? 200);
    },
  }));
  return runLoad({ targets, concurrency: 1, durationMs, now: () => clock });
};

describe('runLoad', () => {
  it('passes fast, healthy targets and reports every one', async () => {
    const report = await virtualRun({ a: { ms: 50 }, b: { ms: 100 } });
    expect(report.passed).toBe(true);
    expect(report.targets.map((t) => t.name)).toEqual(['a', 'b']);
    expect(report.targets.every((t) => t.requests > 0)).toBe(true);
    expect(report.targets[1]?.p95).toBe(100);
  });

  it('fails a target slower than the p95 target', async () => {
    const report = await virtualRun({ fast: { ms: 50 }, slow: { ms: 400 } });
    expect(report.passed).toBe(false);
    expect(report.targets.find((t) => t.name === 'slow')?.passed).toBe(false);
    expect(report.targets.find((t) => t.name === 'fast')?.passed).toBe(true);
  });

  it('counts non-2xx answers and thrown errors as failures', async () => {
    const bad = await virtualRun({ a: { ms: 10, status: 500 } });
    expect(bad.passed).toBe(false);
    expect(bad.targets[0]?.errorRate).toBe(1);
    const thrown = await virtualRun({ a: { ms: 10, throws: true } });
    expect(thrown.targets[0]?.errors).toBe(thrown.targets[0]?.requests);
  });

  it('refuses a run without targets, workers or time', async () => {
    await expect(runLoad({ targets: [], concurrency: 1, durationMs: 10 })).rejects.toThrow(
      RangeError,
    );
    const t: LoadTarget[] = [{ name: 'a', send: () => Promise.resolve(200) }];
    await expect(runLoad({ targets: t, concurrency: 0, durationMs: 10 })).rejects.toThrow(
      RangeError,
    );
    await expect(runLoad({ targets: t, concurrency: 1, durationMs: 0 })).rejects.toThrow(
      RangeError,
    );
  });

  it('prints a table with the verdict per target', async () => {
    const text = formatReport(await virtualRun({ fast: { ms: 50 }, slow: { ms: 400 } }));
    expect(text).toContain('PASS');
    expect(text).toContain('FAIL');
    expect(text).toContain('fast');
  });
});

describe('buildTargets', () => {
  it('calls the customer endpoints with the token and the availability body', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const real = globalThis.fetch;
    globalThis.fetch = ((url: string, init: RequestInit) => {
      calls.push({ url, init });
      return Promise.resolve(new Response('{}', { status: 200 }));
    }) as typeof fetch;
    try {
      const targets = buildTargets({
        baseUrl: 'https://api.example.test',
        token: 'tok',
        salonId: 's1',
        serviceId: 'sv1',
        date: '2026-10-13',
        gender: 'FEMALE',
      });
      expect(targets.map((t) => t.name)).toEqual([
        'home',
        'search',
        'salon-details',
        'availability',
      ]);
      for (const t of targets) expect(await t.send()).toBe(200);
      expect(calls.map((c) => c.url)).toEqual([
        'https://api.example.test/customer/v1/home?gender=FEMALE',
        'https://api.example.test/customer/v1/salons?gender=FEMALE',
        'https://api.example.test/customer/v1/salons/s1',
        'https://api.example.test/customer/v1/salons/s1/availability',
      ]);
      expect((calls[0]?.init.headers as Record<string, string>)['Authorization']).toBe(
        'Bearer tok',
      );
      expect(JSON.parse(calls[3]?.init.body as string)).toEqual({
        date: '2026-10-13',
        person: { isBride: false, serviceIds: ['sv1'] },
      });
    } finally {
      globalThis.fetch = real;
    }
  });
});
