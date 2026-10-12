import { createServer, type Server } from 'node:http';
import { createApp } from './app';
import { loadConfig, type AppConfig } from './config';
import { createLogger, type Logger } from './utils/logger';
import {
  createShutdown,
  registerProcessHandlers,
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

/**
 * Starts listening and wires graceful shutdown. Process-level crash/signal handlers are only
 * registered when a `proc` is passed (the real entry point does; tests do not).
 * Database, Redis, Socket.IO and queues add themselves to the closing order in later tasks.
 */
export const startServer = async (
  config: AppConfig,
  logger: Logger,
  proc?: ProcessLike,
): Promise<RunningServer> => {
  const app = createApp({
    logger,
    security: { corsAllowedOrigins: config.corsAllowedOrigins },
    trustProxyHops: config.trustProxyHops,
    docs: !config.isProduction,
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
  const shutdown = createShutdown([{ name: 'http', close: () => closeHttpServer(server) }], logger);
  if (proc) registerProcessHandlers(proc, logger, shutdown);
  logger.info({ port: config.port, env: config.env }, 'server listening');
  return { server, shutdown };
};

const main = async (): Promise<void> => {
  const config = loadConfig();
  const logger = createLogger({ level: config.logLevel });
  await startServer(config, logger, process);
};

if (require.main === module) {
  main().catch((error: unknown) => {
    // Logger may not exist yet (invalid config), so write the reason to stderr and fail.
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
