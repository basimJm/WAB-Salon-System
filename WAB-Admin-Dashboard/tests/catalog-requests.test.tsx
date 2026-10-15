import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import RequestsPage from '@/presentation/catalog/RequestsPage';
import { renderWithApp } from './helpers/render';

const open = () =>
  renderWithApp(
    <MemoryRouter>
      <RequestsPage />
    </MemoryRouter>,
  );

describe('RequestsPage', () => {
  it('shows pending requests with the salon and the date', async () => {
    open();
    expect(await screen.findByText('Hair spa')).toBeInTheDocument();
    expect(screen.getByText('Noor Salon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
  });

  it('approve needs translated texts and a reason, then the request leaves the pending list', async () => {
    open();
    await userEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Name (English)')).toHaveValue('Hair spa');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(
      await within(dialog).findByText('Write the reason (at least 3 characters)'),
    ).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText('Reason'), 'Good addition');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByText('No requests')).toBeInTheDocument();
  });

  it('reject asks for the reason first', async () => {
    open();
    await userEvent.click(await screen.findByRole('button', { name: 'Reject' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByRole('textbox'), 'Already covered');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByText('No requests')).toBeInTheDocument();
  });
});
