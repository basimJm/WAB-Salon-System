import {
  LOADTEST_DEFAULT_CONCURRENCY,
  LOADTEST_DEFAULT_DURATION_SEC,
  LOADTEST_ENV,
  LOADTEST_REQUEST_TIMEOUT_MS,
} from '../../constants/loadtest';
import { MS_PER_SECOND } from '../../constants/time';
import { formatReport, runLoad, type LoadTarget } from './run';

const need = (name: string): string => {
  const value = process.env[name];
  if (value === undefined || value === '') throw new Error(`${name} is required`);
  return value;
};
const number = (name: string, fallback: number): number => {
  const raw = process.env[name];
  const parsed = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1)
    throw new Error(`${name} must be a positive integer`);
  return parsed;
};

/** `LOADTEST_BASE_URL=https://… LOADTEST_CUSTOMER_TOKEN=… … node dist/utils/loadtest/cli.js` */
export const buildTargets = (env: {
  baseUrl: string;
  token: string;
  salonId: string;
  serviceId: string;
  date: string;
  gender: string;
}): LoadTarget[] => {
  const call = async (path: string, init: RequestInit = {}): Promise<number> => {
    const response = await fetch(`${env.baseUrl}${path}`, {
      ...init,
      headers: {
        'Accept-Language': 'en',
        Authorization: `Bearer ${env.token}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(LOADTEST_REQUEST_TIMEOUT_MS),
    });
    await response.arrayBuffer();
    return response.status;
  };
  const customer = '/customer/v1';
  return [
    { name: 'home', send: () => call(`${customer}/home?gender=${env.gender}`) },
    { name: 'search', send: () => call(`${customer}/salons?gender=${env.gender}`) },
    { name: 'salon-details', send: () => call(`${customer}/salons/${env.salonId}`) },
    {
      name: 'availability',
      send: () =>
        call(`${customer}/salons/${env.salonId}/availability`, {
          method: 'POST',
          body: JSON.stringify({
            date: env.date,
            person: { isBride: false, serviceIds: [env.serviceId] },
          }),
        }),
    },
  ];
};

const main = async (): Promise<void> => {
  const targets = buildTargets({
    baseUrl: need(LOADTEST_ENV.baseUrl).replace(/\/$/, ''),
    token: need(LOADTEST_ENV.customerToken),
    salonId: need(LOADTEST_ENV.salonId),
    serviceId: need(LOADTEST_ENV.serviceId),
    date: need(LOADTEST_ENV.date),
    gender: process.env[LOADTEST_ENV.gender] ?? 'FEMALE',
  });
  const report = await runLoad({
    targets,
    concurrency: number(LOADTEST_ENV.concurrency, LOADTEST_DEFAULT_CONCURRENCY),
    durationMs: number(LOADTEST_ENV.durationSec, LOADTEST_DEFAULT_DURATION_SEC) * MS_PER_SECOND,
  });
  process.stdout.write(formatReport(report));
  process.exitCode = report.passed ? 0 : 1;
};

if (require.main === module) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'load test failed'}\n`);
    process.exitCode = 1;
  });
}
