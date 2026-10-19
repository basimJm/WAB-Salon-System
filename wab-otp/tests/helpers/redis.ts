import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { Redis } from 'ioredis';

export interface TestRedis {
  readonly client: Redis;
  readonly stop: () => Promise<void>;
}

const freePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      const port = typeof address === 'object' && address !== null ? address.port : 0;
      probe.close(() => {
        resolve(port);
      });
    });
  });

const connectWhenReady = async (url: string, server?: ChildProcess): Promise<Redis> => {
  const deadline = Date.now() + 8000;
  for (;;) {
    const client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
    });
    client.on('error', () => undefined);
    try {
      await client.connect();
      await client.ping();
      return client;
    } catch {
      if (client.status !== 'end') client.disconnect();
      if (server?.exitCode != null) throw new Error('redis-server exited before it was ready');
      if (Date.now() > deadline) throw new Error('redis-server did not become ready in time');
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
};

/** A real Redis on localhost: `REDIS_TEST_URL` if set, else a throwaway `redis-server` process. */
export const startTestRedis = async (): Promise<TestRedis> => {
  const external = process.env['REDIS_TEST_URL'];
  if (external !== undefined && external !== '') {
    const client = await connectWhenReady(external);
    return {
      client,
      stop: async () => {
        await client.quit();
      },
    };
  }
  const port = await freePort();
  const server = spawn(
    'redis-server',
    ['--port', String(port), '--save', '', '--appendonly', 'no'],
    {
      stdio: 'ignore',
    },
  );
  const client = await connectWhenReady(`redis://127.0.0.1:${String(port)}`, server);
  return {
    client,
    stop: async () => {
      await client.quit();
      server.kill();
    },
  };
};
