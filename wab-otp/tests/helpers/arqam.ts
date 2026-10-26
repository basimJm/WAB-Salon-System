import type { FetchLike } from '../../src/adapters/http';

export interface Call {
  readonly url: string;
  readonly method: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: unknown;
}

export type Reply = { status: number; body?: unknown; raw?: string } | Error;

/** Scripted ARQAM endpoint: one reply per call (the last one repeats). No network. */
export const stubArqam = (...replies: Reply[]): { fetch: FetchLike; calls: Call[] } => {
  const calls: Call[] = [];
  const fetch: FetchLike = (url, init) => {
    calls.push({
      url,
      method: init.method,
      headers: init.headers,
      body: init.body === undefined ? undefined : (JSON.parse(init.body) as unknown),
    });
    const reply = replies[Math.min(calls.length - 1, replies.length - 1)];
    if (reply === undefined) return Promise.reject(new Error('no reply scripted'));
    if (reply instanceof Error) return Promise.reject(reply);
    const text = reply.raw ?? (reply.body === undefined ? '' : JSON.stringify(reply.body));
    return Promise.resolve({ status: reply.status, text: () => Promise.resolve(text) });
  };
  return { fetch, calls };
};

export const accepted = (messageId = 'msg-1'): Reply => ({
  status: 200,
  body: { success: true, messageId, status: 'sent', cost: 25 },
});

export const refused = (status: number, errorCode?: string, retryAfter?: number): Reply => ({
  status,
  body: {
    success: false,
    ...(errorCode === undefined ? {} : { errorCode }),
    errorMessage: 'arqam says no',
    ...(retryAfter === undefined ? {} : { retryAfter }),
  },
});

export const noSleep = { sleep: (): Promise<void> => Promise.resolve(), random: (): number => 0.5 };

export const AQ = {
  apiKey: 'aq_test_secret_value',
  templates: { ar: 'wab_otp_ar', en: 'wab_otp_en' },
  fallbackLanguage: 'ar',
} as const;
