import { adminToken, BASE } from './lib.mjs';
import { writeFileSync } from 'node:fs';
const ROOT = new URL('../src/data/contract/generated', import.meta.url).pathname;
const dto = await import(`${ROOT}/dto.ts`);
const { OPERATIONS } = await import(`${ROOT}/operations.ts`);
const token = await adminToken();
const out = [];
const get = async (path, query = '') => {
  const res = await fetch(`${BASE}${path}${query}`, {
    headers: { authorization: `Bearer ${token}`, 'accept-language': 'en' },
  });
  let json;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
};
const ids = {};
const q = (op) => (op.hasQuery ? '?page=1&pageSize=25' : '');
const NEED = {
  getReportsDaily: '?date=2026-10-19',
  getReportsWeekly: '?from=2026-10-13',
  getReportsMonthly: '?month=2026-10',
  getAnalyticsOverview: '?from=2026-10-01T00:00:00.000Z&to=2026-10-20T00:00:00.000Z',
  getAnalyticsEvents: '?from=2026-10-01T00:00:00.000Z&to=2026-10-20T00:00:00.000Z&groupBy=NAME',
  getSalonsByIdAnalytics: '?from=2026-10-01&to=2026-10-19',
  getSearch: '?q=noor',
};
const ops = Object.values(OPERATIONS).filter((o) => o.method === 'get');
const SALON = process.env.QA_SALON_ID ?? '';
for (const op of ops) {
  let path = op.path;
  const params = [...path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  if (params.length) {
    const base = path.slice(0, path.indexOf('{'));
    if (path.includes('/salons/{id}')) path = path.replace('{id}', SALON);
    else {
      const list = await get(base.replace(/\/$/, ''), '?page=1&pageSize=1');
      const first = Array.isArray(list.json?.data) ? list.json.data[0] : null;
      if (!first?.id) {
        out.push(`SKIP ${op.id} (no sample for ${base})`);
        continue;
      }
      path = path.replace('{id}', first.id);
    }
    if (/\{\w+\}/.test(path)) {
      out.push(`SKIP ${op.id} (params ${params.join(',')})`);
      continue;
    }
  }
  const res = await get(path, NEED[op.id] ?? q(op));
  const schemaFn = dto[`${op.id}DataSchema`];
  if (!schemaFn) {
    out.push(`NOSCHEMA ${op.id}`);
    continue;
  }
  if (res.status === 404 || res.status === 422 || res.status >= 500) {
    out.push(`HTTP ${res.status} ${op.id} ${path} ${JSON.stringify(res.json?.error?.code)}`);
    continue;
  }
  if (res.status !== 200) {
    out.push(`STATUS ${res.status} ${op.id} ${JSON.stringify(res.json?.error)?.slice(0, 120)}`);
    continue;
  }
  const parsed = schemaFn().safeParse(res.json.data);
  out.push(
    parsed.success
      ? `OK   ${op.id}`
      : `BAD  ${op.id}: ${JSON.stringify(parsed.error.issues.slice(0, 3).map((i) => i.path.join('.') + ' ' + i.code + ' ' + i.message))}`,
  );
}
writeFileSync(process.env.QA_REPORT ?? 'qa-contract.txt', out.join('\n') + '\n');
console.log('CONTRACT-DONE', out.filter((l) => l.startsWith('BAD')).length, 'bad');
