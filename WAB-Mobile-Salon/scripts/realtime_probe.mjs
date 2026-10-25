#!/usr/bin/env node
// Listens on the merchant Socket.IO namespace as several members of a LOCAL stack and writes every event they receive
// (MER-054: socket events + permission / branch filtering of the rooms, BUSINESS_DOMAIN §7).
//
// Usage: node scripts/realtime_probe.mjs <local API origin> <dir holding socket.io-client> <out.jsonl> <seconds> label=number ...
// Sign-in uses the fake OTP proof of the local stack (config/remote-capture.json); any other host is refused.
// Run it, then trigger bookings (scripts/capture_remote_fixtures.py) while it listens.
import { createRequire } from 'node:module';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [base, clientDir, out, seconds, ...accounts] = process.argv.slice(2);
const config = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../config/remote-capture.json'), 'utf8'));
if (!config.localHosts.includes(new URL(base).hostname)) throw new Error('realtime_probe: local stack only');
const { io } = createRequire(join(clientDir, 'noop.js'))('socket.io-client');
const MS = 1000;
const NAMESPACE = '/merchant';
writeFileSync(out, '');
const log = (entry) => appendFileSync(out, JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n');

async function login(number) {
  const res = await fetch(`${base}${NAMESPACE}/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'accept-language': config.language },
    body: JSON.stringify({
      phone: { countryCode: config.countryCode, number },
      idToken: config.fakeProofFormat.replace('{}', config.dialCode + number),
      installation: { installationId: `${config.installationPrefix}socket-${number}`, platform: config.platform, appVersion: config.appVersion },
    }),
  });
  const body = await res.json();
  return body?.data;
}

const sockets = [];
for (const pair of accounts) {
  const [label, number] = pair.split('=');
  const session = await login(number);
  const member = session?.member ?? {};
  const socket = io(base + NAMESPACE, { auth: { token: session?.accessToken }, transports: ['websocket'] });
  socket.on('connect', () => log({ label, event: 'connect', role: member.role, branchId: member.branchId, permissions: member.permissions }));
  socket.on('connect_error', (e) => log({ label, event: 'connect_error', message: e.message, data: e.data }));
  socket.onAny((event, payload) => log({ label, event, payload }));
  sockets.push(socket);
}
const bad = io(base + NAMESPACE, { auth: { token: config.invalidSocketToken }, transports: ['websocket'], reconnection: false });
bad.on('connect_error', (e) => log({ label: 'bad-token', event: 'connect_error', message: e.message, data: e.data }));
setTimeout(() => {
  sockets.forEach((s) => s.close());
  bad.close();
  log({ label: 'probe', event: 'done' });
  process.exit(0);
}, Number(seconds) * MS);
