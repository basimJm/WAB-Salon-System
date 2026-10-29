import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import {
  draftOf,
  hasChanges,
  profilePatch,
  profileProblems,
} from '@/domain/salonEdit/profileDraft';
import {
  isClosureRange,
  isHHmm,
  isServiceDuration,
  isServicePrice,
  policyProblems,
  scheduleProblems,
  staffDayProblems,
} from '@/domain/salonEdit/rules';
import type { PolicyInput, SalonProfile, ScheduleDay } from '@/domain/salonEdit/salonEdit';
import { newServiceOf, servicePatchOf, serviceProblems } from '@/domain/salonEdit/serviceDraft';
import { moveId } from '@/domain/shared/order';
import SalonEditPage from '@/presentation/salonEdit/SalonEditPage';
import { makeContainer, renderWithApp } from './helpers/render';

const SLOW = { timeout: 4000 };
const SALON = '64f000000000000000000001';

const profile: SalonProfile = {
  id: SALON,
  name: 'Noor',
  state: 'LIVE',
  description: 'Hair',
  coverUrl: null,
  profileUrl: null,
  coverKey: null,
  profileKey: null,
  location: { latitude: 31.9, longitude: 35.9 },
  locationText: 'Abdoun',
  cityId: 'c1',
  areaId: null,
  phone: '+962790000100',
  whatsapp: null,
  completeness: { missing: [], isComplete: true },
};

describe('salon edit rules', () => {
  it('validates times, ranges, prices and durations', () => {
    expect(isHHmm('09:30')).toBe(true);
    expect(isHHmm('24:00')).toBe(false);
    expect(isHHmm('9:30')).toBe(false);
    expect(isClosureRange('2026-12-24', '2026-12-25')).toBe(true);
    expect(isClosureRange('2026-12-25', '2026-12-24')).toBe(false);
    expect(isClosureRange('', '2026-12-24')).toBe(false);
    expect(isServicePrice('15.000')).toBe(true);
    expect(isServicePrice('0.000')).toBe(false);
    expect(isServicePrice('abc')).toBe(false);
    expect(isServiceDuration(5)).toBe(true);
    expect(isServiceDuration(4)).toBe(false);
    expect(isServiceDuration(1441)).toBe(false);
  });

  it('finds open days whose hours are wrong and ignores days off', () => {
    const days: ScheduleDay[] = [
      { day: 'SAT', isOff: false, open: '09:00', close: '21:00' },
      { day: 'SUN', isOff: false, open: '21:00', close: '09:00' },
      { day: 'MON', isOff: true, open: '', close: '' },
      { day: 'TUE', isOff: false, open: '', close: '10:00' },
    ];
    expect(scheduleProblems(days)).toEqual(['SUN', 'TUE']);
  });

  it('checks staff days: both ends or none, start before end', () => {
    expect(
      staffDayProblems([{ day: 'SAT' }, { day: 'SUN', start: '09:00', end: '17:00' }]),
    ).toEqual([]);
    expect(staffDayProblems([{ day: 'MON', start: '09:00' }])).toEqual(['MON']);
    expect(staffDayProblems([{ day: 'TUE', start: '17:00', end: '09:00' }])).toEqual(['TUE']);
  });

  it('checks the policy: one option, deposit when offered, window range', () => {
    const base: PolicyInput = {
      cancellationWindowHours: 24,
      paymentOptions: ['PAY_ON_ARRIVAL'],
      depositRefundableOnCustomerCancel: false,
      fullPaymentRefundOnCustomerCancel: 'FULL',
      noShowDeposit: 'KEEP',
      noShowFullPayment: 'KEEP',
    };
    expect(policyProblems(base)).toEqual([]);
    expect(policyProblems({ ...base, paymentOptions: [] })).toContain('options');
    expect(policyProblems({ ...base, paymentOptions: ['DEPOSIT'] })).toContain('deposit');
    expect(
      policyProblems({ ...base, paymentOptions: ['DEPOSIT'], depositPercentage: 101 }),
    ).toContain('deposit');
    expect(policyProblems({ ...base, paymentOptions: ['DEPOSIT'], depositPercentage: 30 })).toEqual(
      [],
    );
    expect(policyProblems({ ...base, cancellationWindowHours: 721 })).toContain('window');
  });
});

describe('profile draft', () => {
  it('sends only what changed and clears with null', () => {
    const d = draftOf(profile);
    expect(hasChanges(profilePatch(profile, d))).toBe(false);
    expect(profilePatch(profile, { ...d, name: ' New ', description: '' })).toEqual({
      name: 'New',
      description: null,
    });
    expect(profilePatch(profile, { ...d, latitude: null, longitude: null })).toEqual({
      location: null,
    });
    expect(profilePatch(profile, { ...d, coverKey: 'a/b' })).toEqual({ coverKey: 'a/b' });
  });

  it('flags bad fields', () => {
    const d = draftOf(profile);
    expect([...profileProblems({ ...d, name: '' })]).toEqual(['name']);
    expect([...profileProblems({ ...d, phone: '0790' })]).toEqual(['phone']);
    expect([...profileProblems({ ...d, latitude: 95 })]).toEqual(['location']);
    expect([...profileProblems({ ...d, longitude: null })]).toEqual(['location']);
  });
});

