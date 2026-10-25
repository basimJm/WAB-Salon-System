import { screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MOCK_BOOKINGS } from '@/data/mock/bookingsRoutes';
import { formatInstant } from '@/domain/shared/format';
import BookingDetailsPage from '@/presentation/bookings/BookingDetailsPage';
import BookingsPage from '@/presentation/bookings/BookingsPage';
import { makeContainer, renderWithApp } from './helpers/render';

// 21:30 UTC on 24 Oct is 00:30 on 25 Oct in Amman (UTC+3): the day and the 12-hour clock both change.
const REQUESTED = '2026-10-24T21:30:00.000Z';

const render = (path: string, language: 'en' | 'ar' = 'en') => {
  const container = makeContainer();
  const repo = container.repositories.bookings;
  const list = repo.list.bind(repo);
  const get = repo.get.bind(repo);
  vi.spyOn(repo, 'list').mockImplementation(async (q) => {
    const page = await list(q);
    return { ...page, items: page.items.map((b) => ({ ...b, requestedAt: REQUESTED })) };
  });
  vi.spyOn(repo, 'get').mockImplementation(async (id) => ({
    ...(await get(id)),
    requestedAt: REQUESTED,
  }));
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

describe('booking request time (requestedAt, G15)', () => {
  it('the formatter shows the Amman day and a 12-hour clock', () => {
    expect(formatInstant(REQUESTED, 'en', 'dateTime')).toMatch(/25 Oct 2026, 12:30\sam/i);
  });

  it('the bookings list has a Requested column in Amman 12-hour time', async () => {
    render('/bookings');
    expect(await screen.findByRole('columnheader', { name: 'Requested' })).toBeInTheDocument();
    const row = (await screen.findByText('WAB-000001')).closest('tr');
    expect(row).not.toBeNull();
    expect(
      within(row as HTMLElement).getByText(formatInstant(REQUESTED, 'en', 'dateTime')),
    ).toBeInTheDocument();
  });

  it('the booking details show it next to the appointment, in Arabic too', async () => {
    render(`/bookings/${MOCK_BOOKINGS[0]!.id}`, 'ar');
    expect(await screen.findByText('وقت الطلب')).toBeInTheDocument();
    expect(screen.getByText(formatInstant(REQUESTED, 'ar', 'dateTime'))).toBeInTheDocument();
  });
});
