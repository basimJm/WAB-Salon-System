import type { NextFunction, Request, Response } from 'express';
import { REQUEST_ID_HEADER, REQUEST_ID_MAX_LENGTH } from '../src/constants/logging';
import { requestId } from '../src/middlewares/requestId';
import { createLogger } from '../src/utils/logger';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const run = (
  incoming?: string,
): { req: Request; headers: Record<string, string>; next: jest.Mock } => {
  const headers: Record<string, string> = {};
  const req = {
    get: (name: string): string | undefined =>
      name.toLowerCase() === REQUEST_ID_HEADER ? incoming : undefined,
  } as unknown as Request;
  const res = {
    setHeader: (name: string, value: string): void => {
      headers[name] = value;
    },
  } as unknown as Response;
  const next = jest.fn();
  requestId(createLogger({ level: 'silent' }))(req, res, next as NextFunction);
  return { req, headers, next };
};

describe('requestId middleware', () => {
  it('generates a UUID when no header is sent', () => {
    const { req, headers, next } = run();
    expect(req.id).toMatch(UUID_PATTERN);
    expect(headers[REQUEST_ID_HEADER]).toBe(req.id);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('reuses a well-formed incoming id', () => {
    const { req, headers } = run('client-id_1.2');
    expect(req.id).toBe('client-id_1.2');
    expect(headers[REQUEST_ID_HEADER]).toBe('client-id_1.2');
  });

  it.each([
    ['too long', 'a'.repeat(REQUEST_ID_MAX_LENGTH + 1)],
    ['has spaces', 'bad id'],
    ['has newline (header injection)', 'abc\nSet-Cookie: x=1'],
    ['empty', ''],
  ])('replaces an unusable incoming id (%s)', (_label, value) => {
    const { req } = run(value);
    expect(req.id).toMatch(UUID_PATTERN);
  });

  it('binds a child logger to the request id', () => {
    const { req } = run('trace-7');
    expect(req.log.bindings()).toMatchObject({ traceId: 'trace-7' });
  });

  it('generates a different id per request', () => {
    expect(run().req.id).not.toBe(run().req.id);
  });
});
