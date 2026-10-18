import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { validateBody } from '@/domain/content/content';
import LegalPagesPage from '@/presentation/content/LegalPagesPage';
import { makeContainer, renderWithApp } from './helpers/render';

const open = (container = makeContainer()) =>
  renderWithApp(
    <MemoryRouter>
      <LegalPagesPage />
    </MemoryRouter>,
    container,
  );
const rows = () => waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3));

describe('validateBody', () => {
  it('flags blank and oversize texts per language', () => {
    expect(validateBody({ ar: 'x', en: 'y' })).toEqual([]);
    expect(validateBody({ ar: ' ', en: 'y' })).toEqual(['ar']);
    expect(validateBody({ ar: 'x', en: 'y'.repeat(50_001) })).toEqual(['en']);
  });
});

describe('LegalPagesPage', () => {
  it('lists the pages of each app', async () => {
    open();
    await rows();
    expect(screen.getByText('Privacy policy')).toBeInTheDocument();
    expect(screen.getByText('Terms of use')).toBeInTheDocument();
  });

  it('edits a page: both languages are required, the reason is required, then it saves', async () => {
    open();
    await rows();
    await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0] as HTMLElement);
    const arabic = await screen.findByRole('textbox', { name: /Arabic/ });
    expect(arabic).toHaveValue('سياسة الخصوصية');
    await userEvent.clear(arabic);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Write the text (up to 50,000 characters)')).toBeInTheDocument();
    await userEvent.type(arabic, 'نص جديد');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Write the reason (at least 3 characters)')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Reason'), 'Legal update');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('textbox', { name: /Arabic/ })).toBeNull());
    await rows();
  });

  it('cancel returns to the list; the list shows the error state when the server fails', async () => {
    open();
    await rows();
    await userEvent.click(screen.getByRole('button', { name: 'Add a page' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await rows();
    const failing = makeContainer();
    failing.mock?.scenarios.set('serverError');
    open(failing);
    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