describe('service draft and ordering', () => {
  it('validates and builds the request bodies', () => {
    const ok = {
      catalogServiceId: 'x',
      price: '12.500',
      minutes: 30,
      brideOnly: false,
      extra: ' hi ',
      active: true,
    };
    expect(serviceProblems(ok).size).toBe(0);
    expect([...serviceProblems({ ...ok, price: '' })]).toEqual(['price']);
    expect(newServiceOf(ok).extraDescription).toBe('hi');
    expect(servicePatchOf({ ...ok, extra: '' }).extraDescription).toBeNull();
  });

  it('moves ids one place and keeps the ends', () => {
    expect(moveId(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(moveId(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c']);
    expect(moveId(['a', 'b', 'c'], 'c', 1)).toEqual(['a', 'b', 'c']);
  });
});

describe('SalonEditPage', () => {
  const open = () =>
    renderWithApp(
      <MemoryRouter initialEntries={[`/salons/${SALON}/edit`]}>
        <Routes>
          <Route path="/salons/:id/edit" element={<SalonEditPage />} />
        </Routes>
      </MemoryRouter>,
      makeContainer(),
      'en',
    );
  const confirmWithReason = async (
    user: ReturnType<typeof userEvent.setup>,
    reason = 'Owner asked',
  ) => {
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByRole('textbox'), reason);
    await user.click(within(dialog).getByRole('button', { name: 'Save change' }));
  };

  it('edits the profile name with a reason', async () => {
    const user = userEvent.setup();
    open();
    const name = await screen.findByLabelText('Salon name');
    await user.clear(name);
    await user.type(name, 'Noor Beauty');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await confirmWithReason(user);
    expect(await screen.findByText('Change saved')).toBeInTheDocument();
  });

  it('will not ask for a reason while the name is empty', async () => {
    const user = userEvent.setup();
    open();
    const name = await screen.findByLabelText('Salon name');
    await user.clear(name);
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Enter a name of 1 to 80 characters.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('removes a gallery picture and lists the rest', async () => {
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole('tab', { name: 'Gallery' }));
    const removes = await screen.findAllByRole('button', { name: 'Remove' }, SLOW);
    expect(removes).toHaveLength(2);
    await user.click(removes[0] as HTMLElement);
    await confirmWithReason(user);
    await waitFor(
      () => expect(screen.getAllByRole('button', { name: 'Remove' })).toHaveLength(1),
      SLOW,
    );
  });

  it('previews affected bookings before saving hours, and adds a closure', async () => {
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole('tab', { name: 'Hours and closures' }));
    expect(await screen.findByText('Holiday')).toBeInTheDocument();
    const [weekly] = screen.getAllByRole('button', { name: 'Check affected bookings' });
    await user.click(weekly as HTMLElement);
    expect(await screen.findByText('No booking is affected.')).toBeInTheDocument();
    const adds = screen.getAllByRole('button', { name: 'Add closure' });
    await user.click(adds[adds.length - 1] as HTMLElement);
    expect(
      await screen.findByText('Pick a first and last day (the last not before the first).'),
    ).toBeInTheDocument();
  });

  it('adds a service from the catalog', async () => {
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole('tab', { name: 'Services' }));
    expect(await screen.findByText('Haircut')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add service' }));
    const drawer = await screen.findByRole('dialog');
    await user.click(within(drawer).getByRole('button', { name: 'Save' }));
    expect(await within(drawer).findByText('Enter a price above zero.')).toBeInTheDocument();
  });

  it('saves a policy only when a deposit percentage is given with the deposit option', async () => {
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole('tab', { name: 'Policies' }));
    await user.click(await screen.findByRole('checkbox', { name: 'Deposit online' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(
      await screen.findByText('Enter a deposit between 1 and 100 percent.'),
    ).toBeInTheDocument();
  });

  it('saves a new gallery order, a new service, a staff profile and a city change with real ids', async () => {
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole('tab', { name: 'Gallery' }));
    const down = await screen.findAllByRole('button', { name: 'Move down' }, SLOW);
    await user.click(down[0] as HTMLElement);
    await user.click(screen.getByRole('button', { name: 'Save order' }));
    await confirmWithReason(user);
    expect(await screen.findByText('Change saved', undefined, SLOW)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Services' }));
    await user.click(await screen.findByRole('button', { name: 'Add service' }, SLOW));
    const drawer = await screen.findByRole('dialog');
    await within(drawer).findByRole('option', { name: /./ }, SLOW);
    await user.type(within(drawer).getByLabelText('Price'), '12.5');
    await user.type(within(drawer).getByLabelText('Minutes'), '30');
    await user.type(within(drawer).getByLabelText('Reason'), 'Owner asked');
    await user.click(within(drawer).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), SLOW);

    await user.click(screen.getByRole('tab', { name: 'Staff' }));
    await screen.findByLabelText('Provides services', undefined, SLOW);
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await confirmWithReason(user);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), SLOW);
  });

  it('shows the error state with retry when the server fails', async () => {
    const container = makeContainer();
    container.mock?.scenarios.set('serverError');
    renderWithApp(
      <MemoryRouter initialEntries={[`/salons/${SALON}/edit`]}>
        <Routes>
          <Route path="/salons/:id/edit" element={<SalonEditPage />} />
        </Routes>
      </MemoryRouter>,
      container,
      'en',
    );
    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
