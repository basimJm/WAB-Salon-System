import { screen, waitFor } from '@testing-library/react';
import type { ComponentType } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { Language } from '@/constants/i18n';
import { axeViolations } from './helpers/axe';
import { makeContainer, renderWithApp } from './helpers/render';

/** Every module screen, loaded the way the router loads them (a default export). */
const PAGES: ReadonlyArray<readonly [string, () => Promise<{ default: ComponentType }>]> = [
  ['settings', () => import('@/presentation/settings/SettingsPage')],
  ['countries', () => import('@/presentation/locations/CountriesPage')],
  ['cities', () => import('@/presentation/locations/CitiesPage')],
  ['areas', () => import('@/presentation/locations/AreasPage')],
  ['versions', () => import('@/presentation/appconfig/VersionsPage')],
  ['maintenance', () => import('@/presentation/appconfig/MaintenancePage')],
  ['legal', () => import('@/presentation/content/LegalPagesPage')],
  ['faq', () => import('@/presentation/content/FaqPage')],
  ['contact', () => import('@/presentation/content/ContactPage')],
  ['banners', () => import('@/presentation/banners/BannersPage')],
  ['catalog', () => import('@/presentation/catalog/CatalogPage')],
  ['catalogRequests', () => import('@/presentation/catalog/RequestsPage')],
  ['salons', () => import('@/presentation/salons/SalonsPage')],
  ['applications', () => import('@/presentation/applications/ApplicationsPage')],
  ['customers', () => import('@/presentation/customers/CustomersPage')],
  ['bookings', () => import('@/presentation/bookings/BookingsPage')],
  ['reviews', () => import('@/presentation/reviews/ReviewsPage')],
  ['transactions', () => import('@/presentation/transactions/TransactionsPage')],
  ['reconciliation', () => import('@/presentation/transactions/ReconciliationPage')],
  ['refunds', () => import('@/presentation/refunds/RefundsPage')],
  ['payouts', () => import('@/presentation/payouts/PayoutsPage')],
  ['subscriptions', () => import('@/presentation/subscriptions/SubscriptionsPage')],
  ['recommended', () => import('@/presentation/placements/PlacementsPage')],
  ['campaigns', () => import('@/presentation/campaigns/CampaignsPage')],
  ['alerts', () => import('@/presentation/alerts/AlertsPage')],
  ['overview', () => import('@/presentation/analytics/LiveOverviewPage')],
  ['reports', () => import('@/presentation/reports/ReportsPage')],
  ['audit', () => import('@/presentation/audit/AuditPage')],
  ['exports', () => import('@/presentation/exports/ExportsPage')],
];
const LANGUAGES: readonly Language[] = ['en', 'ar'];

describe.each(LANGUAGES)('module screens in %s', (language) => {
  it.each(PAGES)('%s has no accessibility violations and names its page', async (_name, load) => {
    const { default: Page } = await load();
    renderWithApp(
      <MemoryRouter>
        <main>
          <Page />
        </main>
      </MemoryRouter>,
      makeContainer(),
      language,
    );
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument());
    expect(document.documentElement.getAttribute('dir')).toBe(language === 'ar' ? 'rtl' : 'ltr');
    // let the list/chart queries answer, then check the real content, not the skeleton
    await waitFor(
      () => expect(document.querySelector('[aria-busy="true"], .app-skeleton')).toBeNull(),
      { timeout: 3000 },
    );
    expect(await axeViolations()).toEqual([]);
  });
});
