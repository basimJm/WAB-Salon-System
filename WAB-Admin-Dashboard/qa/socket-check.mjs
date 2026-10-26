/**
 * Realtime check against a LOCAL WAB-Server (see docs/REAL_SERVER_QA.md): connects to the `/admin` namespace the way the
 * panel does (path, namespace, `auth.token`, websocket only), triggers server events through the public APIs and writes
 * every received event name + payload keys to the report. Also checks the handshake refusals (no token, wrong scope).
 * Usage: node qa/socket-check.mjs (QA_REPORT=<file>). Never run it against a shared server: it creates data.
 */
import { writeFileSync } from 'node:fs';
import { io } from 'socket.io-client';
import { PDF, adminToken, api, BASE, installation, proof, putTo } from './lib.mjs';

const PATH = '/socket.io';
/** Not a JWT: the server must refuse it with UNAUTHORIZED. */
const MALFORMED = 'malformed';
const NS = '/admin';
const WAIT_MS = Number(process.env.QA_SOCKET_WAIT_MS ?? 4000);
const out = [];
const received = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Connects and resolves with the socket, or with the connect_error message. */
const open = (auth) =>
  new Promise((resolve) => {
    const s = io(`${BASE}${NS}`, {
      path: PATH,
      transports: ['websocket'],
      auth,
      reconnection: false,
    });
    s.on('connect', () => resolve({ socket: s, error: null }));
    s.on('connect_error', (e) => {
      resolve({ socket: s, error: e.message, active: s.active });
      s.close();
    });
  });

const none = await open({});
out.push(`HANDSHAKE no token -> ${none.error} (active=${String(none.active)})`);
const bad = await open({ token: MALFORMED });
out.push(`HANDSHAKE bad token -> ${bad.error} (active=${String(bad.active)})`);
const merchantPhone = '791000001';
const merchant = await api('merchant', 'POST', '/auth/login', {
  phone: { countryCode: 'JO', number: merchantPhone },
  otpToken: await proof('merchant', `+962${merchantPhone}`, 'LOGIN'),
  installation: installation(`qa-merchant-${merchantPhone}-dev`),
});
const wrong = await open({ token: merchant.data?.accessToken });
out.push(`HANDSHAKE merchant token on /admin -> ${wrong.error} (active=${String(wrong.active)})`);

const token = await adminToken();
const { socket, error } = await open({ token });
out.push(`HANDSHAKE admin token -> ${error ?? 'connected'}`);
socket.onAny((event, payload) => received.push({ event, keys: Object.keys(payload ?? {}).sort() }));

// application.created + alert.created (SALON_APPLICATION): a new salon application.
const n = String(Date.now()).slice(-6);
const pres = await api('merchant', 'POST', '/uploads/license/presign', {
  contentType: 'application/pdf',
  size: PDF.length,
});
await putTo(pres.data.upload, PDF);
await api('merchant', 'POST', '/uploads/license/confirm', { key: pres.data.key });
const areas = (
  await api('admin', 'GET', '/locations/areas', undefined, token, '?page=1&pageSize=1')
).data;
const app = await api('merchant', 'POST', '/salon/applications', {
  phone: { countryCode: 'JO', number: `792${n}` },
  otpToken: await proof('merchant', `+962792${n}`, 'REGISTER'),
  firstName: 'Qa',
  lastName: 'Socket',
  salon: { name: `QA Socket ${n}`, gender: 'FEMALE', cityId: areas[0].cityId, areaId: areas[0].id },
  documentKeys: [pres.data.key],
  installation: installation(`qa-socket-${n}-dev`),
});
out.push(`ACTION salon application -> ${String(app.status)}`);

// booking.updated (+ refund.updated when the booking was paid online): admin cancels an open booking.
const open1 = (
  await api('admin', 'GET', '/bookings', undefined, token, '?page=1&pageSize=1&tab=UPCOMING')
).data?.[0];
if (open1) {
  const c = await api(
    'admin',
    'POST',
    `/bookings/${open1.id}/cancel`,
    { mode: 'ADMIN', reason: 'QA socket check' },
    token,
  );
  out.push(
    `ACTION cancel booking ${open1.referenceNumber} (${open1.paymentMethod}) -> ${String(c.status)}`,
  );
} else out.push('ACTION cancel booking -> SKIP (no upcoming booking; run qa/seed.mjs)');

await sleep(WAIT_MS);
socket.close();
for (const r of received) out.push(`EVENT ${r.event} {${r.keys.join(',')}}`);
writeFileSync(process.env.QA_REPORT ?? 'qa-socket.txt', out.join('\n') + '\n');
console.log('SOCKET-DONE', received.length, 'events');
process.exit(0);
