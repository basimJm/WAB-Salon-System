import type { IncomingMessage, ServerResponse } from 'node:http';
import { CONTENT_TYPE_HEADER, UPLOAD_METHOD } from '../constants/codes';
import { OBJECT_KEY_PATTERN } from '../constants/defaults';
import { detectContentType } from '../fileType';
import { LOCAL_PRIVATE_PATH, LOCAL_UPLOAD_PATH, type LocalFsStorage } from './localFs';

const HTTP = {
  OK: 200,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  SERVER_ERROR: 500,
} as const;
const FALLBACK_TYPE = 'application/octet-stream';

const send = (res: ServerResponse, status: number, body = ''): true => {
  res.writeHead(status, { 'X-Content-Type-Options': 'nosniff' });
  res.end(body);
  return true;
};

const readBody = (req: IncomingMessage, limit: number): Promise<Buffer | 'TOO_LARGE'> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > limit) {
        chunks.length = 0;
        req.resume();
        resolve('TOO_LARGE');
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    req.on('error', reject);
  });

const decodeKey = (path: string): string | undefined => {
  try {
    const key = decodeURIComponent(path);
    return OBJECT_KEY_PATTERN.test(key) ? key : undefined;
  } catch {
    return undefined;
  }
};

const serve = (res: ServerResponse, body: Buffer): true => {
  res.writeHead(HTTP.OK, {
    [CONTENT_TYPE_HEADER]: detectContentType(body) ?? FALLBACK_TYPE,
    'Content-Length': body.length,
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
  return true;
};

export type LocalFsHandler = (req: IncomingMessage, res: ServerResponse) => Promise<boolean>;

/**
 * Dev-only HTTP helper for the local-fs adapter: accepts presigned PUT uploads and serves public
 * files and signed private links. Mount it in any Node server; it returns `false` for requests
 * that are not storage URLs so the host app can continue routing.
 */
export const createLocalFsHandler = (storage: LocalFsStorage): LocalFsHandler => {
  const upload = async (req: IncomingMessage, res: ServerResponse, key: string): Promise<true> => {
    const pending = storage.pendingUpload(key);
    if (!pending) return send(res, HTTP.FORBIDDEN);
    if (req.headers['content-type'] !== pending.contentType)
      return send(res, HTTP.UNSUPPORTED_MEDIA_TYPE);
    const body = await readBody(req, pending.maxBytes);
    if (body === 'TOO_LARGE') return send(res, HTTP.PAYLOAD_TOO_LARGE);
    await storage.store(pending.visibility, key, body);
    return send(res, HTTP.OK);
  };

  const handle = async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
    const [path = '', query = ''] = (req.url ?? '').split('?', 2);
    const params = new URLSearchParams(query);
    const segments = path.split('/').filter((part) => part !== '');
    const first = segments[0];
    const rest = segments.slice(1).join('/');
    if (req.method === UPLOAD_METHOD && first === LOCAL_UPLOAD_PATH) {
      const key = decodeKey(rest);
      return key === undefined ? send(res, HTTP.NOT_FOUND) : upload(req, res, key);
    }
    if (req.method !== 'GET' || first === undefined) return false;
    if (first === LOCAL_PRIVATE_PATH) {
      const key = decodeKey(rest);
      if (key === undefined) return send(res, HTTP.NOT_FOUND);
      const valid = storage.verifySignature(
        key,
        Number(params.get('expires')),
        params.get('signature') ?? '',
      );
      if (!valid) return send(res, HTTP.FORBIDDEN);
      const body = await storage.read(key);
      return body ? serve(res, body) : send(res, HTTP.NOT_FOUND);
    }
    const key = decodeKey(segments.join('/'));
    if (key === undefined || (await storage.locate(key)) !== 'PUBLIC')
      return send(res, HTTP.NOT_FOUND);
    const body = await storage.read(key);
    return body ? serve(res, body) : send(res, HTTP.NOT_FOUND);
  };

  return async (req, res) => {
    try {
      return await handle(req, res);
    } catch {
      return send(res, HTTP.SERVER_ERROR);
    }
  };
};
