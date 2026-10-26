import type { FetchLike } from '../../src/adapters/whatsapp/options';

export interface Call {
  readonly url: string;
  readonly method: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: unknown;
}

export type Reply = { status: number; body?: unknown; raw?: string } | Error;

/** Scripted Meta endpoint: one reply per call (the last one repeats). */
export const stubMeta = (...replies: Reply[]): { fetch: FetchLike; calls: Call[] } => {
  const calls: Call[] = [];
  const fetch: FetchLike = (url, init) => {
    calls.push({
      url,
      method: init.method,
      headers: init.headers,
      body: JSON.parse(init.body) as unknown,
    });
    const reply = replies[Math.min(calls.length - 1, replies.length - 1)];
    if (reply === undefined) return Promise.reject(new Error('no reply scripted'));
    if (reply instanceof Error) return Promise.reject(reply);
    const text = reply.raw ?? (reply.body === undefined ? '' : JSON.stringify(reply.body));
    return Promise.resolve({ status: reply.status, text: () => Promise.resolve(text) });
  };
  return { fetch, calls };
};

export const accepted = (id = 'wamid.TEST'): Reply => ({
  status: 200,
  body: {
    messaging_product: 'whatsapp',
    contacts: [{ input: '962791234567', wa_id: '962791234567' }],
    messages: [{ id }],
  },
});

export const metaError = (status: number, code: number, subcode?: number): Reply => ({
  status,
  body: {
    error: {
      message: 'meta says no',
      type: 'OAuthException',
      code,
      ...(subcode === undefined ? {} : { error_subcode: subcode }),
      fbtrace_id: 'trace-1',
    },
  },
});

export const noSleep = { sleep: (): Promise<void> => Promise.resolve(), random: (): number => 0.5 };

export const WA = {
  phoneNumberId: '1234567890',
  accessToken: 'EAAtest-token-value',
  templateName: 'wab_otp',
  languageCodes: { ar: 'ar', en: 'en_US' },
} as const;
