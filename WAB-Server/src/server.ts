import { createExportsService } from './domain/exports/exports.service';
import { createTableBuilders } from './domain/exports/tableBuilders';
import { ExportsRepository } from './repositories/exports.repository';
import { EXPORT_JOB_NAME } from './constants/exports';
import { createReportsService } from './domain/reports/reports.service';
import { createMongoReportSource } from './domain/reports/reportSource';
import { ReportsRepository } from './repositories/reports.repository';
import { createAlertInbox } from './domain/alerts/alertInbox.service';
import { SOCKET_ROOMS } from './constants/sockets';
import { createAlertsService } from './domain/alerts/alerts.service';
import { AlertsRepository } from './repositories/alerts.repository';
import { ALERT_SOCKET_EVENT } from './constants/alerts';
import { createAnalyticsService } from './domain/analytics/analytics.service';
import { createMongoAnalytics } from './providers/analytics';
import { createServerEvents } from './domain/events';
import { ServerEventsRepository } from './repositories/serverEvents.repository';
import { createAdminTransactionsService } from './domain/finance/adminTransactions.service';
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
import { createInboxService } from './domain/notifications/inbox.service';
import { createBookingJobs } from './jobs/bookingJobs';
import { createPeriodicJobs } from './jobs/periodicJobs';
import { createBullJobScheduler } from './jobs/bullmq';
import type { JobHandler, JobScheduler } from './jobs/jobs';
import { CAMPAIGN_JOB_NAME } from './constants/campaigns';
import { createAdminCustomersService } from './domain/customers/adminCustomers.service';
import { createAdminSettingsService } from './domain/adminSettings/adminSettings.service';
import { createAdminProfileService } from './domain/adminProfile/adminProfile.service';
import { createCampaignsService } from './domain/campaigns/campaigns.service';
import { CampaignsRepository } from './repositories/campaigns.repository';
import { createFavoritesService } from './domain/favorites/favorites.service';
import { FavoritesRepository } from './repositories/favorites.repository';
import { createAdminReviewsService } from './domain/reviews/adminReviews.service';
import { createCustomerProfileService } from './domain/customers/customerProfile.service';
import { createBookingActionsService } from './domain/bookings/bookingActions.service';
import { createRefundHook, composeBookingHooks } from './domain/refunds/refundHook';
import { createRefundService } from './domain/refunds/refunds.service';
import { RefundsRepository } from './repositories/refunds.repository';
import { createPaymentsService } from './domain/payments/payments.service';
import { TransactionsRepository } from './repositories/transactions.repository';
import { createBookingBulkService } from './domain/bookings/bookingBulk.service';
import { createBookingAdminService } from './domain/bookings/bookingAdmin.service';
import { createBookingQueriesService } from './domain/bookings/bookingQueries.service';
import { createBookingReassignService } from './domain/bookings/bookingReassign.service';
import { createBookingCancelService } from './domain/bookings/bookingCancel.service';
import { createPayoutDetailsService } from './domain/salons/payoutDetails.service';
import { createFieldEncryption } from './utils/crypto/aesGcm';
import { createMerchantFinanceService } from './domain/finance/merchantFinance.service';
import { createSubscriptionsService } from './domain/subscriptions/subscriptions.service';
import { createPayoutsService } from './domain/payouts/payouts.service';
import { PayoutsRepository } from './repositories/payouts.repository';
import { createNotificationService } from './domain/notifications/notifications.service';
import { createNotificationProducers } from './domain/notifications/producers';
import { NotificationsRepository } from './repositories/notifications.repository';
import { createLedgerService } from './domain/ledger/ledger.service';
import { LedgerRepository } from './repositories/ledger.repository';
import type { BookingCreatedHook } from './domain/bookings/bookingCreation.service';
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
import { createAccessEvents } from './sockets/accessEvents';
import { createBookingEvents, type SocketRelay } from './sockets/bookingEvents';
import { createRoomsFor } from './sockets/rooms';
import {
  createSocketServer,
  type SocketHub,
  type SocketServerOptions,
} from './sockets/socketServer';
import {
  createShutdown,
  registerProcessHandlers,
  type Closable,
  type ProcessLike,
} from './utils/process/lifecycle';

