import type { AppConfigRepository } from '@/domain/appconfig/appConfig';
import type { AuthRepository } from '@/domain/auth/auth';
import type { BannersRepository } from '@/domain/banners/banners';
import type { UploadsRepository } from '@/domain/uploads/uploads';
import type { ApplicationsRepository } from '@/domain/applications/applications';
import type { CustomersRepository } from '@/domain/customers/customers';
import type { BookingsRepository } from '@/domain/bookings/bookings';
import type { ReviewsRepository } from '@/domain/reviews/reviews';
import type { TransactionsRepository } from '@/domain/transactions/transactions';
import type { RefundsRepository } from '@/domain/refunds/refunds';
import type { PayoutsRepository } from '@/domain/payouts/payouts';
import type { SubscriptionsRepository } from '@/domain/subscriptions/subscriptions';
import type { PlacementsRepository } from '@/domain/placements/placements';
import type { CampaignsRepository } from '@/domain/campaigns/campaigns';
import type { AlertsRepository } from '@/domain/alerts/alerts';
import type { SalonsRepository } from '@/domain/salons/salons';
import type { CatalogRepository } from '@/domain/catalog/catalog';
import type { ContentRepository } from '@/domain/content/content';
import type { LocationsRepository } from '@/domain/locations/locations';
import type { SettingsRepository } from '@/domain/settings/settings';
import type { AppConfig } from '@/infrastructure/config/appConfig';
import type { ApiClient } from './api/ApiClient';
import { RemoteAppConfigRepository } from './appconfig/RemoteAppConfigRepository';
import { RemoteAuthRepository } from './auth/RemoteAuthRepository';
import { RemoteBannersRepository } from './banners/RemoteBannersRepository';
import { RemoteUploadsRepository } from './uploads/RemoteUploadsRepository';
import { fakePutFile, putFileWithProgress } from './uploads/putFile';
import { RemoteApplicationsRepository } from './applications/RemoteApplicationsRepository';
import { RemoteCustomersRepository } from './customers/RemoteCustomersRepository';
import { RemoteBookingsRepository } from './bookings/RemoteBookingsRepository';
import { RemoteReviewsRepository } from './reviews/RemoteReviewsRepository';
import { RemoteTransactionsRepository } from './transactions/RemoteTransactionsRepository';
import { RemoteRefundsRepository } from './refunds/RemoteRefundsRepository';
import { RemotePayoutsRepository } from './payouts/RemotePayoutsRepository';
import { RemoteSubscriptionsRepository } from './subscriptions/RemoteSubscriptionsRepository';
import { RemotePlacementsRepository } from './placements/RemotePlacementsRepository';
import { RemoteCampaignsRepository } from './campaigns/RemoteCampaignsRepository';
import { RemoteAlertsRepository } from './alerts/RemoteAlertsRepository';
import { RemoteSalonsRepository } from './salons/RemoteSalonsRepository';
import { RemoteCatalogRepository } from './catalog/RemoteCatalogRepository';
import { RemoteContentRepository } from './content/RemoteContentRepository';
import { RemoteLocationsRepository } from './locations/RemoteLocationsRepository';
import { RemoteSettingsRepository } from './settings/RemoteSettingsRepository';

export interface Repositories {
  readonly auth: AuthRepository;
  readonly settings: SettingsRepository;
  readonly locations: LocationsRepository;
  readonly appConfig: AppConfigRepository;
  readonly content: ContentRepository;
  readonly banners: BannersRepository;
  readonly catalog: CatalogRepository;
  readonly salons: SalonsRepository;
  readonly alerts: AlertsRepository;
  readonly campaigns: CampaignsRepository;
  readonly placements: PlacementsRepository;
  readonly subscriptions: SubscriptionsRepository;
  readonly payouts: PayoutsRepository;
  readonly refunds: RefundsRepository;
  readonly transactions: TransactionsRepository;
  readonly reviews: ReviewsRepository;
  readonly bookings: BookingsRepository;
  readonly customers: CustomersRepository;
  readonly applications: ApplicationsRepository;
  readonly uploads: UploadsRepository;
}

/** Real vs mock is decided by config only. Mock code is dead-code-eliminated when `__ALLOW_MOCK__` is false. */
export async function createRepositories(config: AppConfig, api: ApiClient): Promise<Repositories> {
  const settings = new RemoteSettingsRepository(api);
  const locations = new RemoteLocationsRepository(api);
  const appConfig = new RemoteAppConfigRepository(api);
  const content = new RemoteContentRepository(api);
  const banners = new RemoteBannersRepository(api);
  const catalog = new RemoteCatalogRepository(api);
  const salons = new RemoteSalonsRepository(api);
  const alerts = new RemoteAlertsRepository(api);
  const campaigns = new RemoteCampaignsRepository(api);
  const placements = new RemotePlacementsRepository(api);
  const subscriptions = new RemoteSubscriptionsRepository(api);
  const payouts = new RemotePayoutsRepository(api);
  const refunds = new RemoteRefundsRepository(api);
  const transactions = new RemoteTransactionsRepository(api);
  const reviews = new RemoteReviewsRepository(api);
  const bookings = new RemoteBookingsRepository(api);
  const customers = new RemoteCustomersRepository(api);
  const applications = new RemoteApplicationsRepository(api);
  const mock = __ALLOW_MOCK__ && config.dataSource === 'mock';
  const uploads = new RemoteUploadsRepository(api, mock ? fakePutFile : putFileWithProgress);
  if (__ALLOW_MOCK__ && config.dataSource === 'mock') {
    const { MockAuthRepository } = await import('./auth/MockAuthRepository');
    return {
      auth: new MockAuthRepository(),
      settings,
      locations,
      appConfig,
      content,
      banners,
      catalog,
      salons,
      alerts,
      campaigns,
      placements,
      subscriptions,
      payouts,
      refunds,
      transactions,
      reviews,
      bookings,
      customers,
      applications,
      uploads,
    };
  }
  return {
    auth: new RemoteAuthRepository(api),
    settings,
    locations,
    appConfig,
    content,
    banners,
    catalog,
    salons,
    alerts,
    campaigns,
    placements,
    subscriptions,
    payouts,
    refunds,
    transactions,
    reviews,
    bookings,
    customers,
    applications,
    uploads,
  };
}
