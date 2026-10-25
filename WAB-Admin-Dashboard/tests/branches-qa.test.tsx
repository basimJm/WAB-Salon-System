import { readFileSync } from 'node:fs';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import BookingsPage from '@/presentation/bookings/BookingsPage';
import SalonDetailsPage from '@/presentation/salons/SalonDetailsPage';
import SalonEditPage from '@/presentation/salonEdit/SalonEditPage';
import ReconciliationPage from '@/presentation/transactions/ReconciliationPage';
import { axeViolations } from './helpers/axe';
import { renderWithApp, makeContainer } from './helpers/render';

const SALON = '64f000000000000000000001';
const KHALDA = '64b000000000000000000012';
const arabic = (url: string, pattern: string, element: ReactElement) =>
  renderWithApp(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path={pattern} element={<main>{element}</main>} />
      </Routes>
    </MemoryRouter>,
    makeContainer(),
    'ar',
  );

/** ADM-092 · the branch screens in Arabic (the default language), with axe, plus the layout regressions QA found. */
describe('branches QA (Arabic, accessibility, layout)', () => {
  it('branches tab in Arabic: names, status and actions, no axe violations', async () => {
    arabic(`/salons/${SALON}`, '/salons/:id', <SalonDetailsPage />);
    await userEvent.click(await screen.findByRole('tab', { name: 'الفروع' }));
    expect(await screen.findByRole('row', { name: /خلدا/ })).toBeInTheDocument();
    expect(screen.getByText('٣ مفتوحة من أصل ٢٠ مسموحة')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'إجراءات الفرع' })).toHaveLength(3);
    expect(await axeViolations()).toEqual([]);
  });

  it('salon edit branch picker in Arabic', async () => {
    arabic(`/salons/${SALON}/edit`, '/salons/:id/edit', <SalonEditPage />);
    await userEvent.click(await screen.findByRole('tab', { name: 'الخدمات' }, { timeout: 4000 }));
    expect(await screen.findByLabelText('الفرع', undefined, { timeout: 4000 })).toBeInTheDocument();
    expect(
      screen.getByText('ساعات العمل والإغلاقات والخدمات والموظفون محفوظة لكل فرع.'),
    ).toBeVisible();
    expect(await axeViolations()).toEqual([]);
  });

  it('bookings branch filter in Arabic', async () => {
    arabic(`/bookings?salon=${SALON}&branch=${KHALDA}`, '/bookings', <BookingsPage />);
    expect(await screen.findByLabelText('الفرع')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(2));
    expect(await axeViolations()).toEqual([]);
  });

  it('reconciliation filters render in Arabic without violations', async () => {
    arabic(
      `/finance/reconciliation?salon=${SALON}&branch=${KHALDA}`,
      '/finance/reconciliation',
      <ReconciliationPage />,
    );
    expect(await screen.findByRole('cell', { name: 'خلدا' })).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  it('single-column grids cannot grow wider than the page (tables and tab strips scroll inside)', () => {
    const css = (f: string) => readFileSync(`src/design/styles/${f}`, 'utf8');
    expect(css('base.css')).toMatch(/\.wab-stack \{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
    expect(css('form-kit.css')).toMatch(
      /\.wab-settings \{[^}]*grid-template-columns: minmax\(0, 1fr\)/,
    );
  });
});
