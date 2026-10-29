import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MOCK_SALONS } from '@/data/mock/salonsRoutes';
import {
  audienceFor,
  audiencesFor,
  brideAllowed,
  canChangeAudience,
  catalogFits,
  isAudience,
  isBusinessType,
  isWidening,
  type BusinessType,
} from '@/domain/shared/businessType';
import { parseListState } from '@/domain/shared/listState';
import BookingDetailsPage from '@/presentation/bookings/BookingDetailsPage';
import BookingsPage from '@/presentation/bookings/BookingsPage';
import {
  BOOKING_FILTER_KEYS,
  bookingExportParams,
  bookingQueryOf,
} from '@/presentation/bookings/bookingFilters';
import { reviewFilters } from '@/presentation/reviews/reviewFilters';
import { BusinessBadges } from '@/presentation/shared/BusinessBadges';
import {
  BUSINESS_TYPE_FILTER_KEY,
  businessTypeFilterOf,
  businessTypeParam,
} from '@/presentation/shared/businessFilter';
import { BusinessTypeFilter } from '@/presentation/shared/BusinessTypeFilter';
import { MOCK_BOOKINGS } from '@/data/mock/bookingsRoutes';
import { makeContainer, renderWithApp } from './helpers/render';

const stateOf = (search: string, keys: readonly string[]) =>
  parseListState(new URLSearchParams(search), { filterKeys: [...keys] });
const salon = (audience: 'MALE' | 'FEMALE' | 'BOTH') => ({
  businessType: 'SALON' as const,
  audience,
});
const CLINIC = { businessType: 'CLINIC' as const, audience: 'BOTH' as const };

describe('business type rules (BUSINESS_DOMAIN §5.19)', () => {
  it('knows the enums and drops unknown values', () => {
    expect(isBusinessType('CLINIC')).toBe(true);
    expect(isBusinessType('SPA')).toBe(false);
    expect(isAudience('BOTH')).toBe(true);
    expect(isAudience(undefined)).toBe(false);
  });

  it('a clinic is always for everyone; a salon may serve women, men or both', () => {
    expect(audiencesFor('CLINIC')).toEqual(['BOTH']);
    expect(audiencesFor('SALON')).toEqual(['FEMALE', 'MALE', 'BOTH']);
    expect(audienceFor('CLINIC', 'MALE')).toBe('BOTH');
    expect(audienceFor('SALON', 'MALE')).toBe('MALE');
  });

  it('widening goes to BOTH only; only a salon can change its audience', () => {
    expect(isWidening('MALE', 'BOTH')).toBe(true);
    expect(isWidening('BOTH', 'FEMALE')).toBe(false);
    expect(isWidening('MALE', 'FEMALE')).toBe(false);
    expect(isWidening('BOTH', 'BOTH')).toBe(false);
    expect(canChangeAudience('SALON')).toBe(true);
    expect(canChangeAudience('CLINIC')).toBe(false);
  });

  it('catalog services fit by type and audience, BOTH on either side fits', () => {
    expect(catalogFits(salon('FEMALE'), salon('FEMALE'))).toBe(true);
    expect(catalogFits(salon('FEMALE'), salon('MALE'))).toBe(false);
    expect(catalogFits(salon('BOTH'), salon('MALE'))).toBe(true);
    expect(catalogFits(salon('MALE'), salon('BOTH'))).toBe(true);
    expect(catalogFits(CLINIC, salon('BOTH'))).toBe(false);
    expect(catalogFits(salon('BOTH'), CLINIC)).toBe(false);
    expect(catalogFits(CLINIC, CLINIC)).toBe(true);
  });

  it('brides only for women and mixed salons, never clinics', () => {
    expect(brideAllowed(salon('FEMALE'))).toBe(true);
    expect(brideAllowed(salon('BOTH'))).toBe(true);
    expect(brideAllowed(salon('MALE'))).toBe(false);
    expect(brideAllowed(CLINIC)).toBe(false);
  });
});