/** What the services need from the background-job system, and how they register their work. */
interface JobRuntime {
  readonly scheduler: JobScheduler;
  /** Processors by job name; services add theirs while they are built. */
  readonly handlers: Record<string, JobHandler>;
  /** Rebuilds queued jobs from the database; run once the worker is up. */
  readonly reconcilers: (() => Promise<number>)[];
  /** Registers recurring schedules once the worker is up. */
  readonly schedules: (() => Promise<void>)[];
}

export interface RunningServer {
  readonly server: Server;
  readonly shutdown: () => Promise<void>;
  /** Present when started with `socket`: emit real-time events through it. */
  readonly sockets?: SocketHub;
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
  /** Starts Socket.IO (Redis adapter) on the HTTP server; needs the shared Redis connection. */
  readonly socket?: {
    readonly redis: Redis;
    readonly roomsFor?: SocketServerOptions['roomsFor'];
  };
}

/**
 * Starts listening and wires graceful shutdown: HTTP stops first, then the given resources
 * (MongoDB now; Redis, Socket.IO and queues add themselves in later tasks).
 */
export const startServer = async (
  config: AppConfig,
  logger: Logger,
  {
    proc,
    closables = [],
    readinessChecks = [],
    rateLimitStore,
    services,
    socket,
  }: StartOptions = {},
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
  const sockets =
    socket === undefined
      ? undefined
      : createSocketServer({
          httpServer: server,
          redis: socket.redis,
          accessSecret: config.auth.accessSecret,
          corsAllowedOrigins: config.corsAllowedOrigins,
          logger,
          ...(socket.roomsFor === undefined ? {} : { roomsFor: socket.roomsFor }),
        });
  const shutdown = createShutdown(
    [
      // Sockets first: open connections would keep the HTTP server from closing.
      ...(sockets === undefined ? [] : [{ name: 'sockets', close: () => sockets.close() }]),
      { name: 'http', close: () => closeHttpServer(server) },
      ...closables,
    ],
    logger,
  );
  if (proc) registerProcessHandlers(proc, logger, shutdown);
  logger.info({ port: config.port, env: config.env }, 'server listening');
  return { server, shutdown, ...(sockets === undefined ? {} : { sockets }) };
};

