import { ConnectionStates, type Connection } from 'mongoose';
import {
  buildMongoOptions,
  connectMongo,
  createMongoReadinessCheck,
} from '../src/utils/database/connection';
import {
  MONGO_MAX_POOL_SIZE,
  MONGO_READINESS_CHECK_NAME,
  MONGO_SERVER_SELECTION_TIMEOUT_MS,
} from '../src/constants/database';
import { ExternalServiceError } from '../src/utils/errors';
import { createLogger } from '../src/utils/logger';
import { runReadinessChecks } from '../src/utils/health';

describe('buildMongoOptions', () => {
  it('uses the timeouts and pool size from constants', () => {
    const options = buildMongoOptions({ isProduction: false });
    expect(options.serverSelectionTimeoutMS).toBe(MONGO_SERVER_SELECTION_TIMEOUT_MS);
    expect(options.maxPoolSize).toBe(MONGO_MAX_POOL_SIZE);
  });

  it('builds indexes automatically outside production only', () => {
    expect(buildMongoOptions({ isProduction: false }).autoIndex).toBe(true);
    expect(buildMongoOptions({ isProduction: true }).autoIndex).toBe(false);
  });

  it('lets callers override a setting', () => {
    expect(buildMongoOptions({ isProduction: false }, { maxPoolSize: 3 }).maxPoolSize).toBe(3);
  });
});

describe('connectMongo', () => {
  it('rejects with a typed 503 error and never leaks the connection string', async () => {
    const uri = 'mongodb://user:s3cretpass@127.0.0.1:1/wab';
    const lines: string[] = [];
    const capturing = createLogger({
      level: 'error',
      destination: { write: (line: string) => void lines.push(line) },
    });
    const error: unknown = await connectMongo({ isProduction: false, mongo: { uri } }, capturing, {
      serverSelectionTimeoutMS: 300,
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ExternalServiceError);
    expect((error as ExternalServiceError).httpStatus).toBe(503);
    expect((error as ExternalServiceError).message).not.toContain('s3cretpass');
    expect(lines.join('')).not.toContain('s3cretpass');
    expect(lines.length).toBeGreaterThan(0);
  });
});

describe('createMongoReadinessCheck', () => {
  const connection = (
    readyState: number,
    ping: () => Promise<unknown>,
  ): Pick<Connection, 'readyState' | 'db'> =>
    ({ readyState, db: { admin: () => ({ ping }) } }) as unknown as Pick<
      Connection,
      'readyState' | 'db'
    >;

  it('is up when connected and the server answers a ping', async () => {
    const check = createMongoReadinessCheck(
      connection(ConnectionStates.connected, () => Promise.resolve({ ok: 1 })),
    );
    expect(check.name).toBe(MONGO_READINESS_CHECK_NAME);
    expect((await runReadinessChecks([check]))[0]?.status).toBe('up');
  });

  it('is down when the connection is not open, without pinging', async () => {
    const ping = jest.fn();
    const check = createMongoReadinessCheck(connection(ConnectionStates.disconnected, ping));
    expect((await runReadinessChecks([check]))[0]?.status).toBe('down');
    expect(ping).not.toHaveBeenCalled();
  });

  it('is down when the ping fails', async () => {
    const check = createMongoReadinessCheck(
      connection(ConnectionStates.connected, () => Promise.reject(new Error('timeout'))),
    );
    expect((await runReadinessChecks([check]))[0]?.status).toBe('down');
  });
});
