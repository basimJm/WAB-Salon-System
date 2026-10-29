import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useTranslation } from 'react-i18next';
import { describe, expect, it } from 'vitest';
import { formatRelative } from '@/domain/shared/relativeTime';
import { SectionCard } from '@/presentation/components/core/SectionCard';
import { CardGrid } from '@/presentation/components/data/CardGrid';
import { ExportMenu } from '@/presentation/components/data/ExportMenu';
import { SearchField } from '@/presentation/components/form/SearchField';
import { ListPage } from '@/presentation/components/templates/ListPage';
import { AlertsBell } from '@/presentation/layout/AlertsBell';
import SettingsPage from '@/presentation/settings/SettingsPage';
import { ITEMS_STRINGS } from '@/locales/lazy/items';
import { useLazyStrings } from '@/presentation/hooks/useLazyStrings';
import en from '@/locales/en';
import { makeContainer, renderWithApp } from './helpers/render';

const NOW = new Date('2026-10-26T12:00:00Z');

describe('formatRelative (bell rows)', () => {
  it('uses minutes under an hour, hours under a day, then days, in the panel language', () => {
    expect(formatRelative('2026-10-26T11:56:00Z', NOW, 'en')).toBe('4 minutes ago');
    expect(formatRelative('2026-10-26T09:00:00Z', NOW, 'en')).toBe('3 hours ago');
    expect(formatRelative('2026-10-23T12:00:00Z', NOW, 'en')).toBe('3 days ago');
    expect(formatRelative('2026-10-26T11:56:00Z', NOW, 'ar')).toMatch(/٤/);
  });

  it('reads a future instant (clock skew) as now', () => {
    expect(formatRelative('2026-10-26T12:05:00Z', NOW, 'en')).toBe('this minute');
  });
});

function Where() {
  const location = useLocation();
  return <output data-testid="where">{location.pathname}</output>;
}

const bell = (container = makeContainer(), count = 3) =>
  renderWithApp(
    <MemoryRouter initialEntries={['/here']}>
      <Routes>
        <Route path="/here" element={<AlertsBell count={count} />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
    container,
  );

describe('top-bar bell dropdown (design Topbar)', () => {
  it('shows the NEW count and opens the latest NEW alerts with severity and age', async () => {
    bell();
    await userEvent.click(screen.getByRole('button', { name: 'Alerts 3' }));
    const panel = screen.getByRole('group', { name: 'Alerts 3' });
    expect(await within(panel).findByText('Alert 1')).toBeInTheDocument();
    expect(within(panel).getByText(/^Critical · /)).toBeInTheDocument();
    expect(within(panel).getAllByRole('listitem')).toHaveLength(3);
    expect(panel.querySelector('.app-bell__dot--rose')).not.toBeNull();
  });

  it('a row opens its subject', async () => {
    bell();
    await userEvent.click(screen.getByRole('button', { name: 'Alerts 3' }));
    await userEvent.click(await screen.findByRole('link', { name: /Alert 3/ }));
    expect(screen.getByTestId('where')).toHaveTextContent('/items/64d100000000000000000001');
  });

  it('"View all" goes to the alerts list', async () => {
    bell();
    await userEvent.click(screen.getByRole('button', { name: 'Alerts 3' }));
    await userEvent.click(screen.getByRole('link', { name: 'View all' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/alerts');
  });

  it('mark as read acknowledges the alert and drops it from the dropdown', async () => {
    bell();
    await userEvent.click(screen.getByRole('button', { name: 'Alerts 3' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Mark as read: Alert 1' }));
    await waitFor(() => expect(screen.queryByText('Alert 1')).not.toBeInTheDocument());
    expect(screen.getByText('Alert 2')).toBeInTheDocument();
  });

  it('shows the empty and the error states', async () => {
    const none = makeContainer();
    none.mock?.scenarios.set('empty');
    const first = bell(none, 0);
    await userEvent.click(screen.getByRole('button', { name: 'Alerts' }));
    expect(await screen.findByText('No new alerts')).toBeInTheDocument();
    first.unmount();
    const failing = makeContainer();
    failing.mock?.scenarios.set('serverError');
    bell(failing, 0);
    await userEvent.click(screen.getByRole('button', { name: 'Alerts' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Alerts could not be loaded.');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});

describe('list card header (design Blocks table card)', () => {
  it('draws the search box and the Export button inside the card header', () => {
    renderWithApp(
      <ListPage
        title="Items"
        search={<SearchField label="Search items" onSearch={() => undefined} />}
        exportMenu={<ExportMenu onExport={() => Promise.resolve()} />}
        table={{ caption: 'Items', columns: [], rows: [], rowKey: () => '' }}
      />,
    );
    const head = document.querySelector<HTMLElement>('.app-listcard__head');
    if (!head) throw new Error('no list card header');
    expect(within(head).getByRole('searchbox', { name: 'Search items' })).toBeInTheDocument();
    expect(within(head).getByRole('button', { name: 'Export' })).toHaveClass('app-cardbtn');
  });

  it('a grid body renders cards, its loading, empty and error states', () => {
    const rows = [{ id: 'a' }, { id: 'b' }];
    const grid = (extra: object) => (
      <CardGrid
        caption="Cards"
        rows={rows}
        rowKey={(r) => r.id}
        renderCard={(r) => <article aria-label={r.id}>{r.id}</article>}
        {...extra}
      />
    );
    const view = renderWithApp(grid({}));
    expect(screen.getAllByRole('article')).toHaveLength(2);
    view.unmount();
    const loading = renderWithApp(grid({ loading: true }));
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    loading.unmount();
    const empty = renderWithApp(grid({ rows: [], emptyTitle: 'No cards' }));
    expect(screen.getByText('No cards')).toBeInTheDocument();
    empty.unmount();
    renderWithApp(grid({ error: new Error('x'), onRetry: () => undefined }));
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});

describe('section card (design card header bar)', () => {
  it('is a region named by its title, with subtitle, actions and footer', () => {
    renderWithApp(
      <SectionCard
        title="Sign-in rules"
        subtitle="Applies to new sessions"
        actions={<button type="button">Act</button>}
        footer="Saved"
      >
        body
      </SectionCard>,
    );
    const region = screen.getByRole('region', { name: 'Sign-in rules' });
    expect(within(region).getByRole('heading', { level: 2 })).toHaveClass(
      'app-section-card__title',
    );
    expect(within(region).getByText('Applies to new sessions')).toBeInTheDocument();
    expect(within(region).getByRole('button', { name: 'Act' })).toBeInTheDocument();
    expect(within(region).getByText('Saved').tagName).toBe('FOOTER');
  });

  it('settings groups are section cards with the design header', async () => {
    renderWithApp(<SettingsPage />);
    const heading = await screen.findByRole('heading', { name: 'Verification code (OTP)' });
    expect(heading.closest('.app-section-card__head')).not.toBeNull();
  });
});

function LazyProbe() {
  useLazyStrings(ITEMS_STRINGS);
  useLazyStrings(ITEMS_STRINGS);
  const { t, i18n } = useTranslation();
  return <output>{`${t('items.empty')}|${i18n.t('items.empty', { lng: 'ar' })}`}</output>;
}

describe('lazy locale areas', () => {
  it('the item strings are not in the entry bundle languages', () => {
    expect('items' in en).toBe(false);
  });

  it('useLazyStrings adds both languages once, before the first t() call', () => {
    renderWithApp(<LazyProbe />);
    expect(screen.getByRole('status')).toHaveTextContent('No items yet|لا توجد عناصر بعد');
  });
});
