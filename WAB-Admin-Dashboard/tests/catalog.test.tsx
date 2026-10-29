import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { validateCatalogForm } from '@/domain/catalog/catalog';
import CatalogPage from '@/presentation/catalog/CatalogPage';
import { renderWithApp } from './helpers/render';

const valid = { nameAr: 'ا', nameEn: 'a', descAr: 'ا', descEn: 'a', imageKey: 'k', sortOrder: '0' };

describe('validateCatalogForm', () => {
  it('accepts a complete form and reports each problem', () => {
    expect(validateCatalogForm(valid)).toEqual([]);
    expect(validateCatalogForm({ ...valid, nameAr: ' ', imageKey: '' })).toEqual([
      'nameAr',
      'image',
    ]);
    expect(validateCatalogForm({ ...valid, descEn: 'x'.repeat(501) })).toEqual(['descEn']);
    expect(validateCatalogForm({ ...valid, nameEn: 'x'.repeat(201), sortOrder: '1.5' })).toEqual([
      'nameEn',
      'order',
    ]);
  });
});

describe('CatalogPage', () => {
  const open = () =>
    renderWithApp(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>,
    );

  it('shows every business type with its badges, and the server filters clinics (§5.19)', async () => {
    open();
    expect(await screen.findByText('Haircut')).toBeInTheDocument();
    expect(screen.getByText('Botox')).toBeInTheDocument();
    expect(screen.getAllByText('Clinic').length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('radio', { name: 'Clinics' }));
    await waitFor(() => expect(screen.queryByText('Haircut')).toBeNull());
    expect(screen.getByText('Botox')).toBeInTheDocument();
  });

  it('warns before deactivating, and saves with a reason', async () => {
    open();
    const [edit] = await screen.findAllByRole('button', { name: 'Edit' });
    if (!edit) throw new Error('no row');
    await userEvent.click(edit);
    const dialog = await screen.findByRole('dialog');
    // Type and audience are fixed once the service exists (the server's patch takes neither).
    expect(within(dialog).getByLabelText('Business type')).toBeDisabled();
    expect(within(dialog).getByLabelText('Audience')).toBeDisabled();
    await userEvent.click(within(dialog).getByRole('switch', { name: 'Active' }));
    expect(within(dialog).getByText(/keep it/)).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText('Reason'), 'Retired service');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByText('Inactive')).toBeInTheDocument();
  });

  it('create needs an image and every text', async () => {
    open();
    await userEvent.click(await screen.findByRole('button', { name: 'Add a service' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('Upload an image')).toBeInTheDocument();
    expect(within(dialog).getAllByText('Required, up to 200 characters').length).toBeGreaterThan(0);
  });
});
