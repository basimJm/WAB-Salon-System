import type { CommandClass, S3Command, S3Deps, S3Output } from '../src/adapters/s3/deps';

interface Entry {
  body: Buffer;
  contentType: string;
}

const notFound = (): Error =>
  Object.assign(new Error('nf'), { name: 'NotFound', $metadata: { httpStatusCode: 404 } });

/** A tiny S3 emulator behind the adapter's dependency seam (no network, no AWS SDK). */
export class FakeS3 {
  readonly buckets = new Map<string, Map<string, Entry>>();
  readonly calls: { type: string; input: Record<string, unknown> }[] = [];
  /** Errors thrown by the next calls of a command type (consumed in order). */
  readonly failures = new Map<string, unknown[]>();
  readonly presigned: { input: Record<string, unknown>; expiresIn: number; headers?: string[] }[] =
    [];
  /** Extra answer for DeleteObjects `Errors`. */
  deleteErrors: { Key?: string; Code?: string }[] = [];
  /** Overrides the size HEAD reports. */
  headSize: number | null | undefined;

  bucket(name: string): Map<string, Entry> {
    let bucket = this.buckets.get(name);
    if (!bucket) {
      bucket = new Map();
      this.buckets.set(name, bucket);
    }
    return bucket;
  }

  put(bucket: string, key: string, body: Buffer, contentType = 'application/octet-stream'): void {
    this.bucket(bucket).set(key, { body, contentType });
  }

  failNext(type: string, ...errors: unknown[]): void {
    this.failures.set(type, [...(this.failures.get(type) ?? []), ...errors]);
  }

  count(type: string): number {
    return this.calls.filter((call) => call.type === type).length;
  }

  private command(type: string): CommandClass {
    return class implements S3Command {
      readonly type = type;
      constructor(readonly input: Record<string, unknown>) {}
    };
  }

  private run(command: S3Command & { type?: string }): S3Output {
    const type = command.type ?? '';
    const input = command.input;
    this.calls.push({ type, input });
    const failure = this.failures.get(type)?.shift();
    if (failure !== undefined) throw failure as Error;
    const bucket = this.bucket(String(input['Bucket']));
    const key = String(input['Key']);
    if (type === 'Put') {
      bucket.set(key, { body: input['Body'] as Buffer, contentType: String(input['ContentType']) });
      return {};
    }
    if (type === 'DeleteObjects') {
      const objects = (input['Delete'] as { Objects: { Key: string }[] }).Objects;
      objects.forEach((o) => bucket.delete(o.Key));
      return { Errors: this.deleteErrors };
    }
    const entry = bucket.get(key);
    if (!entry)
      throw type === 'Head'
        ? notFound()
        : Object.assign(new Error('nk'), { name: 'NoSuchKey', $metadata: { httpStatusCode: 404 } });
    if (type === 'Head')
      return {
        ContentLength: this.headSize === undefined ? entry.body.length : (this.headSize as number),
        ContentType: entry.contentType,
      };
    const range = input['Range'] as string | undefined;
    const end = range ? Number(range.split('-')[1]) + 1 : entry.body.length;
    const slice = entry.body.subarray(0, end);
    return {
      ContentLength: entry.body.length,
      Body: { transformToByteArray: () => Promise.resolve(new Uint8Array(slice)) },
    };
  }

  deps(): S3Deps {
    return {
      send: (command) =>
        new Promise((resolve) => {
          resolve(this.run(command));
        }),
      presign: (command, options) => {
        const input = command.input;
        this.presigned.push({
          input,
          expiresIn: options.expiresIn,
          ...(options.signableHeaders ? { headers: [...options.signableHeaders] } : {}),
        });
        return Promise.resolve(
          `https://s3.test/${String(input['Bucket'])}/${String(input['Key'])}?X-Amz-Expires=${String(options.expiresIn)}`,
        );
      },
      commands: {
        Put: this.command('Put'),
        Head: this.command('Head'),
        Get: this.command('Get'),
        DeleteObjects: this.command('DeleteObjects'),
      },
    };
  }
}
