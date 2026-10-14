import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { NAV_ITEMS, NAV_PAGES } from '@/constants/nav';
import { ROUTES } from '@/constants/routes';
import { SEARCH_DEBOUNCE_MS } from '@/constants/ui';
import { Breadcrumbs } from '@/presentation/components/layout/Breadcrumbs';
import { GlobalSearch, type SearchResults } from '@/presentation/components/layout/GlobalSearch';
import { useBreadcrumbs } from '@/presentation/controllers/useBreadcrumbs';
import { Sidebar } from '@/presentation/layout/Sidebar';
import ForbiddenPage from '@/presentation/pages/ForbiddenPage';
import NotFoundPage from '@/presentation/pages/NotFoundPage';
import ServerErrorPage from '@/presentation/pages/ServerErrorPage';
import { ShellSection } from '@/presentation/pages/design/ShellSection';
import en from '@/locales/en';
import { axeViolations } from './helpers/axe';
import { renderWithApp } from './helpers/render';

const at = (path: string, ui: React.ReactElement) => (
  <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
);
const sidebar = (path: string, counters?: Record<string, number>, collapsed = false) =>
  renderWithApp(
    at(
      path,
      <Sidebar
        mode="docked"
        collapsed={collapsed}
        open
        onNavigate={() => undefined}
        counters={counters}
      />,
    ),
  );

describe('navigation tree', () => {
  it('every page has a unique path and an English label', () => {
    const paths = NAV_PAGES.map((p) => p.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const page of NAV_PAGES) {
      const value = page.labelKey
        .split('.')
        .reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], en);
      expect(typeof value, page.labelKey).toBe('string');
    }
  });

  it('matches the PRD sidebar: 15 modules with the listed sub-pages', () => {
    expect(NAV_ITEMS).toHaveLength(15);
    const count = (id: string) => NAV_ITEMS.find((i) => i.id === id)?.children?.length;
    expect([
      count('analytics'),
      count('salons'),
      count('finance'),
      count('catalog'),
      count('content'),
    ]).toEqual([9, 2, 5, 2, 5]);
  });
});

