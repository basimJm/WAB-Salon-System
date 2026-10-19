import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import {
  canCancel,
  canReassign,
  canRefund,
  isRefundAmount,
  maxRefund,
} from '@/domain/bookings/bookingRules';
import { MOCK_BOOKINGS } from '@/data/mock/bookingsRoutes';
import BookingDetailsPage from '@/presentation/bookings/BookingDetailsPage';
import { bookingExportParams } from '@/presentation/bookings/bookingFilters';
import { makeContainer, renderWithApp } from './helpers/render';

const PENDING = MOCK_BOOKINGS[0]!.id;
const PAID = MOCK_BOOKINGS[1]!.id;
const DONE = MOCK_BOOKINGS[2]!.id;

describe('booking rules', () => {
  it('lets only open bookings be cancelled', () => {
    expect(canCancel({ status: 'PENDING' })).toBe(true);
    expect(canCancel({ status: 'APPROVED' })).toBe(true);
    expect(canCancel({ status: 'COMPLETED' })).toBe(false);
  });

  it('lets only an approved booking that has not started be reassigned (server rule)', () => {
    const now = new Date('2026-10-19T10:00:00.000Z');
    const future = '2026-10-20T09:00:00.000Z';
    expect(canReassign({ status: 'APPROVED', appointmentStart: future }, now)).toBe(true);
    expect(canReassign({ status: 'PENDING', appointmentStart: future }, now)).toBe(false);
    expect(canReassign({ status: 'CANCELLED_BY_SALON', appointmentStart: future }, now)).toBe(
      false,
    );
    expect(
      canReassign({ status: 'APPROVED', appointmentStart: '2026-10-19T09:00:00.000Z' }, now),
    ).toBe(false);
  });

  it('works out what can still be refunded in fils, never below zero', () => {
    expect(maxRefund({ paidOnline: '20.000', refunded: '5.500' })).toBe('14.500');
    expect(maxRefund({ paidOnline: '20.000', refunded: '20.000' })).toBe('0.000');
    expect(maxRefund({ paidOnline: '10.000', refunded: '12.000' })).toBe('0.000');
    expect(
      canRefund({
        money: {
          total: '30.000',
          dueOnline: '0.000',
          paidOnline: '0.000',
          remaining: '30.000',
          refunded: '0.000',
        },
      }),
    ).toBe(false);
  });

  it('accepts a refund amount that is positive and within the limit', () => {
    expect(isRefundAmount('14.500', '14.500')).toBe(true);
    expect(isRefundAmount('14.501', '14.500')).toBe(false);
    expect(isRefundAmount('0.000', '14.500')).toBe(false);
    expect(isRefundAmount('abc', '14.500')).toBe(false);
    expect(isRefundAmount('', '14.500')).toBe(false);
  });
});

describe('bookingExportParams', () => {
  it('keeps the filters the export accepts and drops the rest', () => {
    const none = bookingExportParams({ page: 1, pageSize: 25, tab: 'TODAY', brideOnly: true });
    // The server's bookings export fails without any params: "no filter" is every status.
    expect(Object.keys(none)).toEqual(['statuses']);
    expect(none['statuses']).toHaveLength(8);
    expect(
      bookingExportParams({
        page: 1,
        pageSize: 25,
        status: ['PENDING'],
        paymentStatus: 'FULLY_PAID',
        salonId: 's',
        q: 'wab',
      }),
    ).toEqual({ statuses: ['PENDING'], paymentStatus: 'FULLY_PAID', salonId: 's', q: 'wab' });
  });
});

describe('BookingDetailsPage actions', () => {
  const open = (id: string) =>
    renderWithApp(
      <MemoryRouter initialEntries={[`/bookings/${id}`]}>
        <Routes>
          <Route path="/bookings/:id" element={<BookingDetailsPage />} />
        </Routes>
      </MemoryRouter>,
      makeContainer(),
      'en',
    );
  const drawer = async () => screen.findByRole('dialog');
  const fillReason = async (user: ReturnType<typeof userEvent.setup>, root: HTMLElement) => {
    await user.type(within(root).getByLabelText('Reason'), 'Owner asked');
    await user.click(within(root).getByRole('button', { name: 'Save' }));
  };

  it('offers no reassign for a pending booking (the server refuses it)', async () => {
    open(PENDING);
    await screen.findByRole('button', { name: 'Change status' });
    expect(screen.queryByRole('button', { name: 'Reassign staff' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Cancel booking' })).toBeInTheDocument();
  });

  it('hides reassign, cancel and refund where they do not apply', async () => {
    open(DONE);
    await screen.findByRole('button', { name: 'Change status' });
    expect(screen.queryByRole('button', { name: 'Reassign staff' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Refund' })).toBeNull();
  });

  it('reassigns a person to an eligible staff member', async () => {
    const user = userEvent.setup();
    open(PAID);
    await user.click(await screen.findByRole('button', { name: 'Reassign staff' }));
    const d = await drawer();
    expect(await within(d).findByRole('option', { name: 'Lina Omar' })).toBeInTheDocument();
    await fillReason(user, d);
    expect(await screen.findByText('Staff changed')).toBeInTheDocument();
  });

  it('cancels with a chosen side and a reason', async () => {
    const user = userEvent.setup();
    open(PENDING);
    await user.click(await screen.findByRole('button', { name: 'Cancel booking' }));
    const d = await drawer();
    await user.selectOptions(within(d).getByLabelText('Cancel as'), 'SALON');
    expect(within(d).getByText('The customer gets a full refund.')).toBeInTheDocument();
    await fillReason(user, d);
    expect(await screen.findByText('Booking cancelled')).toBeInTheDocument();
  });

  it('refuses a refund above what was paid, then refunds a valid amount', async () => {
    const user = userEvent.setup();
    open(PAID);
    await user.click(await screen.findByRole('button', { name: 'Refund' }));
    const d = await drawer();
    const amount = within(d).getByLabelText('Amount to refund');
    expect(amount).toHaveValue('20.000');
    await user.clear(amount);
    await user.type(amount, '25');
    await fillReason(user, d);
    expect(await within(d).findByText(/not above what can be refunded/)).toBeInTheDocument();
    await user.clear(amount);
    await user.type(amount, '5');
    await user.click(within(d).getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Refund started')).toBeInTheDocument();
  });
});
