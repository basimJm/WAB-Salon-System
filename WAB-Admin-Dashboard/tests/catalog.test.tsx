import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { validateCatalogForm } from '@/domain/catalog/catalog';
import { parseListState } from '@/domain/shared/listState';
import { CATALOG_FILTER_KEYS, catalogKindOf } from '@/presentation/catalog/catalogKind';
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

describe('catalogKindOf', () => {
  const kindOf = (search: string) =>
    catalogKindOf(parseListState(new URLSearchParams(search), { filterKeys: CATALOG_FILTER_KEYS }));

  it('defaults to salons, keeps a salon audience, drops it for clinics and unknown values', () => {
    expect(kindOf('').query).toEqual({ businessType: 'SALON' });
    expect(kindOf('').forNew).toEqual({ businessType: 'SALON', audience: 'FEMALE' });
    expect(kindOf('audience=MALE').query).toEqual({ businessType: 'SALON', audience: 'MALE' });
    expect(kindOf('audience=MALE').forNew.audience).toBe('MALE');
    expect(kindOf('type=CLINIC&audience=MALE').query).toEqual({ businessType: 'CLINIC' });
    expect(kindOf('type=CLINIC').forNew).toEqual({ businessType: 'CLINIC', audience: 'BOTH' });
    expect(kindOf('type=SPA&audience=X').query).toEqual({ businessType: 'SALON' });
  });
});

describe('CatalogPage', () => {
  const open = () =>
    renderWithApp(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>,
    );

  it('is managed per type: salons first with an audience filter, clinics on their own (§5.19)', async () => {
    open();
    expect(await screen.findByText('Haircut')).toBeInTheDocument();
    expect(screen.getByText('Shave')).toBeInTheDocument();
    expect(screen.queryByText('Botox')).toBeNull();
    await userEvent.selectOptions(screen.getByLabelText('Audience'), 'MALE');
    await waitFor(() => expect(screen.queryByText('Haircut')).toBeNull());
    expect(screen.getByText('Shave')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Clinics' }));
    expect(await screen.findByText('Botox')).toBeInTheDocument();
    expect(screen.queryByText('Shave')).toBeNull();
    // Clinic services all serve everyone: no audience filter there.
    expect(screen.queryByLabelText('Audience')).toBeNull();
  });

  it('a new clinic service is fixed to everyone; a new salon service follows the audience filter', async () => {
    open();
    await userEvent.selectOptions(await screen.findByLabelText('Audience'), 'BOTH');
    await userEvent.click(screen.getByRole('button', { name: 'Add a service' }));
    let dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Business type')).toHaveValue('SALON');
    expect(within(dialog).getByLabelText('Audience')).toHaveValue('BOTH');
    expect(within(dialog).getByLabelText('Audience')).toBeEnabled();
    await userEvent.selectOptions(within(dialog).getByLabelText('Business type'), 'CLINIC');
    expect(within(dialog).getByLabelText('Audience')).toBeDisabled();
    expect(within(dialog).getByRole('note')).toHaveTextContent('Always for everyone');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Clinics' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add a service' }));
    dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Business type')).toHaveValue('CLINIC');
    expect(within(dialog).getByLabelText('Audience')).toHaveValue('BOTH');
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