describe('Sidebar sub-menus and counters', () => {
  it('opens the group that contains the current page and marks the page', () => {
    sidebar('/finance/refunds');
    expect(screen.getByRole('button', { name: 'Collapse Finance' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('link', { name: 'Refunds' })).toHaveClass('wab-navsub--active');
    expect(screen.queryByRole('link', { name: 'Traffic & users' })).toBeNull();
  });

  it('toggles a group by hand', async () => {
    sidebar('/live');
    await userEvent.click(screen.getByRole('button', { name: 'Expand Salons' }));
    expect(screen.getByRole('link', { name: 'Applications' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Collapse Salons' }));
    expect(screen.queryByRole('link', { name: 'Applications' })).toBeNull();
  });

  it('shows counters on the sub-page and the sum on its module; 99+ above 99; nothing for zero', () => {
    sidebar('/salons/applications', { applications: 3, allSalons: 2, alerts: 150, reviews: 0 });
    expect(
      within(screen.getByRole('link', { name: /^Applications/ })).getByText('3'),
    ).toBeVisible();
    expect(within(screen.getByRole('link', { name: /^Salons/ })).getByText('5')).toBeVisible();
    expect(within(screen.getByRole('link', { name: /^Alerts/ })).getByText('99+')).toBeVisible();
    expect(within(screen.getByRole('link', { name: /^Reviews/ })).queryByText('0')).toBeNull();
  });

  it('uses Arabic digits in Arabic', () => {
    renderWithApp(
      at(
        '/live',
        <Sidebar
          mode="docked"
          collapsed={false}
          open
          onNavigate={() => undefined}
          counters={{ alerts: 12 }}
        />,
      ),
      undefined,
      'ar',
    );
    expect(screen.getByText('١٢')).toBeVisible();
  });

  it('a collapsed sidebar shows only the modules, no toggles or counters', () => {
    sidebar('/finance/refunds', { alerts: 4 }, true);
    expect(screen.queryByRole('button', { name: /Expand|Collapse/ })).toBeNull();
    expect(screen.queryByText('4')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Refunds' })).toBeNull();
  });
});

describe('Breadcrumbs', () => {
  function Probe() {
    return <Breadcrumbs crumbs={useBreadcrumbs()} />;
  }
  const route = (path: string) =>
    renderWithApp(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="*" element={<Probe />} />
        </Routes>
      </MemoryRouter>,
    );

  it('shows Module > Sub-page with the last crumb as the current page', () => {
    route('/finance/refunds');
    const nav = screen.getByRole('navigation', { name: 'Breadcrumbs' });
    expect(within(nav).getByRole('link', { name: 'Finance' })).toHaveAttribute('href', '/finance');
    expect(within(nav).getByText('Refunds')).toHaveAttribute('aria-current', 'page');
  });

  it('shows nothing on a module page or an unknown page', () => {
    const { unmount } = route(ROUTES.bookings);
    expect(screen.queryByRole('navigation', { name: 'Breadcrumbs' })).toBeNull();
    unmount();
    route('/nowhere');
    expect(screen.queryByRole('navigation', { name: 'Breadcrumbs' })).toBeNull();
  });
});

describe('GlobalSearch', () => {
  const results: SearchResults = {
    customers: [{ id: 'c', label: 'Dana', hint: '+962', to: '/customers' }],
    salons: [{ id: 's', label: 'Layla', to: '/salons' }],
  };
  const setup = (search = vi.fn(() => Promise.resolve(results))) => {
    const onSelect = vi.fn();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderWithApp(<GlobalSearch search={search} onSelect={onSelect} />);
    return { search, onSelect, input: screen.getByRole('combobox', { name: /Search customers/ }) };
  };
  const typeAndWait = async (input: HTMLElement, text: string) => {
    fireEvent.change(input, { target: { value: text } });
    await act(() => vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS + 10));
  };

  it('waits for the debounce and 2 characters, then shows results grouped by type', async () => {
    const { search, input } = setup();
    fireEvent.change(input, { target: { value: 'd' } });
    await act(() => vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS + 10));
    expect(search).not.toHaveBeenCalled();
    expect(screen.getByText('Type at least 2 characters')).toBeVisible();
    await typeAndWait(input, 'da');
    expect(search).toHaveBeenCalledWith('da');
    expect(screen.getByRole('group', { name: 'Customers' })).toBeVisible();
    expect(screen.getByRole('group', { name: 'Salons' })).toBeVisible();
    expect(screen.queryByRole('group', { name: 'Bookings' })).toBeNull();
    expect(screen.getAllByRole('option')).toHaveLength(2);
    vi.useRealTimers();
  });

  it('arrow keys and Enter pick a result; Escape closes', async () => {
    const { onSelect, input } = setup();
    await typeAndWait(input, 'da');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[1]?.id);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(results.salons?.[0]);
    expect(input).toHaveValue('');
    await typeAndWait(input, 'da');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    vi.useRealTimers();
  });

  it('clicking a result selects it', async () => {
    const { onSelect, input } = setup();
    await typeAndWait(input, 'da');
    fireEvent.click(screen.getByRole('option', { name: /Dana/ }));
    expect(onSelect).toHaveBeenCalledWith(results.customers?.[0]);
    vi.useRealTimers();
  });

  it('says so when nothing is found or the search fails', async () => {
    const empty = setup(vi.fn(() => Promise.resolve({})));
    await typeAndWait(empty.input, 'zz');
    expect(screen.getByText('No results')).toBeVisible();
    vi.useRealTimers();
  });

  it('shows an error line when the search rejects', async () => {
    const failing = setup(vi.fn(() => Promise.reject(new Error('x'))));
    await typeAndWait(failing.input, 'zz');
    expect(screen.getByText('Search failed. Try again.')).toBeVisible();
    vi.useRealTimers();
  });
});

describe('403 / 404 / 500 pages', () => {
  it.each([
    ['403', ForbiddenPage, 'You do not have access'],
    ['404', NotFoundPage, /not found|doesn.t exist|404/i],
    ['500', ServerErrorPage, 'Something went wrong'],
  ] as const)('%s shows its code, title and a way out', (code, Page, title) => {
    renderWithApp(at('/', <Page />));
    expect(screen.getByText(code)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: title })).toBeVisible();
    expect(
      screen.queryAllByRole('link').length + screen.queryAllByRole('button').length,
    ).toBeGreaterThan(0);
  });

  it('the error page offers a reload', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    renderWithApp(at('/', <ServerErrorPage />));
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reload).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});

describe('ShellSection (gallery)', () => {
  it('is accessible', async () => {
    renderWithApp(
      <MemoryRouter>
        <main>
          <ShellSection />
        </main>
      </MemoryRouter>,
    );
    expect(await axeViolations()).toEqual([]);
  });
});
