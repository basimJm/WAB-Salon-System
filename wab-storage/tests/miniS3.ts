import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

interface Entry {
  body: Buffer;
  contentType: string;
}

const errorXml = (code: string): string =>
  `<?xml version="1.0" encoding="UTF-8"?><Error><Code>${code}</Code><Message>${code}</Message><RequestId>req-1</RequestId></Error>`;

const readAll = async (req: IncomingMessage): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
};

/**
 * A minimal S3 wire emulator (path-style, no auth checks) so the real AWS SDK can be exercised
 * end to end on localhost: PUT, HEAD, GET (+Range), POST ?delete and scripted error answers.
 */
export class MiniS3 {
  readonly buckets = new Map<string, Map<string, Entry>>();
  /** Scripted failures: [status, S3 error code] consumed by the next requests. */
  readonly failures: [number, string][] = [];
  readonly requests: string[] = [];
  private server: Server | undefined;
  endpoint = '';

  async start(): Promise<void> {
    this.server = createServer((req, res) => {
      void this.handle(req, res).catch(() => {
        res.writeHead(500).end(errorXml('InternalError'));
      });
    });
    await new Promise<void>((resolve) => this.server?.listen(0, '127.0.0.1', resolve));
    this.endpoint = `http://127.0.0.1:${String((this.server.address() as AddressInfo).port)}`;
  }

  async stop(): Promise<void> {
    this.server?.closeAllConnections();
    await new Promise((resolve) => this.server?.close(resolve));
  }

  bucket(name: string): Map<string, Entry> {
    let bucket = this.buckets.get(name);
    if (!bucket) {
      bucket = new Map();
      this.buckets.set(name, bucket);
    }
    return bucket;
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const [path = '', query = ''] = (req.url ?? '').split('?', 2);
    const [, bucketName = '', ...rest] = path.split('/');
    const key = rest.map(decodeURIComponent).join('/');
    const method = req.method ?? '';
    this.requests.push(`${method} ${bucketName}/${key}${query ? `?${query}` : ''}`);
    const failure = this.failures.shift();
    if (failure) {
      await readAll(req);
      res.writeHead(failure[0], { 'Content-Type': 'application/xml' });
      res.end(method === 'HEAD' ? undefined : errorXml(failure[1]));
      return;
    }
    const bucket = this.bucket(bucketName);
    if (method === 'PUT') {
      bucket.set(key, {
        body: await readAll(req),
        contentType: String(req.headers['content-type']),
      });
      res.writeHead(200, { ETag: '"etag"' }).end();
    } else if (method === 'POST' && query.startsWith('delete')) {
      const xml = (await readAll(req)).toString();
      for (const match of xml.matchAll(/<Key>(.*?)<\/Key>/g)) bucket.delete(match[1] ?? '');
      res.writeHead(200, { 'Content-Type': 'application/xml' });
      res.end('<?xml version="1.0" encoding="UTF-8"?><DeleteResult></DeleteResult>');
    } else if (method === 'HEAD' || method === 'GET') {
      const entry = bucket.get(key);
      if (!entry) {
        res.writeHead(404, { 'Content-Type': 'application/xml' });
        res.end(method === 'HEAD' ? undefined : errorXml('NoSuchKey'));
        return;
      }
      const range = /bytes=(\d+)-(\d+)/.exec(req.headers['range'] ?? '');
      const body = range ? entry.body.subarray(Number(range[1]), Number(range[2]) + 1) : entry.body;
      res.writeHead(range ? 206 : 200, {
        'Content-Type': entry.contentType,
        'Content-Length': method === 'HEAD' ? entry.body.length : body.length,
        ...(range
          ? {
              'Content-Range': `bytes ${range[1] ?? ''}-${String(body.length - 1)}/${String(entry.body.length)}`,
            }
          : {}),
      });
      res.end(method === 'HEAD' ? undefined : body);
    } else {
      res.writeHead(405).end();
    }
  }
}
