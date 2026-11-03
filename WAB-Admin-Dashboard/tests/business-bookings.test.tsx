import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MOCK_BOOKINGS } from '@/data/mock/bookingsRoutes';
import { BOOKING_TABS } from '@/domain/bookings/bookings';
import { SETTING_DEFINITIONS } from '@/domain/settings/registry';
import {
  BUSINESS_TYPES,
  audienceFor,
  audiencesFor,
  brideAllowed,
  canChangeAudience,
} from '@/domain/shared/businessType';
import { parseListState } from '@/domain/shared/listState';
import { ALERT_KINDS } from '@/domain/alerts/alerts';
import BookingDetailsPage from '@/presentation/bookings/BookingDetailsPage';
import {
  BOOKING_FILTER_KEYS,
  bookingExportParams,
  bookingQueryOf,
} from '@/presentation/bookings/bookingFilters';
import { DesignLink, originItems } from '@/presentation/bookings/bookingOrigin';
import { makeContainer, renderWithApp } from './helpers/render';

const queryOf = (qs: string) =>
  bookingQueryOf(parseListState(new URLSearchParams(qs), { filterKeys: BOOKING_FILTER_KEYS }));
const t = ((key: string) => key) as never;

describe('tattoo studios (§5.23)', () => {
  it('are a business type that always serves everyone and never takes brides', () => {
    expect(BUSINESS_TYPES).toContain('TATTOO');
    expect(audiencesFor('TATTOO')).toEqual(['BOTH']);
    expect(audienceFor('TATTOO', 'MALE')).toBe('BOTH');
    expect(canChangeAudience('TATTOO')).toBe(false);
    expect(brideAllowed({ businessType: 'TATTOO', audience: 'BOTH' })).toBe(false);
  });

  it('shows the design image link only when there is one', () => {
    const { container, rerender } = render(<DesignLink url={null} t={t} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<DesignLink url="https://files.example.test/signed" t={t} />);
    expect(screen.getByRole('link', { name: 'bookings.viewDesign' })).toHaveAttribute(
      'href',
      'https://files.example.test/signed',
    );
  });
});

describe('business-made bookings (§5.20)', () => {
  it('filters and exports by source; unknown values are dropped', () => {
    expect(queryOf('source=MERCHANT')).toMatchObject({ source: 'MERCHANT' });
    expect(queryOf('source=PHONE')).not.toHaveProperty('source');
    expect(bookingExportParams(queryOf('source=CUSTOMER_APP'))).toMatchObject({
      source: 'CUSTOMER_APP',
    });
  });

  it('names who made it: the business and the member, or the customer app', () => {
    expect(originItems({ source: 'MERCHANT', createdBy: { id: 'm1', name: 'Rana' } }, t)).toEqual([
      { key: 'source', label: 'bookings.source', value: 'bookings.sources.MERCHANT' },
      { key: 'createdBy', label: 'bookings.createdBy', value: 'Rana' },
    ]);
    expect(originItems({ source: 'CUSTOMER_APP', createdBy: null }, t)).toHaveLength(1);
  });

  it('details show the contact without an account, the business and the member', async () => {
    const merchantMade = MOCK_BOOKINGS.find((b) => b.source === 'MERCHANT');
    renderWithApp(
      <MemoryRouter initialEntries={[`/bookings/${merchantMade?.id ?? ''}`]}>
        <Routes>
          <Route path="/bookings/:id" element={<BookingDetailsPage />} />
        </Routes>
      </MemoryRouter>,
      makeContainer(),
    );
    expect(await screen.findByText(/Hiba Saleh · No WAB account/)).toBeInTheDocument();
    expect(screen.getByText('The business')).toBeInTheDocument();
    // The creator row (Sara Ali also appears as the booking's staff).
    expect(screen.getByText('Created by')).toBeInTheDocument();
    expect(screen.getAllByText('Sara Ali').length).toBeGreaterThan(1);
    expect(screen.queryByRole('link', { name: 'Hiba Saleh' })).toBeNull();
  });
});

describe('closing finished bookings (§5.21)', () => {
  it('has the To close tab, the overdue alert kind and both settings', () => {
    expect(BOOKING_TABS).toContain('TO_CLOSE');
    expect(queryOf('tab=TO_CLOSE')).toMatchObject({ tab: 'TO_CLOSE' });
    expect(ALERT_KINDS).toContain('BOOKING_CLOSE_OVERDUE');
    const keys = SETTING_DEFINITIONS.map((d) => d.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        'booking.closeReminderIntervalMinutes',
        'booking.closeOverdueAlertHours',
      ]),
    );
  });
});
