import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MAX_ALERT_EMAILS, MOCK_EMAIL_CODE } from '@/constants/auth';
import { isEmail, isEmailCode, parseAlertEmails, passwordProblem } from '@/domain/profile/profile';
import ProfilePage from '@/presentation/profile/ProfilePage';
import { makeContainer, renderWithApp } from './helpers/render';

describe('profile rules', () => {
  it('validates emails and codes', () => {
    expect(isEmail('a@b.co')).toBe(true);
    expect(isEmail('a b@c.co')).toBe(false);
    expect(isEmail(`${'a'.repeat(250)}@b.co`)).toBe(false);
    expect(isEmailCode('123456')).toBe(true);
    expect(isEmailCode('12')).toBe(false);
    expect(isEmailCode('12a456')).toBe(false);
  });

  it('parses recipients: splits, lowercases, de-duplicates, reports invalid and too many', () => {
    const parsed = parseAlertEmails('A@x.co, b@x.co;a@x.co\nnope');
    expect(parsed.emails).toEqual(['a@x.co', 'b@x.co']);
    expect(parsed.invalid).toEqual(['nope']);
    expect(parsed.tooMany).toBe(false);
    expect(parseAlertEmails('').emails).toEqual([]);
    const many = Array.from({ length: MAX_ALERT_EMAILS + 1 }, (_, i) => `u${String(i)}@x.co`);
    expect(parseAlertEmails(many.join('\n')).tooMany).toBe(true);
  });

  it('finds the first password problem', () => {
    const ok = 'a-long-password-1';
    expect(passwordProblem('', ok, ok)).toBe('current');
    expect(passwordProblem('old', 'short', 'short')).toBe('short');
    expect(passwordProblem('old', 'x'.repeat(257), 'x'.repeat(257))).toBe('long');
    expect(passwordProblem(ok, ok, ok)).toBe('same');
    expect(passwordProblem('old', ok, `${ok}2`)).toBe('mismatch');
    expect(passwordProblem('old', ok, ok)).toBeNull();
  });
});

describe('ProfilePage', () => {
  const open = () =>
    renderWithApp(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
      makeContainer(),
      'en',
    );

  it('shows the account and the saved recipients', async () => {
    open();
    expect(await screen.findByText('admin@wab.example')).toBeInTheDocument();
    expect(screen.getByLabelText(/Recipients/)).toHaveValue('ops@wab.example');
  });

  it('saves recipients and rejects an invalid address without calling the server', async () => {
    const user = userEvent.setup();
    open();
    const box = await screen.findByLabelText(/Recipients/);
    await user.clear(box);
    await user.type(box, 'bad');
    await user.click(screen.getByRole('button', { name: 'Save recipients' }));
    expect(await screen.findByText(/Not valid email addresses: bad/)).toBeInTheDocument();
    await user.clear(box);
    await user.type(box, 'new@wab.example');
    await user.click(screen.getByRole('button', { name: 'Save recipients' }));
    expect(await screen.findByText('Alert recipients saved')).toBeInTheDocument();
  });

  it('checks the password form before sending and confirms a change', async () => {
    const user = userEvent.setup();
    open();
    await screen.findByText('admin@wab.example');
    const [current] = screen.getAllByLabelText('Current password');
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByText('Enter your current password.')).toBeInTheDocument();
    await user.type(current as HTMLElement, 'old-password');
    await user.type(screen.getByLabelText('New password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    expect(
      await screen.findByText(/at least 12 characters/i, { selector: '[role=alert]' }),
    ).toBeInTheDocument();
    await user.clear(screen.getByLabelText('New password'));
    await user.type(screen.getByLabelText('New password'), 'a-long-password-1');
    await user.type(screen.getByLabelText('Repeat the new password'), 'a-long-password-1');
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByText('Password changed')).toBeInTheDocument();
  });

  it('changes the email in two steps and shows the new address', async () => {
    const user = userEvent.setup();
    open();
    await screen.findByText('admin@wab.example');
    await user.type(screen.getByLabelText('New email address'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Send code' }));
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('New email address'));
    await user.type(screen.getByLabelText('New email address'), 'new@wab.example');
    await user.type(screen.getAllByLabelText('Current password')[1] as HTMLElement, 'old-password');
    await user.click(screen.getByRole('button', { name: 'Send code' }));
    const code = await screen.findByLabelText('Verification code');
    await user.type(code, '12');
    await user.click(screen.getByRole('button', { name: 'Confirm new email' }));
    expect(await screen.findByText('Enter the digits of the code.')).toBeInTheDocument();
    await user.clear(code);
    await user.type(code, MOCK_EMAIL_CODE);
    await user.click(screen.getByRole('button', { name: 'Confirm new email' }));
    await waitFor(() => expect(screen.getByText('new@wab.example')).toBeInTheDocument());
  });

  it('shows the error state when the server fails', async () => {
    const container = makeContainer();
    container.mock?.scenarios.set('serverError');
    renderWithApp(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
      container,
      'en',
    );
    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