/** Services the feature routers need; built once, after MongoDB and Redis are connected. */
const buildServices = (
  config: AppConfig,
  logger: Logger,
  redis: Redis,
  relay: SocketRelay,
  jobs: JobRuntime,
): ApiServices => {
  const settings = createSettingsService({ store: new SettingsRepository(), redis, logger });
  const serverEventsRepository = new ServerEventsRepository();
  // Server events live in the server's own MongoDB; installation links and admin queries share them.
  const serverAnalytics = createMongoAnalytics({
    events: createServerEvents({ store: serverEventsRepository, logger }),
    counter: serverEventsRepository,
  });
  const otpGate = createOtpGate({ redis, settings });
  const providers = createProviders(config.providers, config.isProduction, {
    redis,
    logger,
    config,
  });
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
    analytics: serverAnalytics,
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
  const bookingEvents = createBookingEvents({
    relay,
    customers: new CustomersRepository(),
    members: new MembersRepository(),
    logger,
  });
  const accessEvents = createAccessEvents({ relay, members: new MembersRepository(), logger });
  const notificationsRepository = new NotificationsRepository();
  const notificationService = createNotificationService({
    notifications: notificationsRepository,
    customers: new CustomersRepository(),
    members: new MembersRepository(),
    installations: new InstallationsRepository(),
    notifier: providers.notifier,
    access: accessEvents,
    logger,
  });
  const producers = createNotificationProducers({
    notifications: notificationService,
    salons: new SalonsRepository(),
    customers: new CustomersRepository(),
    members: new MembersRepository(),
    bookings: bookingsRepository,
    settings,
    logger,
  });
  const conflictFinder = createConflictFinder({ bookings: bookingsRepository, settings });
  const salonState = createSalonStateService({
    salons: new SalonsRepository(),
    facts: createStaffFacts(new MembersRepository(), (salonId) =>
      salonServices.countActive(salonId),
    ),
    audit: createAuditWriter(new AuditLogsRepository()),
    notifier: producers.salonStateNotifier,
    logger,
  });
  const audit = createAuditWriter(new AuditLogsRepository());
  const accountLifecycle = createAccountLifecycleService({
    access: accessEvents,
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
  const transactionsRepository = new TransactionsRepository();
  const refundsRepository = new RefundsRepository();
  const ledgerRepository = new LedgerRepository();
  const ledger = createLedgerService({
    entries: ledgerRepository,
    transactions: transactionsRepository,
    refunds: refundsRepository,
    logger,
  });
  const fullRefunds = createRefundService({
    hooks: {
      started: producers.refundHooks.started,
      failed: producers.refundHooks.failed,
      // The money has left: book it. A missed write is repaired by `ledger.reconcile()` (job).
      refunded: async (refund) => {
        try {
          await ledger.recordRefund(refund);
        } catch (error) {
          logger.error({ err: error, refundId: refund.id }, 'ledger refund entry failed');
        }
        await producers.refundHooks.refunded(refund);
      },
    },
    refunds: refundsRepository,
    transactions: transactionsRepository,
    bookings: bookingsRepository,
    provider: providers.payments,
    settings,
    audit,
    logger,
  });
  // Every booking status change tells the apps (sockets) and starts the refund it owes.
  const payoutsRepository = new PayoutsRepository();
  const subscriptionsService = createSubscriptionsService({
    subscriptions: new SubscriptionsRepository(),
    salons: new SalonsRepository(),
    settings,
    audit,
  });
  const adminPayouts = createPayoutsService({
    payouts: payoutsRepository,
    ledgerEntries: ledgerRepository,
    ledger,
    salons: new SalonsRepository(),
    audit,
    notifier: producers.payoutNotifier,
    logger,
  });
  // Reminders, the pending alert and the auto-cancel follow every booking status change.
  const bookingJobs = createBookingJobs({
    scheduler: jobs.scheduler,
    bookings: bookingsRepository,
    // `bookingActions` is created below with the hooks that contain these jobs.
    actions: { autoCancel: (bookingId) => bookingActions.autoCancel(bookingId) },
    notify: producers.bookingJobEvent,
    settings,
    logger,
  });
  Object.assign(jobs.handlers, bookingJobs.handlers);
  jobs.reconcilers.push(() => bookingJobs.reconcile());
  const bookingChanges = composeBookingHooks(
    [
      bookingEvents,
      producers.bookingChanged,
      createRefundHook({ refunds: fullRefunds, logger }),
      bookingJobs.hook,
    ],
    logger,
  );
  // A booking made from a payment books the charge in the ledger, then tells the apps.
  const bookingCreated: BookingCreatedHook = {
    created: async (booking) => {
      try {
        await ledger.recordChargeForBooking(booking.id);
      } catch (error) {
        logger.error({ err: error, bookingId: booking.id }, 'ledger charge entry failed');
      }
      await bookingEvents.created(booking);
      await producers.bookingCreated.created(booking);
      await bookingJobs.hook.created(booking);
    },
  };
  const bookingCreation = createBookingCreationService({
    transactions: transactionsRepository,
    refunds: fullRefunds,
    hook: bookingCreated,
    redis,
    drafts: bookingDraftsRepository,
    bookings: bookingsRepository,
    availability,
    holds: holdsStore,
    customers: new CustomersRepository(),
    settings,
  });
  const bookingActions = createBookingActionsService({
    hook: bookingChanges,
    redis,
    bookings: bookingsRepository,
    members: new MembersRepository(),
    settings,
  });
  const bookingReassign = createBookingReassignService({
    hook: bookingChanges,
    redis,
    bookings: bookingsRepository,
    availability,
    settings,
  });
  const bookingQueries = createBookingQueriesService({
    bookings: bookingsRepository,
    customers: new CustomersRepository(),
    members: new MembersRepository(),
    salons: new SalonsRepository(),
    settings,
  });
  const bookingAdmin = createBookingAdminService({
    hook: bookingChanges,
    redis,
    bookings: bookingsRepository,
    members: new MembersRepository(),
    audit,
    settings,
  });
  const payments = createPaymentsService({
    transactions: transactionsRepository,
    drafts: bookingDraftsRepository,
    customers: new CustomersRepository(),
    provider: providers.payments,
    refunds: fullRefunds,
    providerName: config.providers.payments,
    logger,
  });
  const alertsRepository = new AlertsRepository();
  const adminAlerts = createAlertsService({
    alerts: alertsRepository,
    transactions: transactionsRepository,
    refunds: refundsRepository,
    salons: new SalonsRepository(),
    reviews: new ReviewsRepository(),
    catalogRequests: new CatalogRequestsRepository(),
    settings,
    onRaised: (alert) => {
      relay.current?.emit('admin', SOCKET_ROOMS.admin, ALERT_SOCKET_EVENT, {
        id: alert.id,
        kind: alert.kind,
        severity: alert.severity,
        title: alert.title,
      });
    },
    logger,
  });
  const reportsService = createReportsService({
    source: createMongoReportSource({
      bookings: bookingsRepository,
      transactions: transactionsRepository,
      refunds: refundsRepository,
      customers: new CustomersRepository(),
      salons: new SalonsRepository(),
      reviews: new ReviewsRepository(),
      subscriptions: new SubscriptionsRepository(),
      payouts: payoutsRepository,
    }),
    reports: new ReportsRepository(),
    settings,
    logger,
  });
  const adminSettingsService = createAdminSettingsService({
    settings,
    auditLogs: new AuditLogsRepository(),
    audit,
  });
  const adminProfileService = createAdminProfileService({
    admins,
    auth: adminAuthService,
    refreshTokens: phoneServices.refreshTokens,
    audit,
    redis,
    notifier: providers.notifier,
    settings,
    logger,
    secret: config.auth.accessSecret,
  });
  const adminTransactionsService = createAdminTransactionsService({
    transactions: transactionsRepository,
  });
  const exportsService = createExportsService({
    exports: new ExportsRepository(),
    builders: createTableBuilders({
      reports: reportsService,
      transactions: adminTransactionsService,
      adminSettings: adminSettingsService,
    }),
    storage: providers.storage,
    scheduler: jobs.scheduler,
    audit,
    logger,
  });
  jobs.handlers[EXPORT_JOB_NAME] = (job) => exportsService.run(String(job.data['exportId']));
  jobs.reconcilers.push(() => exportsService.reconcile());
  const alertInbox = createAlertInbox({
    alerts: alertsRepository,
    admins: new AdminsRepository(),
    notifier: providers.notifier,
    logger,
  });
  // Daily and periodic chores: subscriptions, account purge, refund retries, reconciliations.
  const periodic = createPeriodicJobs({
    scheduler: jobs.scheduler,
    settings,
    subscriptions: subscriptionsService,
    accounts: accountLifecycle,
    refunds: fullRefunds,
    payments,
    ledger,
    bookingJobs,
    notifySubscription: async (event, alert) => {
      await producers.subscriptionAlert(event, alert);
      await adminAlerts.subscription(event, alert);
    },
    evaluateAlerts: (now) => adminAlerts.evaluate(now),
    emailAlerts: (now) => alertInbox.deliverEmails(now),
    aggregateReports: (now) => reportsService.aggregateYesterday(now),
    onDelayedRefunds: (delayed) => adminAlerts.refundsDelayed(delayed),
    logger,
  });
  Object.assign(jobs.handlers, periodic.handlers);
  jobs.schedules.push(() => periodic.register());
  const campaigns = createCampaignsService({
    campaigns: new CampaignsRepository(),
    customers: new CustomersRepository(),
    members: new MembersRepository(),
    installations: new InstallationsRepository(),
    salons: new SalonsRepository(),
    notifications: notificationService,
    notificationsRepository,
    notifier: providers.notifier,
    scheduler: jobs.scheduler,
    audit,
    logger,
  });
  jobs.handlers[CAMPAIGN_JOB_NAME] = (job) => campaigns.send(String(job.data['campaignId']));
  jobs.reconcilers.push(() => campaigns.reconcile());
  const bookingCancel = createBookingCancelService({
    hook: bookingChanges,
    bookings: bookingsRepository,
  });
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
    inbox: createInboxService({
      notifications: notificationsRepository,
      settings,
      access: accessEvents,
    }),
    availability,
    bookingDrafts,
    bookings: bookingCreation,
    bookingActions,
    bookingCancel,
    payments,
    adminRefunds: fullRefunds,
    adminPayouts,
    adminAlerts: alertInbox,
    adminReports: reportsService,
    adminExports: exportsService,
    adminAnalytics: createAnalyticsService({
      analytics: serverAnalytics,
      settings,
      redis,
      logger,
    }),
    adminTransactions: adminTransactionsService,
    ...(config.secrets.payoutEncryptionKey === undefined
      ? {}
      : {
          payoutDetails: createPayoutDetailsService({
            salons: new SalonsRepository(),
            members: new MembersRepository(),
            phones: createPhoneVerifier(phoneServices),
            otpGate,
            encryption: createFieldEncryption(config.secrets.payoutEncryptionKey),
            audit,
          }),
        }),
    adminSubscriptions: subscriptionsService,
    merchantFinance: createMerchantFinanceService({
      payoutsService: adminPayouts,
      transactions: transactionsRepository,
      refunds: refundsRepository,
      payouts: payoutsRepository,
      bookings: bookingsRepository,
      subscriptions: subscriptionsService,
      salons: new SalonsRepository(),
      settings,
    }),
    bookingAdmin,
    bookingBulk: createBookingBulkService({
      bookings: bookingsRepository,
      actions: bookingActions,
    }),
    bookingQueries,
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
      notifier: producers.salonStateNotifier,
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
      access: accessEvents,
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
      notifier: producers.catalogRequestNotifier,
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
    adminCampaigns: campaigns,
    adminSettings: adminSettingsService,
    adminProfile: adminProfileService,
    adminCustomers: createAdminCustomersService({
      customers: new CustomersRepository(),
      installations: new InstallationsRepository(),
      bookings: bookingsRepository,
      lifecycle: accountLifecycle,
      audit,
    }),
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
      notifier: producers.applicationNotifier,
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
      unread: { count: (customerId) => notificationService.unreadCount('CUSTOMER', customerId) },
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
    providersClose: providers.close,
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
    const relay: SocketRelay = {};
    const scheduler = createBullJobScheduler({ redis: connected, logger });
    const jobs: JobRuntime = { scheduler, handlers: {}, reconcilers: [], schedules: [] };
    const services = buildServices(config, logger, connected, relay, jobs);
    const running = await startServer(config, logger, {
      proc: process,
      closables: [
        { name: 'jobs', close: () => scheduler.close() },
        { name: 'providers', close: () => services.providersClose?.() ?? Promise.resolve() },
        { name: 'redis', close: () => disconnectRedis(connected) },
        { name: 'mongodb', close: disconnectMongo },
      ],
      readinessChecks: [createMongoReadinessCheck(mongo), createRedisReadinessCheck(connected)],
      rateLimitStore: new RedisRateLimitStore(
        connected,
        `${REDIS_KEY_PREFIX.httpRateLimit}:global`,
      ),
      services,
      socket: { redis: connected, roomsFor: createRoomsFor(new MembersRepository()) },
    });
    // Booking services emit through the relay as soon as the hub exists.
    if (running.sockets !== undefined) relay.current = running.sockets;
    // The worker starts after the API is up; jobs missed while the server was down are rebuilt first.
    await scheduler.work(jobs.handlers);
    for (const schedule of jobs.schedules) {
      try {
        await schedule();
      } catch (error) {
        logger.error({ err: error }, 'recurring jobs could not be registered');
      }
    }
    for (const reconcile of jobs.reconcilers) {
      try {
        logger.info({ rebuilt: await reconcile() }, 'background jobs reconciled');
      } catch (error) {
        // The API is already serving: a failed rebuild is retried by the next reconcile run.
        logger.error({ err: error }, 'background jobs could not be reconciled');
      }
    }
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
