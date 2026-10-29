import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { isIban, normalizeIban } from '@/domain/salons/salons';
import { MOCK_SALONS } from '@/data/mock/salonsRoutes';
import SalonDetailsPage from '@/presentation/salons/SalonDetailsPage';
import { renderWithApp } from './helpers/render';

const at = (id: string) =>
  renderWithApp(
    <MemoryRouter initialEntries={[`/salons/${id}`]}>
      <Routes>
        <Route path="/salons/:id" element={<SalonDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('IBAN helpers', () => {
  it('ignores spaces and case', () => {
    expect(normalizeIban('jo94 cbjo 0010')).toBe('JO94CBJO0010');
    expect(isIban('JO94CBJO0010000000000131000302')).toBe(true);
    expect(isIban('jo94 cbjo 0010 0000 0000 0131 0003 02')).toBe(true);
    expect(isIban('12345')).toBe(false);
  });
});

describe('salon actions', () => {
  it('takes a live salon offline with a reason, then offers to put it online', async () => {
    at(MOCK_SALONS[0]!.id);
    await userEvent.click(await screen.findByRole('button', { name: 'Take offline' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByRole('textbox'), 'Owner asked');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Take offline' }));
    expect(await screen.findByRole('button', { name: 'Put online' })).toBeInTheDocument();
  });

  it('changing the audience warns, rejects the same audience, and saves a different one', async () => {
    at(MOCK_SALONS[0]!.id);
    await userEvent.click(await screen.findByRole('button', { name: 'Change audience' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('note')).toHaveTextContent('switches off');
    await userEvent.type(within(dialog).getByLabelText('Reason'), 'Wrong audience');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('Choose a different audience')).toBeInTheDocument();
    await userEvent.selectOptions(within(dialog).getByLabelText('Audience'), 'MALE');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByText('Men')).toBeInTheDocument();
  });

  it('bank details: hidden until asked, then replaced with a valid IBAN', async () => {
    at(MOCK_SALONS[0]!.id);
    await userEvent.click(await screen.findByRole('tab', { name: 'Payout details' }));
    expect(screen.queryByText('IBAN')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Show bank details' }));
    expect(await screen.findByText('No bank details yet')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Replace bank details' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Bank'), 'Arab Bank');
    await userEvent.type(within(dialog).getByLabelText('Account holder'), 'Noor Salon');
    await userEvent.type(within(dialog).getByLabelText('IBAN'), '123');
    await userEvent.type(within(dialog).getByLabelText('Reason'), 'New account');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('Enter a valid IBAN')).toBeInTheDocument();
    await userEvent.clear(within(dialog).getByLabelText('IBAN'));
    await userEvent.type(
      within(dialog).getByLabelText('IBAN'),
      'JO94 CBJO 0010 0000 0000 0131 0003 02',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByText('Arab Bank')).toBeInTheDocument();
  });
});
