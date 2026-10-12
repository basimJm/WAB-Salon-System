import type { z } from 'zod';
import {
  BEARER_PREFIX,
  HTTP_HEADERS,
  HTTP_METHODS,
  HTTP_RETRY,
  HTTP_TIMEOUT_MS,
  JSON_CONTENT_TYPE,
  type HttpMethod,
} from '@/constants/http';
import { HTTP_LANGUAGE_HEADER, type Language } from '@/constants/i18n';
import { AppError } from '../errors/AppError';
import { kindFromResponse, normalizeError } from '../errors/normalize';
import type { Logger } from '../logger/logger';
import { errorEnvelopeSchema, successEnvelope, type ApiResult } from './envelope';

export type FetchFn = (input: string, init: RequestInit) => Promise<Response>;

export interface HttpClientOptions {
  baseUrl: string;
  fetchFn?: FetchFn;
  getToken: () => string | null;
  getLanguage: () => Language;
  /** Called once on a 401 so the session layer can sign out. */
  onUnauthorized?: () => void;
  logger?: Logger;
  timeoutMs?: number;
  /** Injectable so tests do not wait for real backoff. */
  sleep?: (ms: number) => Promise<void>;
}

export interface RequestOptions<T> {
  schema: z.ZodType<T>;
  query?: Readonly<Record<string, string | number | boolean | undefined>>;
  body?: unknown;
  signal?: AbortSignal;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const isIdempotent = (method: HttpMethod) => method === HTTP_METHODS[0];

export class HttpClient {
  private readonly opts: HttpClientOptions;

  constructor(opts: HttpClientOptions) {
    this.opts = opts;
  }

  get<T>(path: string, o: RequestOptions<T>) {
    return this.request('GET', path, o);
  }
  post<T>(path: string, o: RequestOptions<T>) {
    return this.request('POST', path, o);
  }
  put<T>(path: string, o: RequestOptions<T>) {
    return this.request('PUT', path, o);
  }
  patch<T>(path: string, o: RequestOptions<T>) {
    return this.request('PATCH', path, o);
  }
  delete<T>(path: string, o: RequestOptions<T>) {
    return this.request('DELETE', path, o);
  }

  /** Sends the request; retries idempotent calls on transient failures; always rejects with AppError. */
  async request<T>(method: HttpMethod, path: string, o: RequestOptions<T>): Promise<ApiResult<T>> {
    const sleep = this.opts.sleep ?? defaultSleep;
    const attempts = isIdempotent(method) ? HTTP_RETRY.maxAttempts : 1;
    let lastError: AppError | undefined;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await this.once(method, path, o);
      } catch (e) {
        lastError = normalizeError(e);
        const retry = attempt < attempts && this.shouldRetry(lastError);
        this.opts.logger?.warn('http.failed', {
          method,
          path,
          kind: lastError.kind,
          attempt,
          retry,
        });
        if (!retry) break;
        const delay = Math.min(HTTP_RETRY.baseDelayMs * 2 ** (attempt - 1), HTTP_RETRY.maxDelayMs);
        await sleep(delay);
      }
    }
    throw lastError ?? new AppError({ kind: 'unknown' });
  }

  private shouldRetry(error: AppError): boolean {
    if (error.kind === 'network' || error.kind === 'timeout') return true;
    return (
      error.status !== undefined && HTTP_RETRY.retryableStatuses.some((s) => s === error.status)
    );
  }

  private buildUrl(path: string, query: RequestOptions<unknown>['query']): string {
    const url = new URL(path, this.opts.baseUrl);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  private buildInit(method: HttpMethod, o: RequestOptions<unknown>): RequestInit {
    const headers: Record<string, string> = {
      [HTTP_LANGUAGE_HEADER]: this.opts.getLanguage(),
    };
    const token = this.opts.getToken();
    if (token) headers[HTTP_HEADERS.authorization] = `${BEARER_PREFIX} ${token}`;
    if (o.body !== undefined) headers[HTTP_HEADERS.contentType] = JSON_CONTENT_TYPE;
    const timeout = AbortSignal.timeout(this.opts.timeoutMs ?? HTTP_TIMEOUT_MS);
    const signal = o.signal ? AbortSignal.any([o.signal, timeout]) : timeout;
    return {
      method,
      headers,
      signal,
      ...(o.body !== undefined ? { body: JSON.stringify(o.body) } : {}),
    };
  }

  private async once<T>(
    method: HttpMethod,
    path: string,
    o: RequestOptions<T>,
  ): Promise<ApiResult<T>> {
    const doFetch = this.opts.fetchFn ?? ((input, init) => fetch(input, init));
    const response = await doFetch(this.buildUrl(path, o.query), this.buildInit(method, o));
    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) throw this.toError(response.status, payload);
    const parsed = successEnvelope(o.schema).safeParse(payload);
    if (!parsed.success)
      throw new AppError({ kind: 'parse', status: response.status, cause: parsed.error });
    const { data, message, meta } = parsed.data;
    return meta ? { data, message, meta } : { data, message };
  }

  private toError(status: number, payload: unknown): AppError {
    const parsed = errorEnvelopeSchema.safeParse(payload);
    const kind = kindFromResponse(status, parsed.success ? parsed.data.error.code : undefined);
    if (kind === 'unauthorized') this.opts.onUnauthorized?.();
    if (!parsed.success) return new AppError({ kind, status });
    const { message, error } = parsed.data;
    return new AppError({
      kind,
      status,
      code: error.code,
      ...(error.details ? { details: error.details } : {}),
      ...(error.traceId ? { traceId: error.traceId } : {}),
      serverMessage: message,
    });
  }
}
