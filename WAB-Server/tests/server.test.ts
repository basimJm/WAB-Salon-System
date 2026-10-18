import { EventEmitter } from 'node:events';
import request from 'supertest';
import { loadConfig } from '../src/config';
import { EXIT_CODE_OK } from '../src/constants/errorMapping';
import { startServer } from '../src/server';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { connectRedis, disconnectRedis } from '../src/utils/redis/client';
import { io as connect } from 'socket.io-client';
import { startTestRedis } from './helpers/redis';
import { createLogger } from '../src/utils/logger';

const logger = createLogger({ level: 'silent' });
const baseConfig = loadConfig({
  MONGODB_URI: 'mongodb://localhost/x',
  REDIS_URL: 'redis://localhost',
  JWT_ACCESS_SECRET: 'a'.repeat(48),
});
const testConfig = { ...baseConfig, port: 0 };

describe('startServer', () => {
  it('listens, serves requests and shuts down gracefully', async () => {
    const { server, shutdown } = await startServer(testConfig, logger);
    expect(server.listening).toBe(true);
    const res = await request(server).get('/nope');
    expect(res.status).toBe(404);
    await shutdown();
    expect(server.listening).toBe(false);
    await shutdown();
  });

  it('registers process handlers only when a process is given', async () => {
    const proc = Object.assign(new EventEmitter(), { exit: jest.fn() });
    const { server, shutdown } = await startServer(testConfig, logger, { proc });
    expect(proc.listenerCount('SIGTERM')).toBe(1);
    expect(proc.listenerCount('uncaughtException')).toBe(1);
    proc.emit('SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(server.listening).toBe(false);
    expect(proc.exit).toHaveBeenCalledWith(EXIT_CODE_OK);
    await shutdown();
  });

  it('fails when the port is already in use', async () => {
    const first = await startServer(testConfig, logger);
    const address = first.server.address();
    const port = typeof address === 'object' && address !== null ? address.port : 0;
    await expect(startServer({ ...testConfig, port }, logger)).rejects.toThrow();
    await first.shutdown();
  });

  it('serves Socket.IO when given Redis and closes the open sockets on shutdown', async () => {
    const testRedis = await startTestRedis();
    const redis = await connectRedis({ redis: { url: testRedis.url } }, logger);
    const { server, shutdown, sockets } = await startServer(testConfig, logger, {
      socket: { redis },
    });
    expect(sockets).toBeDefined();
    const address = server.address();
    const port = typeof address === 'object' && address !== null ? address.port : 0;
    const client = connect(`http://127.0.0.1:${String(port)}/customer`, {
      transports: ['websocket'],
      reconnection: false,
      auth: {
        token: signAccessToken({
          secret: testConfig.auth.accessSecret,
          subjectType: 'CUSTOMER',
          subjectId: '65a000000000000000000001',
          ttlSec: 60,
        }).token,
      },
    });
    await new Promise<void>((resolve, reject) => {
      client.once('connect', resolve);
      client.once('connect_error', reject);
    });
    const dropped = new Promise((resolve) => client.once('disconnect', resolve));
    await shutdown();
    await dropped;
    expect(server.listening).toBe(false);
    expect(client.connected).toBe(false);
    client.close();
    await disconnectRedis(redis);
    await testRedis.stop();
  });
});
