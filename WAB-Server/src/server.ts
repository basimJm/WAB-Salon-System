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
import { createContentService } from './domain/content';
import { ContentPagesRepository, FaqsRepository } from './repositories/content.repository';
import { createAdminBannerService } from './domain/adminCrud/banners';
import { createBannersService } from './domain/banners';
import { BannersRepository } from './repositories/banners.repository';
import { createAdminCrud } from './domain/adminCrud/adminCrud.service';
import { createCatalogService } from './domain/catalog';
import type { CatalogServiceRaw } from './models/catalogService.model';
import { CatalogServicesRepository } from './repositories/catalog.repository';
import { createSalonApplicationService } from './domain/salons/salonApplication.service';
import { SalonsRepository } from './repositories/salons.repository';
import { createSalonStateService, createStaffFacts } from './domain/salons/salonState.service';
import { createSalonProfileService } from './domain/salons/salonProfile.service';
import { loadMember } from './middlewares/permission';
import { createImageVariants } from './domain/uploads/variants';
import { createCatalogRequestsService } from './domain/catalog/catalogRequests.service';
import { CatalogRequestsRepository } from './repositories/catalogRequests.repository';
import { createAccountLifecycleService } from './domain/auth/accountLifecycle.service';
import { createPhoneVerifier } from './domain/auth/phoneVerifier';
import { createAdminSalonsService } from './domain/salons/adminSalons.service';
import { createConflictFinder } from './domain/salons/conflicts';
import { createSalonDetailsService } from './domain/salonDetails/salonDetails.service';
import { createFavoritesService } from './domain/favorites/favorites.service';
import { FavoritesRepository } from './repositories/favorites.repository';
import { createAdminReviewsService } from './domain/reviews/adminReviews.service';
import { createCustomerProfileService } from './domain/customers/customerProfile.service';
import { createBookingActionsService } from './domain/bookings/bookingActions.service';
import { createBookingReassignService } from './domain/bookings/bookingReassign.service';
import { createBookingCancelService } from './domain/bookings/bookingCancel.service';
import { createBookingCreationService } from './domain/bookings/bookingCreation.service';
import { BookingsRepository } from './repositories/bookings.repository';
import { createBookingDraftService } from './domain/bookings/bookingDraft.service';
import { BookingDraftsRepository } from './repositories/bookingDrafts.repository';
import { createAvailabilityService } from './domain/availability/availability.service';
import { createHoldsStore } from './domain/availability/holds';
import { createPlacementsService } from './domain/placements/placements.service';
import { PlacementsRepository } from './repositories/placements.repository';
import { createReviewsService } from './domain/reviews/reviews.service';
import { ReviewsRepository } from './repositories/reviews.repository';
import { createHomeService } from './domain/home/home.service';
import { createSearchService } from './domain/search/search.service';
import { createPolicyService } from './domain/salons/policy.service';
import { createLeavesService } from './domain/team/leaves.service';
import { LeavesRepository } from './repositories/leaves.repository';
import { createStaffService } from './domain/team/staff.service';
import { createTeamService } from './domain/team/team.service';
import { createSalonServicesService } from './domain/salonServices/salonServices.service';
import { SalonServicesRepository } from './repositories/salonServices.repository';
import { createHoursService } from './domain/salons/hoursService';
import { ClosuresRepository } from './repositories/closures.repository';
import { createGalleryService } from './domain/gallery/gallery.service';
import { GalleryRepository } from './repositories/gallery.repository';
import { createUploadsService } from './domain/uploads/uploads.service';
import { UploadsRepository } from './repositories/uploads.repository';
import { createSalonReviewService } from './domain/salons/salonReview.service';
import { SubscriptionsRepository } from './repositories/subscriptions.repository';
import { createAuditWriter } from './domain/audit/audit.service';
import { createAdminContentServices } from './domain/adminCrud/content';
import { createAdminLocationServices } from './domain/adminCrud/locations';
import { AuditLogsRepository } from './repositories/auditLogs.repository';
import { createLocationsService } from './domain/locations';
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
  const locations = createLocationsService({
    countries: new CountriesRepository(),
    cities: new CitiesRepository(),
    areas: new AreasRepository(),
    storage: providers.storage,
  });
  const faqs = new FaqsRepository();
  const pages = new ContentPagesRepository();
  const adminGuard = requireAuth('admin', config.auth.accessSecret);
  const variants = createImageVariants({ storage: providers.storage, logger });
  const uploads = createUploadsService({
    uploads: new UploadsRepository(),
    storage: providers.storage,
    settings,
    afterConfirm: ({ key }) => {
      // Size variants are made in the background; a failure only means clients use the original.
      variants.generate(key).catch((error: unknown) => {
        logger.error({ err: error, key }, 'image variants failed');
      });
    },
  });
  const salonServices = new SalonServicesRepository();
  // Bookings come with the booking module (SRV-071); until then the checks find nothing.
  const bookingsRepository = new BookingsRepository();
  const conflictFinder = createConflictFinder({ bookings: bookingsRepository, settings });
  const salonState = createSalonStateService({
    salons: new SalonsRepository(),
    facts: createStaffFacts(new MembersRepository(), (salonId) =>
      salonServices.countActive(salonId),
    ),
    audit: createAuditWriter(new AuditLogsRepository()),
    // Placeholder until the notification core (SRV-093) sends the real message.
    notifier: {
      changed: (change) => {
        logger.info(change, 'salon state changed');
        return Promise.resolve();
      },
    },
    logger,
  });
  const audit = createAuditWriter(new AuditLogsRepository());
  const accountLifecycle = createAccountLifecycleService({
    customers: new CustomersRepository(),
    members: new MembersRepository(),
    installations: new InstallationsRepository(),
    refreshTokens: phoneServices.refreshTokens,
    storage: providers.storage,
    audit,
    settings,
    logger,
  });
  const customerProfile = createCustomerProfileService({
    customers: new CustomersRepository(),
    cities: new CitiesRepository(),
    areas: new AreasRepository(),
    uploads,
    storage: providers.storage,
    lifecycle: accountLifecycle,
    logger,
  });
  const placements = createPlacementsService({
    placements: new PlacementsRepository(),
    salons: new SalonsRepository(),
    audit,
  });
  const holdsStore = createHoldsStore(redis);
  const bookingDraftsRepository = new BookingDraftsRepository();
  const availability = createAvailabilityService({
    salons: new SalonsRepository(),
    members: new MembersRepository(),
    salonServices,
    closures: new ClosuresRepository(),
    leaves: new LeavesRepository(),
    bookings: bookingsRepository,
    holds: holdsStore,
    settings,
  });
  const bookingDrafts = createBookingDraftService({
    redis,
    drafts: bookingDraftsRepository,
    availability,
    holds: holdsStore,
    catalog: new CatalogServicesRepository(),
    members: new MembersRepository(),
    customers: new CustomersRepository(),
    salons: new SalonsRepository(),
    phones: createPhoneVerifier(phoneServices),
    otpGate,
    settings,
  });
  const bookingCreation = createBookingCreationService({
    redis,
    drafts: bookingDraftsRepository,
    bookings: bookingsRepository,
    availability,
    holds: holdsStore,
    customers: new CustomersRepository(),
    settings,
  });
  const bookingActions = createBookingActionsService({
    redis,
    bookings: bookingsRepository,
    members: new MembersRepository(),
    settings,
  });
  const bookingReassign = createBookingReassignService({
    redis,
    bookings: bookingsRepository,
    availability,
    settings,
  });
  const bookingCancel = createBookingCancelService({ bookings: bookingsRepository });
  const favoritesRepository = new FavoritesRepository();
  const reviewsService = createReviewsService({
    reviews: new ReviewsRepository(),
    salons: new SalonsRepository(),
    members: new MembersRepository(),
    customers: new CustomersRepository(),
    settings,
  });
  const search = createSearchService({
    favorites: favoritesRepository,
    recommended: placements,
    salons: new SalonsRepository(),
    salonServices,
    closures: new ClosuresRepository(),
    storage: providers.storage,
    settings,
  });
  const catalogService = createCatalogService({
    catalog: new CatalogServicesRepository(),
    storage: providers.storage,
  });
  const bannersService = createBannersService({
    banners: new BannersRepository(),
    storage: providers.storage,
  });
  return {
    otpGate,
    adminGuard,
    uploads,
    search,
    favorites: createFavoritesService({
      favorites: favoritesRepository,
      salons: new SalonsRepository(),
      search,
    }),
    reviews: reviewsService,
    availability,
    bookingDrafts,
    bookings: bookingCreation,
    bookingActions,
    bookingCancel,
    bookingReassign,
    customerProfile,
    salonDetails: createSalonDetailsService({
      favorites: favoritesRepository,
      reviews: reviewsService,
      salons: new SalonsRepository(),
      members: new MembersRepository(),
      salonServices,
      catalog: new CatalogServicesRepository(),
      gallery: new GalleryRepository(),
      closures: new ClosuresRepository(),
      leaves: new LeavesRepository(),
      storage: providers.storage,
      settings,
    }),
    adminSalons: createAdminSalonsService({
      salons: new SalonsRepository(),
      members: new MembersRepository(),
      subscriptions: new SubscriptionsRepository(),
      salonServices,
      state: salonState,
      audit,
      logger,
      bookings: conflictFinder.salon,
      // Placeholder until the notification core (SRV-093) sends the real message.
      notifier: {
        changed: (change) => {
          logger.info(change, 'salon state changed');
          return Promise.resolve();
        },
      },
    }),
    policy: createPolicyService({ salons: new SalonsRepository(), state: salonState }),
    leaves: createLeavesService({
      leaves: new LeavesRepository(),
      members: new MembersRepository(),
      settings,
      conflicts: conflictFinder.leave,
    }),
    staff: createStaffService({
      members: new MembersRepository(),
      salons: new SalonsRepository(),
      salonServices,
      settings,
      state: salonState,
      conflicts: {
        check: ({ salonId, memberId, after }) =>
          conflictFinder.staff.check({ salonId, memberId, after }),
      },
    }),
    team: createTeamService({
      members: new MembersRepository(),
      lifecycle: accountLifecycle,
      phones: createPhoneVerifier(phoneServices),
      storage: providers.storage,
      uploads,
      deactivationConflicts: conflictFinder.deactivation,
    }),
    catalogRequests: createCatalogRequestsService({
      requests: new CatalogRequestsRepository(),
      salons: new SalonsRepository(),
      catalog: new CatalogServicesRepository(),
      uploads,
      audit,
      logger,
      // Placeholder until the notification core (SRV-093) sends the real message.
      notifier: {
        decided: (result) => {
          logger.info(result, 'catalog request decided');
          return Promise.resolve();
        },
      },
    }),
    salonServices: createSalonServicesService({
      salons: new SalonsRepository(),
      catalog: new CatalogServicesRepository(),
      services: salonServices,
      storage: providers.storage,
      uploads,
      state: salonState,
    }),
    hours: createHoursService({
      salons: new SalonsRepository(),
      closures: new ClosuresRepository(),
      settings,
      state: salonState,
      conflicts: conflictFinder.schedule,
    }),
    gallery: createGalleryService({
      gallery: new GalleryRepository(),
      storage: providers.storage,
      uploads,
      settings,
    }),
    salonProfile: {
      service: createSalonProfileService({
        salons: new SalonsRepository(),
        cities: new CitiesRepository(),
        areas: new AreasRepository(),
        storage: providers.storage,
        state: salonState,
        uploads,
      }),
      guard: [
        requireAuth('merchant', config.auth.accessSecret),
        loadMember(new MembersRepository()),
      ],
    },
    salonState,
    adminPlacements: placements,
    adminReviews: createAdminReviewsService({
      reviews: new ReviewsRepository(),
      salons: new SalonsRepository(),
      members: new MembersRepository(),
      customers: new CustomersRepository(),
      audit,
      logger,
    }),
    adminApplications: createSalonReviewService({
      completeness: salonState,
      salons: new SalonsRepository(),
      members: new MembersRepository(),
      subscriptions: new SubscriptionsRepository(),
      settings,
      storage: providers.storage,
      audit,
      logger,
      // Placeholder until the notification core (SRV-093) sends the real push and in-app message.
      notifier: {
        reviewed: (result) => {
          logger.info(result, 'salon application reviewed');
          return Promise.resolve();
        },
      },
    }),
    salonApplication: {
      service: createSalonApplicationService({
        ...phoneServices,
        uploads,
        salons: new SalonsRepository(),
        members: new MembersRepository(),
        installations: new InstallationsRepository(),
        cities: new CitiesRepository(),
        areas: new AreasRepository(),
      }),
      guard: requireAuth('merchant', config.auth.accessSecret),
    },
    catalog: catalogService,
    adminCatalog: createAdminCrud<CatalogServiceRaw>({
      name: 'CATALOG_SERVICE',
      entityType: 'catalogService',
      store: new CatalogServicesRepository(),
      audit,
    }),
    banners: bannersService,
    home: createHomeService({
      banners: bannersService,
      catalog: catalogService,
      search,
      customers: new CustomersRepository(),
    }),
    adminBanners: createAdminBannerService(new BannersRepository(), audit),
    adminContent: createAdminContentServices({
      pages: new ContentPagesRepository(),
      faqs,
      contactInfo: new ContactInfoRepository(),
      appVersions: new AppVersionsRepository(),
      maintenance: new MaintenanceRepository(),
      audit,
    }),
    adminLocations: createAdminLocationServices({
      countries: new CountriesRepository(),
      cities: new CitiesRepository(),
      areas: new AreasRepository(),
      audit,
    }),
    content: {
      customer: createContentService({ app: 'CUSTOMER', pages, faqs }),
      merchant: createContentService({ app: 'MERCHANT', pages, faqs }),
    },
    appConfig,
    locations,
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
