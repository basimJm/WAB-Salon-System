import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { Redis } from 'ioredis';

export interface TestRedis {
  readonly url: string;
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

const waitUntilReady = async (url: string, server?: ChildProcess): Promise<void> => {
  const deadline = Date.now() + 8_000;
  for (;;) {
    const probe = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
    });
    probe.on('error', () => undefined);
    try {
      await probe.connect();
      await probe.ping();
      probe.disconnect();
      return;
    } catch {
      probe.disconnect();
      if (server?.exitCode != null) throw new Error('redis-server exited before it was ready');
      if (Date.now() > deadline) throw new Error('redis-server did not become ready in time');
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
};

/**
 * A real Redis for tests. Uses `REDIS_TEST_URL` when set (CI service container); otherwise starts a
 * throwaway `redis-server` on a free port. Fails loudly, with instructions, when neither exists.
 */
export const startTestRedis = async (): Promise<TestRedis> => {
  const external = process.env['REDIS_TEST_URL'];
  if (external) {
    await waitUntilReady(external);
    return { url: external, stop: () => Promise.resolve() };
  }
  const port = await freePort();
  const server = spawn(
    'redis-server',
    ['--port', String(port), '--bind', '127.0.0.1', '--save', '', '--appendonly', 'no'],
    { stdio: 'ignore' },
  );
  const spawnError = new Promise<never>((_resolve, reject) => {
    server.once('error', () => {
      reject(
        new Error(
          'Redis tests need redis-server on PATH or REDIS_TEST_URL (for example redis://127.0.0.1:6379).',
        ),
      );
    });
  });
  const url = `redis://127.0.0.1:${String(port)}`;
  await Promise.race([waitUntilReady(url, server), spawnError]);
  return {
    url,
    stop: () =>
      new Promise((resolve) => {
        server.once('exit', () => {
          resolve();
        });
        server.kill('SIGTERM');
      }),
  };
};