describe('business type filter', () => {
  it('reads the URL key, ignores unknown values and builds the query part', () => {
    expect(businessTypeFilterOf(stateOf('type=CLINIC', [BUSINESS_TYPE_FILTER_KEY]))).toBe('CLINIC');
    expect(businessTypeFilterOf(stateOf('type=SPA', [BUSINESS_TYPE_FILTER_KEY]))).toBeUndefined();
    expect(businessTypeParam('SALON')).toEqual({ businessType: 'SALON' });
    expect(businessTypeParam(undefined)).toEqual({});
  });

  it('bookings, their export and reviews send the type to the server', () => {
    const q = bookingQueryOf(stateOf('type=CLINIC', BOOKING_FILTER_KEYS));
    expect(q.businessType).toBe('CLINIC');
    expect(bookingExportParams(q)).toMatchObject({ businessType: 'CLINIC' });
    expect(
      bookingExportParams(bookingQueryOf(stateOf('', BOOKING_FILTER_KEYS))),
    ).not.toHaveProperty('businessType');
    const reviews = reviewFilters(stateOf('type=SALON', ['status', BUSINESS_TYPE_FILTER_KEY]));
    expect(reviews.query.businessType).toBe('SALON');
  });

  it('the switch offers All / Salons / Clinics and reports undefined for All', async () => {
    const seen: (BusinessType | undefined)[] = [];
    function Probe() {
      const [value, setValue] = useState<BusinessType | undefined>('SALON');
      return (
        <BusinessTypeFilter
          value={value}
          onChange={(next) => {
            seen.push(next);
            setValue(next);
          }}
        />
      );
    }
    renderWithApp(<Probe />, makeContainer(), 'en');
    expect(screen.getByRole('radio', { name: 'Salons' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'Clinics' }));
    await userEvent.click(screen.getByRole('radio', { name: 'All' }));
    expect(seen).toEqual(['CLINIC', undefined]);
  });

  it('badges show the type and the audience in both languages', () => {
    renderWithApp(<BusinessBadges businessType="CLINIC" audience="BOTH" />, makeContainer(), 'ar');
    expect(screen.getByText('عيادة')).toBeInTheDocument();
    expect(screen.getByText('رجال ونساء')).toBeInTheDocument();
  });
});

describe('bookings by business type', () => {
  const list = () =>
    renderWithApp(
      <MemoryRouter>
        <BookingsPage />
      </MemoryRouter>,
      makeContainer(),
      'en',
    );

  it('rows show the salon type + audience snapshot; Clinics asks the server for clinic bookings', async () => {
    list();
    expect((await screen.findAllByText('Noor Salon')).length).toBe(MOCK_BOOKINGS.length);
    expect(screen.getAllByText('Women').length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('radio', { name: 'Clinics' }));
    await waitFor(() => expect(screen.queryByText('Noor Salon')).toBeNull());
  });

  it('details show the type + audience and each person gender', async () => {
    const booking = MOCK_BOOKINGS[0];
    if (!booking) throw new Error('no booking');
    renderWithApp(
      <MemoryRouter initialEntries={[`/bookings/${booking.id}`]}>
        <Routes>
          <Route path="/bookings/:id" element={<BookingDetailsPage />} />
        </Routes>
      </MemoryRouter>,
      makeContainer(),
      'en',
    );
    const term = await screen.findByText('Business type');
    const row = term.closest('div');
    if (!row) throw new Error('no row');
    expect(within(row).getByText('Salon')).toBeInTheDocument();
    expect(await screen.findByText('Dana · Women')).toBeInTheDocument();
  });

  it('the clinic of the mock is a CLINIC with audience BOTH', () => {
    expect(MOCK_SALONS.find((s) => s.businessType === 'CLINIC')?.audience).toBe('BOTH');
  });
});

describe('salon-edit profile (contract 1.12.0 still lists gender, the server sends type + audience)', () => {
  it('is read without the stale gender field', async () => {
    const { repositories } = makeContainer();
    const profile = await repositories.salonEdit.profile(MOCK_SALONS[0]?.id ?? '');
    expect(profile.name).toBe('Noor Salon');
    expect(profile).not.toHaveProperty('gender');
  });
});
