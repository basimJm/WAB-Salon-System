import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { isEmail, isPhone } from '@/domain/content/content';
import ContactPage from '@/presentation/content/ContactPage';
import FaqPage from '@/presentation/content/FaqPage';
import { renderWithApp } from './helpers/render';

const open = (ui: ReactElement) => renderWithApp(<MemoryRouter>{ui}</MemoryRouter>);
const rows = () => waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(2));

describe('contact rules', () => {
  it.each([
    ['+962790000000', true],
    ['0790000000', false],
    ['+0123456', false],
    ['+96279', false],
  ])('isPhone(%s)', (v, ok) => expect(isPhone(v)).toBe(ok));
  it.each([
    ['a@b.co', true],
    ['a@b', false],
    ['a b@c.co', false],
  ])('isEmail(%s)', (v, ok) => expect(isEmail(v)).toBe(ok));
});

describe('FaqPage', () => {
  it('lists, validates and saves an edit with a reason', async () => {
    open(<FaqPage />);
    await rows();
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    const answer = within(dialog).getByLabelText('Answer (English)');
    await userEvent.clear(answer);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('Required, up to 2000 characters')).toBeInTheDocument();
    await userEvent.type(answer, 'Choose a salon first.');
    await userEvent.type(within(dialog).getByLabelText('Reason'), 'Clearer wording');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

describe('ContactPage', () => {
  it('shows the contact row and rejects a bad phone and email', async () => {
    open(<ContactPage />);
    await rows();
    expect(screen.getByText('+962790000000')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    const phone = within(dialog).getByLabelText('Phone');
    await userEvent.clear(phone);
    await userEvent.type(phone, '0790');
    await userEvent.clear(within(dialog).getByLabelText('Email'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('Enter a valid email')).toBeInTheDocument();
    expect(
      within(dialog).getByText('Use the international format, e.g. +962790000000'),
    ).toBeInTheDocument();
  });
});
