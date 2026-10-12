import { createServer, type Server } from 'node:http';
import type { Redis } from 'ioredis';
import { createApp } from './app';
import { loadConfig, type AppConfig } from './config';
import {
  createMongoReadinessCheck,
  connectMongo,
  disconnectMongo,
} from './utils/database/connection';
import type { ReadinessCheck } from './utils/health';
import { connectRedis, createRedisReadinessCheck, disconnectRedis } from './utils/redis/client';
import { createLogger, type Logger } from './utils/logger';
import {
  createShutdown,
  registerProcessHandlers,
  type Closable,
  type ProcessLike,
} from './utils/process/lifecycle';

export interface RunningServer {
  readonly server: Server;
  readonly shutdown: () => Promise<void>;
}

const closeHttpServer = (server: Server): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
    server.closeIdleConnections();
  });

export interface StartOptions {
  /** Registers crash/signal handlers; only the real entry point passes it. */
  readonly proc?: ProcessLike;
  /** Resources opened before the server started, closed (in this order) after HTTP stops. */
  readonly closables?: readonly Closable[];
  /** Dependency probes for `/ready`. */
  readonly readinessChecks?: readonly ReadinessCheck[];
}

/**
 * Starts listening and wires graceful shutdown: HTTP stops first, then the given resources
 * (MongoDB now; Redis, Socket.IO and queues add themselves in later tasks).
 */
export const startServer = async (
  config: AppConfig,
  logger: Logger,
  { proc, closables = [], readinessChecks = [] }: StartOptions = {},
): Promise<RunningServer> => {
  const app = createApp({
    logger,
    security: { corsAllowedOrigins: config.corsAllowedOrigins },
    trustProxyHops: config.trustProxyHops,
    docs: !config.isProduction,
    readinessChecks,
  });
  // Plain http server: Express 5's `app.listen` passes listen errors to its callback as if started.
  const server = await new Promise<Server>((resolve, reject) => {
    const listening = createServer(app);
    listening.once('error', reject);
    listening.listen(config.port, () => {
      listening.off('error', reject);
      resolve(listening);
    });
  });
  const shutdown = createShutdown(
    [{ name: 'http', close: () => closeHttpServer(server) }, ...closables],
    logger,
  );
  if (proc) registerProcessHandlers(proc, logger, shutdown);
  logger.info({ port: config.port, env: config.env }, 'server listening');
  return { server, shutdown };
};

const main = async (): Promise<void> => {
  const config = loadConfig();
  const logger = createLogger({ level: config.logLevel });
  const mongo = await connectMongo(config, logger);
  let redis: Redis | undefined;
  try {
    redis = await connectRedis(config, logger);
    const connected = redis;
    await startServer(config, logger, {
      proc: process,
      closables: [
        { name: 'redis', close: () => disconnectRedis(connected) },
        { name: 'mongodb', close: disconnectMongo },
      ],
      readinessChecks: [createMongoReadinessCheck(mongo), createRedisReadinessCheck(connected)],
    });
  } catch (error) {
    if (redis) await disconnectRedis(redis);
    await disconnectMongo();
    throw error;
  }
};

if (require.main === module) {
  main().catch((error: unknown) => {
    // Logger may not exist yet (invalid config), so write the reason to stderr and fail.
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
