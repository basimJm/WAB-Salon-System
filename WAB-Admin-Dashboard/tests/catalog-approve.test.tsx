import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as dto from '@/data/contract/generated/dto';
import { AppError } from '@/infrastructure/errors/AppError';
import { approveInputOf, approveProblems, type ApproveDraft } from '@/domain/catalog/catalog';
import RequestsPage from '@/presentation/catalog/RequestsPage';
import { makeContainer, renderWithApp } from './helpers/render';

const REAL_ID = '64e000000000000000000001';
const draft = (over: Partial<ApproveDraft> = {}): ApproveDraft => ({
  mode: 'create',
  nameAr: 'سبا',
  nameEn: ' Hair spa ',
  descAr: 'علاج',
  descEn: 'Treatment',
  catalogServiceId: '',
  ...over,
});

describe('approveProblems / approveInputOf', () => {
  it('create needs both names and descriptions within their limits', () => {
    expect(approveProblems(draft())).toEqual(new Set());
    expect(approveProblems(draft({ nameAr: ' ', descEn: 'x'.repeat(501) }))).toEqual(
      new Set(['nameAr', 'descEn']),
    );
  });

  it('map needs a picked service and ignores the text fields', () => {
    expect(approveProblems(draft({ mode: 'map', nameAr: '' }))).toEqual(new Set(['service']));
    expect(approveProblems(draft({ mode: 'map', catalogServiceId: REAL_ID }))).toEqual(new Set());
  });

  it('map sends only the service id; create sends trimmed texts and keeps the salon image', () => {
    expect(approveInputOf(draft({ mode: 'map', catalogServiceId: REAL_ID }), 'k/a.webp')).toEqual({
      catalogServiceId: REAL_ID,
    });
    expect(approveInputOf(draft(), 'k/a.webp')).toEqual({
      name: { ar: 'سبا', en: 'Hair spa' },
      description: { ar: 'علاج', en: 'Treatment' },
      imageKey: 'k/a.webp',
    });
    expect(approveInputOf(draft(), null)).not.toHaveProperty('imageKey');
  });
});

describe('approve body schema (SRV-125, contract 1.5.0)', () => {
  const approveBody = dto.postCatalogRequestsByIdApproveBodySchema;
  it('the generated schema accepts a real catalog service id (S6 fixed by SRV-151)', () => {
    expect(approveBody().safeParse({ catalogServiceId: REAL_ID, reason: 'Same' }).success).toBe(
      true,
    );
  });

  it('still refuses a malformed id and still accepts the create shape', () => {
    expect(approveBody().safeParse({ catalogServiceId: 'abc', reason: 'x' }).success).toBe(false);
    const create = approveInputOf(draft(), null);
    expect(approveBody().safeParse({ ...create, reason: 'Good' }).success).toBe(true);
  });
});

describe('RequestsPage approve: map to an existing service', () => {
  it('lists only active services that fit the salon (type + audience) and sends the picked id', async () => {
    const container = makeContainer();
    const approve = vi.spyOn(container.repositories.catalog.requests, 'approve');
    renderWithApp(
      <MemoryRouter>
        <RequestsPage />
      </MemoryRouter>,
      container,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Use an existing service' }));
    const select = await within(dialog).findByLabelText('Catalog service');
    // Noor Salon is a women's salon: the men's "Shave" and the clinic "Botox" are not offered.
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Haircut']);
    expect(within(dialog).queryByLabelText('Name (English)')).toBeNull();
    await userEvent.type(within(dialog).getByLabelText('Reason'), 'Already in the catalog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(approve).toHaveBeenCalledWith(
      expect.any(String),
      { catalogServiceId: REAL_ID },
      'Already in the catalog',
    );
    expect(await screen.findByText('No requests')).toBeInTheDocument();
  });

  it('shows the empty hint and a field error when no service matches', async () => {
    const container = makeContainer();
    vi.spyOn(container.repositories.catalog.services, 'list').mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 100, total: 0 },
    });
    renderWithApp(
      <MemoryRouter>
        <RequestsPage />
      </MemoryRouter>,
      container,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Use an existing service' }));
    expect(await within(dialog).findByText(/no active service/i)).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText('Reason'), 'Linking it');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('Pick a catalog service')).toBeInTheDocument();
  });

  it('shows the error when the salon cannot be read', async () => {
    const container = makeContainer();
    vi.spyOn(container.repositories.salons, 'get').mockRejectedValue(
      new AppError({ kind: 'network' }),
    );
    renderWithApp(
      <MemoryRouter>
        <RequestsPage />
      </MemoryRouter>,
      container,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Use an existing service' }));
    expect(await within(dialog).findByText(/no internet connection/i)).toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Catalog service')).toBeNull();
  });
});
