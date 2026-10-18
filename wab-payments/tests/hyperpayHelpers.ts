import { createPayments, type PaymentProvider } from '../src';
import type { HttpClient, HttpRequest, HttpResponse } from '../src/http';
import { noSleep } from './helpers';

export const ENTITY = 'entity-123';
export const TOKEN = 'token-abc-123456';
export const WEBHOOK_KEY = '00112233445566778899aabbccddeeff'.repeat(2);

export type Script = (request: HttpRequest) => HttpResponse | Promise<HttpResponse>;

export const reply = (status: number, body: unknown): HttpResponse => ({
  status,
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

/** A scripted gateway: answers each request with the next script entry (the last one repeats). */
export const scripted = (...entries: Script[]): { http: HttpClient; requests: HttpRequest[] } => {
  const requests: HttpRequest[] = [];
  let index = 0;
  const http: HttpClient = async (request) => {
    requests.push(request);
    const entry = entries[Math.min(index, entries.length - 1)];
    index += 1;
    if (entry === undefined) throw new Error('no scripted answer');
    return entry(request);
  };
  return { http, requests };
};

export const hyperpayPayments = (
  http: HttpClient,
  extra: Partial<Parameters<typeof createPayments>[0]> = {},
): PaymentProvider =>
  createPayments({
    environment: 'dev',
    provider: 'hyperpay',
    http,
    retryDeps: noSleep,
    hyperpay: {
      entityId: ENTITY,
      accessToken: TOKEN,
      shopperResultUrl: 'wab://payment/result',
      webhookDecryptionKey: WEBHOOK_KEY,
    },
    ...extra,
  });

export const paymentBody = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'pay-1',
  paymentType: 'DB',
  paymentBrand: 'VISA',
  amount: '12.500',
  currency: 'JOD',
  merchantTransactionId: 'draft-1',
  result: { code: '000.100.110', description: 'Request successfully processed' },
  card: { bin: '411111', last4Digits: '1111', holder: 'A B' },
  ndc: 'chk-1',
  ...over,
});

export const CHECKOUT_OK = {
  result: { code: '000.200.100', description: 'successfully created checkout' },
  id: 'chk-1',
  integrity: 'sha384-abc',
};
