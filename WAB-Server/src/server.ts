import { createServer, type Server } from 'node:http';
import type { Store } from 'express-rate-limit';
import type { Redis } from 'ioredis';
import { createApp } from './app';
import { createCustomerAuthService } from './domain/auth/customerAuth.service';
import { createAdminLoginService } from './domain/auth/adminLogin.service';
import { createAdminAuthService } from './domain/auth/adminAuth.service';
import { createMerchantAuthService } from './domain/auth/merchantAuth.service';
import { createRefreshTokenService } from './domain/auth/refreshTokens.service';
import { optionalAuth, requireAuth } from './middlewares/auth';
import { createAppConfigService } from './domain/appConfig';
import {
  AppVersionsRepository,
  ContactInfoRepository,
  MaintenanceRepository,
} from './repositories/appConfig.repository';
import { createInstallationService } from './domain/installations/installations.service';
import { createProviders } from './providers';
import {
  AdminsRepository,
  CustomersRepository,
  InstallationsRepository,
  MembersRepository,
  RefreshTokensRepository,
} from './repositories/identity.repository';
import {
  AreasRepository,
  CitiesRepository,
  CountriesRepository,
} from './repositories/locations.repository';
import { createOtpGate } from './domain/otp/otpGate.service';
import { createSettingsService } from './domain/settings';
import type { ApiServices } from './modules/services';
import { SettingsRepository } from './repositories/settings.repository';
import { loadConfig, type AppConfig } from './config';
import {
  createMongoReadinessCheck,
  connectMongo,
  disconnectMongo,
} from './utils/database/connection';
import type { ReadinessCheck } from './utils/health';
import { REDIS_KEY_PREFIX } from './constants/redis';
import { ALL_MODELS } from './models';
import { ensureIndexes } from './utils/database/indexes';
import { RedisRateLimitStore } from './utils/redis/rateLimitStore';
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
  /** Shared store for the global rate limit; without it each instance counts on its own. */
  readonly rateLimitStore?: Store;
  /** Services for the feature routers (OTP gate...). */
  readonly services?: ApiServices;
}

/**
 * Starts listening and wires graceful shutdown: HTTP stops first, then the given resources
 * (MongoDB now; Redis, Socket.IO and queues add themselves in later tasks).
 */
export const startServer = async (
  config: AppConfig,
  logger: Logger,
  { proc, closables = [], readinessChecks = [], rateLimitStore, services }: StartOptions = {},
): Promise<RunningServer> => {
  const app = createApp({
    logger,
    security: {
      corsAllowedOrigins: config.corsAllowedOrigins,
      ...(rateLimitStore === undefined ? {} : { rateLimitStore }),
    },
    trustProxyHops: config.trustProxyHops,
    docs: !config.isProduction,
    readinessChecks,
    ...(services === undefined ? {} : { services }),
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

/** Services the feature routers need; built once, after MongoDB and Redis are connected. */
const buildServices = (config: AppConfig, logger: Logger, redis: Redis): ApiServices => {
  const settings = createSettingsService({ store: new SettingsRepository(), redis, logger });
  const otpGate = createOtpGate({ redis, settings });
  const providers = createProviders(config.providers, config.isProduction);
  const phoneServices = {
    countries: new CountriesRepository(),
    otp: providers.otp,
    otpGate,
    refreshTokens: createRefreshTokenService({ repository: new RefreshTokensRepository(), logger }),
    settings,
    accessSecret: config.auth.accessSecret,
  };
  const merchantAuthService = createMerchantAuthService({
    ...phoneServices,
    members: new MembersRepository(),
    installations: new InstallationsRepository(),
  });
  const admins = new AdminsRepository();
  const adminAuthService = createAdminAuthService({
    admins,
    refreshTokens: phoneServices.refreshTokens,
    settings,
    logger,
    accessSecret: config.auth.accessSecret,
  });
  const adminLoginService = createAdminLoginService({
    auth: adminAuthService,
    admins,
    redis,
    notifier: providers.notifier,
    settings,
    logger,
    secret: config.auth.accessSecret,
  });
  const customerAuthService = createCustomerAuthService({
    ...phoneServices,
    customers: new CustomersRepository(),
    installations: new InstallationsRepository(),
    cities: new CitiesRepository(),
    areas: new AreasRepository(),
  });
  const installationService = createInstallationService({
    installations: new InstallationsRepository(),
    customers: new CustomersRepository(),
    members: new MembersRepository(),
    analytics: providers.analytics,
    logger,
  });
  const appConfig = createAppConfigService({
    appVersions: new AppVersionsRepository(),
    maintenance: new MaintenanceRepository(),
    contactInfo: new ContactInfoRepository(),
    settings,
  });
  return {
    otpGate,
    appConfig,
    installations: {
      service: installationService,
      customerOptional: optionalAuth('customer', config.auth.accessSecret),
      customerRequired: requireAuth('customer', config.auth.accessSecret),
      merchantRequired: requireAuth('merchant', config.auth.accessSecret),
    },
    merchantAuth: merchantAuthService,
    adminAuth: { service: adminAuthService, login: adminLoginService },
    customerAuth: {
      service: customerAuthService,
      authenticate: requireAuth('customer', config.auth.accessSecret),
    },
    rateLimitStore: new RedisRateLimitStore(redis, `${REDIS_KEY_PREFIX.httpRateLimit}:otp`),
  };
};

const main = async (): Promise<void> => {
  const config = loadConfig();
  const logger = createLogger({ level: config.logLevel });
  const mongo = await connectMongo(config, logger);
  let redis: Redis | undefined;
  try {
    await ensureIndexes(ALL_MODELS, logger);
    redis = await connectRedis(config, logger);
    const connected = redis;
    await startServer(config, logger, {
      proc: process,
      closables: [
        { name: 'redis', close: () => disconnectRedis(connected) },
        { name: 'mongodb', close: disconnectMongo },
      ],
      readinessChecks: [createMongoReadinessCheck(mongo), createRedisReadinessCheck(connected)],
      rateLimitStore: new RedisRateLimitStore(
        connected,
        `${REDIS_KEY_PREFIX.httpRateLimit}:global`,
      ),
      services: buildServices(config, logger, connected),
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
