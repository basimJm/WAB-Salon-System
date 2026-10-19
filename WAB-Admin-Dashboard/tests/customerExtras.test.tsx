import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import {
  canForceDelete,
  canPush,
  draftOf,
  isPushLink,
  profilePatch,
  profileProblems,
  pushProblems,
  splitName,
} from '@/domain/customers/customerRules';
import type { CustomerDetails } from '@/domain/customers/customers';
import { MOCK_CUSTOMERS } from '@/data/mock/customersRoutes';
import CustomerDetailsPage from '@/presentation/customers/CustomerDetailsPage';
import { makeContainer, renderWithApp } from './helpers/render';

const details: CustomerDetails = {
  ...MOCK_CUSTOMERS[0]!,
  email: 'dana@example.test',
  areaId: '',
  language: 'ar',
  pushEnabled: true,
  blockedReason: null,
  blockedAt: null,
  deletionScheduledAt: null,
  journeyUserId: 'j',
  devices: [
    {
      app: 'CUSTOMER',
      platform: 'ANDROID',
      appVersion: '1',
      lastSeenAt: '2026-10-01T00:00:00.000Z',
      pushToken: true,
    },
  ],
};

describe('customer rules', () => {
  it('splits the display name into first and last', () => {
    expect(splitName('Dana Khoury')).toEqual({ firstName: 'Dana', lastName: 'Khoury' });
    expect(splitName('  Rima  Abu Haddad ')).toEqual({ firstName: 'Rima', lastName: 'Abu Haddad' });
    expect(splitName('Solo')).toEqual({ firstName: 'Solo', lastName: '' });
  });

  it('sends only what changed', () => {
    const d = draftOf(details);
    expect(profilePatch(details, d)).toEqual({});
    expect(profilePatch(details, { ...d, firstName: ' Dina ', language: 'en' })).toEqual({
      firstName: 'Dina',
      language: 'en',
    });
    expect(profilePatch(details, { ...d, email: '' })).toEqual({});
  });

  it('flags a missing name or a bad email', () => {
    const d = draftOf(details);
    expect([...profileProblems({ ...d, firstName: '' })]).toEqual(['firstName']);
    expect([...profileProblems({ ...d, lastName: 'x'.repeat(51) })]).toEqual(['lastName']);
    expect([...profileProblems({ ...d, email: 'nope' })]).toEqual(['email']);
    expect(profileProblems(d).size).toBe(0);
  });

  it('checks the push form and the link', () => {
    const ok = { title: { ar: 'عنوان', en: 'Title' }, body: { ar: 'نص', en: 'Body' } };
    expect(pushProblems(ok).size).toBe(0);
    expect([...pushProblems({ ...ok, title: { ar: '', en: 'T' } })]).toEqual(['titleAr']);
    expect([...pushProblems({ ...ok, body: { ar: 'x', en: 'y'.repeat(1001) } })]).toEqual([
      'bodyEn',
    ]);
    expect([...pushProblems({ ...ok, link: 'http://x.test' })]).toEqual(['link']);
    expect(isPushLink('/bookings/123')).toBe(true);
    expect(isPushLink('https://wab.example/x')).toBe(true);
    expect(isPushLink('bookings')).toBe(false);
  });

  it('allows a push only to an active customer with a device, and force delete unless deleted', () => {
    expect(canPush(details)).toBe(true);
    expect(canPush({ ...details, status: 'BLOCKED' })).toBe(false);
    expect(canPush({ ...details, pushEnabled: false })).toBe(false);
    expect(canPush({ ...details, devices: [] })).toBe(false);
    expect(canForceDelete('ACTIVE')).toBe(true);
    expect(canForceDelete('DELETION_PENDING')).toBe(true);
    expect(canForceDelete('DELETED')).toBe(false);
  });
});

describe('CustomerDetailsPage extras', () => {
  const open = (id: string) =>
    renderWithApp(
      <MemoryRouter initialEntries={[`/customers/${id}`]}>
        <Routes>
          <Route path="/customers/:id" element={<CustomerDetailsPage />} />
        </Routes>
      </MemoryRouter>,
      makeContainer(),
      'en',
    );
  const saveWithReason = async (user: ReturnType<typeof userEvent.setup>, root: HTMLElement) => {
    await user.type(within(root).getByLabelText('Reason'), 'Support call');
    await user.click(within(root).getByRole('button', { name: 'Save' }));
  };

  it('edits the profile: nothing changed is refused, a change is saved with a reason', async () => {
    const user = userEvent.setup();
    open(MOCK_CUSTOMERS[0]!.id);
    await user.click(await screen.findByRole('button', { name: 'Edit profile' }));
    const drawer = await screen.findByRole('dialog');
    await saveWithReason(user, drawer);
    expect(await within(drawer).findByText('Nothing was changed.')).toBeInTheDocument();
    const first = within(drawer).getByLabelText('First name');
    await user.clear(first);
    await user.type(first, 'Dina');
    await user.click(within(drawer).getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Profile saved')).toBeInTheDocument();
  });

  it('checks the push form, then sends the push', async () => {
    const user = userEvent.setup();
    open(MOCK_CUSTOMERS[0]!.id);
    await user.click(await screen.findByRole('button', { name: 'Send push' }));
    const drawer = await screen.findByRole('dialog');
    await saveWithReason(user, drawer);
    expect(
      await within(drawer).findByText('Write an Arabic title (up to 200 characters).'),
    ).toBeInTheDocument();
    await user.type(within(drawer).getByLabelText('Title (Arabic)'), 'مرحبا');
    await user.type(within(drawer).getByLabelText('Title (English)'), 'Hello');
    await user.type(within(drawer).getByLabelText('Message (Arabic)'), 'رسالة');
    await user.type(within(drawer).getByLabelText('Message (English)'), 'Message');
    await user.click(within(drawer).getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Push sent')).toBeInTheDocument();
  });

  it('deletes the account now after a reason', async () => {
    const user = userEvent.setup();
    open(MOCK_CUSTOMERS[0]!.id);
    await user.click(await screen.findByRole('button', { name: 'Delete now' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByRole('textbox'), 'Legal request');
    await user.click(within(dialog).getByRole('button', { name: 'Delete now' }));
    expect(await screen.findByText('Account deleted')).toBeInTheDocument();
  });

  it('lists the reviews written and the notifications received', async () => {
    const user = userEvent.setup();
    open(MOCK_CUSTOMERS[0]!.id);
    await user.click(await screen.findByRole('tab', { name: 'Reviews written' }));
    expect(await screen.findByText('Lovely service')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Notifications' }));
    expect(await screen.findByText('Booking approved')).toBeInTheDocument();
  });

  it('hides push for a blocked customer', async () => {
    open(MOCK_CUSTOMERS[1]!.id);
    await screen.findByRole('button', { name: 'Edit profile' });
    expect(screen.queryByRole('button', { name: 'Send push' })).toBeNull();
  });
});
