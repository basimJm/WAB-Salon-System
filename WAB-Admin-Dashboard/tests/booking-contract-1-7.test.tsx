import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18N_DEFAULT_NAMESPACE } from '@/constants/i18n';
import { createI18n } from '@/infrastructure/i18n/i18n';
import { BOOKINGS_STRINGS } from '@/locales/lazy/bookings';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { getBookingsByIdDataSchema, getBookingsDataSchema } from '@/data/contract/generated/dto';
import { MOCK_BOOKINGS } from '@/data/mock/bookingsRoutes';
import { uniqueStaff } from '@/domain/bookings/bookingRules';
import type { BookingDetails, BookingStaff } from '@/domain/bookings/bookings';
import BookingDetailsPage from '@/presentation/bookings/BookingDetailsPage';
import BookingsPage from '@/presentation/bookings/BookingsPage';
import { reasonLabel } from '@/presentation/bookings/bookingReason';
import { makeContainer, renderWithApp } from './helpers/render';

const [PENDING, APPROVED, COMPLETED, REJECTED] = MOCK_BOOKINGS.map((b) => b.id);
const SARA: BookingStaff = { id: 'a', name: 'Sara Ali', firstName: 'Sara', photoUrl: null };
const LINA: BookingStaff = {
  id: 'b',
  name: 'Lina Omar',
  firstName: 'Lina',
  photoUrl: 'https://cdn.example.test/lina.jpg',
};

type Patch = (b: BookingDetails) => BookingDetails;
const render = (path: string, language: 'en' | 'ar' = 'en', patch?: Patch) => {
  const container = makeContainer();
  if (patch) {
    const repo = container.repositories.bookings;
    const get = repo.get.bind(repo);
    vi.spyOn(repo, 'get').mockImplementation(async (id) => patch(await get(id)));
  }
  renderWithApp(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/bookings/:id" element={<BookingDetailsPage />} />
      </Routes>
    </MemoryRouter>,
    container,
    language,
  );
};
const fact = async (label: string) => {
  const term = await screen.findByText(label, { selector: 'dt' });
  return term.nextElementSibling as HTMLElement;
};

describe('admin contract 1.7.0 (SRV-170, ADM-107)', () => {
  it('the generated DTOs carry staff photos, the list rejection and paidAtSalon', () => {
    const row = getBookingsDataSchema().parse(MOCK_BOOKINGS);
    expect(row[3]?.rejection?.reasonCode).toBe('FULLY_BOOKED');
    expect(row[0]?.staff[0]).toMatchObject({ firstName: 'Sara', photoUrl: null });
    expect(() =>
      getBookingsByIdDataSchema().parse({ ...MOCK_BOOKINGS[0], money: { total: '1.000' } }),
    ).toThrow();
  });

  it('lists each staff member once, in order', () => {
    expect(uniqueStaff([SARA, LINA, SARA]).map((s) => s.id)).toEqual(['a', 'b']);
    expect(uniqueStaff([])).toEqual([]);
  });

  it('words a reason from its code, keeps unknown codes and adds the free text', () => {
    const i18n = createI18n('en');
    i18n.addResourceBundle('en', I18N_DEFAULT_NAMESPACE, BOOKINGS_STRINGS.en, true, false);
    const t = i18n.t;
    const at = '2026-10-20T10:00:00.000Z';
    expect(reasonLabel(t, { reasonCode: 'FULLY_BOOKED', reasonText: null, at })).toBe(
      'Fully booked',
    );
    expect(reasonLabel(t, { reasonCode: 'NEW_CODE', reasonText: '  ', at })).toBe('NEW_CODE');
    expect(reasonLabel(t, { reasonCode: 'OTHER', reasonText: 'Power cut', at })).toBe(
      'Other · Power cut',
    );
  });

  it('the list shows the rejection reason under the status of a rejected row only', async () => {
    render('/bookings');
    const rejected = (await screen.findByText('WAB-000004')).closest('tr') as HTMLElement;
    expect(within(rejected).getByText('Fully booked')).toBeInTheDocument();
    const pending = screen.getByText('WAB-000001').closest('tr') as HTMLElement;
    expect(within(pending).queryByText('Fully booked')).toBeNull();
    // The server's admin `q` matches the reference and the customer only (salon has its own filter).
    expect(
      screen.getByLabelText('Search booking reference, customer name or phone'),
    ).toBeInTheDocument();
  });

  it('details show the booking staff and each person staff member with photo or initials', async () => {
    render(`/bookings/${String(APPROVED)}`, 'en', (b) => ({
      ...b,
      staff: [SARA, LINA, SARA],
      persons: b.persons.map((p) => ({ ...p, staff: LINA })),
    }));
    const staff = await fact('Staff');
    expect(
      within(staff)
        .getAllByRole('img')
        .map((i) => i.getAttribute('aria-label')),
    ).toEqual(['Sara Ali', 'Lina Omar']);
    const table = screen.getByRole('table', { name: 'Persons' });
    const photo = within(table).getByRole('img', { name: 'Lina Omar' }).querySelector('img');
    expect(photo?.getAttribute('src')).toBe(LINA.photoUrl);
  });

  it('an open booking still owes the at-salon part and nothing was paid at the salon', async () => {
    render(`/bookings/${String(PENDING)}`);
    expect((await fact('Still to pay at the salon')).textContent).toContain('25.000');
    expect((await fact('Paid at the salon')).textContent).toContain('0.000');
  });

  it('a completed booking owes nothing and shows what was paid at the salon', async () => {
    render(`/bookings/${String(COMPLETED)}`);
    expect((await fact('Still to pay at the salon')).textContent).toContain('0.000');
    expect((await fact('Paid at the salon')).textContent).toContain('40.000');
  });

  it('a rejected booking shows the reason in Arabic and owes nothing', async () => {
    render(`/bookings/${String(REJECTED)}`, 'ar');
    expect((await fact('سبب الرفض')).textContent).toContain('المواعيد ممتلئة');
    expect((await fact('المتبقي للدفع في الصالون')).textContent).toMatch(/٠٫٠٠٠|0\.000/);
  });

  it('a cancelled booking shows the cancellation reason with its free text', async () => {
    render(`/bookings/${String(APPROVED)}`, 'en', (b) => ({
      ...b,
      cancellation: { reasonCode: 'SALON_EMERGENCY', reasonText: 'Flood', at: b.respondBy },
    }));
    expect((await fact('Cancellation reason')).textContent).toContain('Salon emergency · Flood');
    expect(screen.queryByText('Rejection reason', { selector: 'dt' })).toBeNull();
  });

  it('payment method and refund status are worded, not raw codes (e2e finding)', async () => {
    render(`/bookings/${String(PENDING)}`, 'en', (b) => ({ ...b, refundStatus: 'NONE' }));
    expect((await fact('Payment method')).textContent).toBe('Pay on arrival');
    expect((await fact('Refund')).textContent).toBe('No refund');
  });

  it('status history names the actor in words (e2e finding)', async () => {
    const user = userEvent.setup();
    render(`/bookings/${String(PENDING)}`, 'ar');
    await user.click(await screen.findByRole('tab', { name: 'سجل الحالات' }));
    expect(await screen.findByText(/العميل/, { selector: 'p' })).toBeInTheDocument();
    expect(screen.queryByText(/CUSTOMER/)).toBeNull();
  });

  it('an unknown payment method shows as sent', async () => {
    render(`/bookings/${String(PENDING)}`, 'en', (b) => ({ ...b, paymentMethod: 'WALLET' }));
    expect((await fact('Payment method')).textContent).toBe('WALLET');
  });
});
