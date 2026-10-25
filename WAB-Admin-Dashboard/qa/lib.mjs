import { createHmac } from 'node:crypto';
import { execSync } from 'node:child_process';
import { appendFileSync, writeFileSync } from 'node:fs';
export const BASE = process.env.QA_API ?? 'http://127.0.0.1:4000';
const LOG = process.env.QA_LOG ?? 'qa-seed.log';
export const log = (...a) =>
  appendFileSync(
    LOG,
    a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ') + '\n',
  );
export const resetLog = () => writeFileSync(LOG, '');
export async function api(ns, method, path, body, token, query = '') {
  const res = await fetch(`${BASE}/${ns}/v1${path}${query}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'accept-language': 'en',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  if (!res.ok) log('FAIL', method, ns + path, res.status, JSON.stringify(json).slice(0, 400));
  return { status: res.status, ok: res.ok, json, data: json?.data };
}
export const proof = (phone) => `fake-otp:valid:${phone}`;
export const installation = (id) => ({
  installationId: id,
  platform: 'ANDROID',
  appVersion: '1.0.0',
});
const SECRET = process.env.JWT_ACCESS_SECRET ?? 'qa-local-secret-qa-local-secret-qa-local-1234';
const ADMIN = {
  email: process.env.ADMIN_EMAIL ?? 'qa.admin@wab.example',
  password: process.env.ADMIN_PASSWORD ?? 'QaAdminPass#2026',
};
export function adminOtp() {
  const keys = execSync(
    `redis-cli -p ${process.env.QA_REDIS_PORT ?? 6380} --scan --pattern "*admin:otp:*"`,
  )
    .toString()
    .split('\n')
    .filter((k) => k && !k.includes('resend'));
  for (const k of keys) {
    const stored = execSync(`redis-cli -p ${process.env.QA_REDIS_PORT ?? 6380} get "${k}"`)
      .toString()
      .trim();
    const id = k.split(':').pop();
    for (let i = 0; i < 1e6; i++) {
      const c = String(i).padStart(6, '0');
      if (createHmac('sha256', SECRET).update(`${id}:${c}`).digest('hex') === stored) return c;
    }
  }
  throw new Error('no otp');
}
/** Signs in (or reuses QA_ADMIN_TOKEN: admin logins are rate limited to a few per window). */
export async function adminToken() {
  if (process.env.QA_ADMIN_TOKEN) return process.env.QA_ADMIN_TOKEN;
  const l = await api('admin', 'POST', '/auth/login', ADMIN);
  if (l.status === 429)
    throw new Error('admin login rate limited: wait for the window or set QA_ADMIN_TOKEN');
  const v = await api('admin', 'POST', '/auth/verify-otp', {
    email: ADMIN.email,
    code: adminOtp(),
  });
  return v.data?.accessToken ?? v.data?.tokens?.accessToken;
}

/** Uploads bytes to a presigned target (real MinIO). */
export async function putTo(upload, bytes) {
  const res = await fetch(upload.url, {
    method: upload.method,
    headers: upload.headers,
    body: bytes,
  });
  if (!res.ok) log('PUT FAIL', res.status, (await res.text()).slice(0, 200));
  return res.ok;
}
export const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
export const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
