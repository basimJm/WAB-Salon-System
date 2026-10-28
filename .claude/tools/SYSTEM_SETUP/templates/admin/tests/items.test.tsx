import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MOCK_ITEMS } from '@/data/mock/itemsRoutes';
import {
  itemInputOf,
  MAX_ITEM_DESCRIPTION,
  MAX_ITEM_NAME,
  sortParamOf,
  validateItemForm,
} from '@/domain/items/items';
import { parseListState } from '@/domain/shared/listState';
import ItemDetailsPage from '@/presentation/items/ItemDetailsPage';
import ItemsPage from '@/presentation/items/ItemsPage';
import { itemExportParams, itemQueryOf, itemSortParam } from '@/presentation/items/itemFilters';
import { axeViolations } from './helpers/axe';
import { makeContainer, renderWithApp } from './helpers/render';

const FIRST = MOCK_ITEMS[0]!;
const bodyRows = () => screen.getAllByRole('row').length - 1;
const stateOf = (search: string) =>
  parseListState(new URLSearchParams(search), {
    filterKeys: ['status'],
    sortKeys: ['name', 'createdAt', 'updatedAt'],
  });

afterEach(() => vi.restoreAllMocks());

describe('item rules', () => {
  it('validates the name and description lengths', () => {
    expect(validateItemForm({ name: '', description: '' })).toEqual(['name']);
    expect(validateItemForm({ name: '  ', description: '' })).toEqual(['name']);
    expect(validateItemForm({ name: 'a'.repeat(MAX_ITEM_NAME + 1), description: '' })).toEqual([
      'name',
    ]);
    expect(
      validateItemForm({ name: 'ok', description: 'd'.repeat(MAX_ITEM_DESCRIPTION + 1) }),
    ).toEqual(['description']);
    expect(validateItemForm({ name: 'ok', description: 'fine' })).toEqual([]);
  });

  it('builds the server body: trimmed name, empty description as null', () => {
    expect(itemInputOf({ name: ' Plan ', description: '  ', status: 'ACTIVE' })).toEqual({
      name: 'Plan',
      description: null,
      status: 'ACTIVE',
    });
    expect(itemInputOf({ name: 'P', description: ' x ', status: 'ARCHIVED' }).description).toBe(
      'x',
    );
  });

  it('spells the sort parameter the way the server reads it', () => {
    expect(sortParamOf({ key: 'name', direction: 'asc' })).toBe('name');
    expect(sortParamOf({ key: 'createdAt', direction: 'desc' })).toBe('-createdAt');
  });
});

describe('list filters -> query and export params', () => {
  it('keeps page, size, search, a known status and a known sort; drops unknown values', () => {
    const q = itemQueryOf(stateOf('page=2&pageSize=10&q=plan&status=ACTIVE&sort=name:desc'));
    expect(q).toEqual({
      page: 2,
      pageSize: 10,
      q: 'plan',
      status: 'ACTIVE',
      sort: { key: 'name', direction: 'desc' },
    });
    expect(itemExportParams(q)).toEqual({ status: 'ACTIVE', q: 'plan' });
    expect(itemSortParam(q)).toBe('-name');
    const odd = itemQueryOf(stateOf('status=NOPE'));
    expect(odd.status).toBeUndefined();
    expect(itemExportParams(odd)).toEqual({});
    expect(itemSortParam(odd)).toBeUndefined();
  });
});

describe('items repository (through the contract-typed mock)', () => {
  it('lists, searches, filters, sorts and pages', async () => {
    const { repositories } = makeContainer();
    const all = await repositories.items.list({ page: 1, pageSize: 25 });
    expect(all.meta.total).toBe(MOCK_ITEMS.length);
    const active = await repositories.items.list({ page: 1, pageSize: 25, status: 'ACTIVE' });
    expect(active.items.map((i) => i.status)).toEqual(['ACTIVE']);
    const found = await repositories.items.list({ page: 1, pageSize: 25, q: 'legacy' });
    expect(found.items.map((i) => i.name)).toEqual(['Legacy plan']);
    const byName = await repositories.items.list({
      page: 1,
      pageSize: 2,
      sort: { key: 'name', direction: 'asc' },
    });
    expect(byName.items.map((i) => i.name)).toEqual(['Legacy plan', 'Pilot batch']);
    expect(byName.meta.total).toBe(3);
  });

  it('creates and updates with a reason; a duplicate name is refused with the domain code', async () => {
    const { repositories } = makeContainer();
    const created = await repositories.items.create({ name: 'New plan' }, 'first one');
    expect(created.status).toBe('ACTIVE');
    const updated = await repositories.items.update(created.id, { status: 'INACTIVE' }, 'pause');
    expect(updated.status).toBe('INACTIVE');
    expect((await repositories.items.get(created.id)).status).toBe('INACTIVE');
    await expect(repositories.items.create({ name: FIRST.name }, 'again')).rejects.toMatchObject({
      kind: 'conflict',
      code: 'ITEM_NAME_TAKEN',
    });
    await expect(repositories.items.get('64d100000000000000000099')).rejects.toMatchObject({
      kind: 'notFound',
    });
  });

  it('refuses an empty reason before anything is sent', async () => {
    const { repositories } = makeContainer();
    await expect(repositories.items.create({ name: 'x' }, '')).rejects.toMatchObject({
      kind: 'validation',
    });
  });
});

const list = (url = '/items', container = makeContainer()) =>
  renderWithApp(
    <MemoryRouter initialEntries={[url]}>
      <main>
        <Routes>
          <Route path="/items" element={<ItemsPage />} />
          <Route path="/items/:id" element={<ItemDetailsPage />} />
        </Routes>
      </main>
    </MemoryRouter>,
    container,
  );

describe('ItemsPage', () => {
  it('lists the items with status badges and links to the record', async () => {
    list();
    await waitFor(() => expect(bodyRows()).toBe(3));
    expect(screen.getByRole('link', { name: FIRST.name })).toHaveAttribute(
      'href',
      `/items/${FIRST.id}`,
    );
    expect(within(screen.getByRole('table')).getByText('Archived')).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  it('filters by status from the URL and clears the chip', async () => {
    list('/items?status=ARCHIVED');
    await waitFor(() => expect(bodyRows()).toBe(1));
    await userEvent.click(screen.getByRole('button', { name: /Status: Archived/ }));
    await waitFor(() => expect(bodyRows()).toBe(3));
  });

  it('creates an item through the drawer: validation first, then the reason, then the row appears', async () => {
    list();
    await waitFor(() => expect(bodyRows()).toBe(3));
    await userEvent.click(screen.getByRole('button', { name: 'New item' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(within(dialog).getAllByRole('alert').length).toBeGreaterThanOrEqual(2);
    await userEvent.type(within(dialog).getByLabelText('Name'), 'Fresh plan');
    await userEvent.type(within(dialog).getByLabelText(/Reason/), 'needed for the launch');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(bodyRows()).toBe(4));
    expect(screen.getByRole('link', { name: 'Fresh plan' })).toBeInTheDocument();
  });

  it('shows the server refusal inside the drawer (duplicate name)', async () => {
    list();
    await waitFor(() => expect(bodyRows()).toBe(3));
    await userEvent.click(screen.getByRole('button', { name: 'New item' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Name'), FIRST.name);
    await userEvent.type(within(dialog).getByLabelText(/Reason/), 'duplicate on purpose');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    // The server's own wording wins over the catalog message when it sends one.
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/Conflicts with other data/);
  });

  it('edits a row from its actions and the list refreshes', async () => {
    list();
    await waitFor(() => expect(bodyRows()).toBe(3));
    await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[1] as HTMLElement);
    const dialog = await screen.findByRole('dialog');
    await userEvent.selectOptions(within(dialog).getByLabelText('Status'), 'ARCHIVED');
    await userEvent.type(within(dialog).getByLabelText(/Reason/), 'retired');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() =>
      expect(within(screen.getByRole('table')).getAllByText('Archived')).toHaveLength(2),
    );
  });

  it('shows the error state with retry', async () => {
    const failing = makeContainer();
    failing.mock?.scenarios.set('serverError');
    list('/items', failing);
    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('renders in Arabic, right to left', async () => {
    renderWithApp(
      <MemoryRouter>
        <ItemsPage />
      </MemoryRouter>,
      makeContainer(),
      'ar',
    );
    expect(await screen.findByRole('heading', { level: 1, name: 'العناصر' })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
  });
});

describe('ItemDetailsPage', () => {
  it('shows the facts, the audit history of the record, and edits with a reason', async () => {
    list(`/items/${FIRST.id}`);
    expect(await screen.findByRole('heading', { level: 1, name: FIRST.name })).toBeInTheDocument();
    expect(screen.getByText(FIRST.description!)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'History' }));
    expect(await screen.findByText('Item update')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.clear(within(dialog).getByLabelText('Name'));
    await userEvent.type(within(dialog).getByLabelText('Name'), 'Renamed plan');
    await userEvent.type(within(dialog).getByLabelText(/Reason/), 'better name');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByRole('heading', { level: 1, name: 'Renamed plan' })).toBeVisible();
    expect(await screen.findByText('Item saved')).toBeInTheDocument();
    expect(await axeViolations()).toEqual([]);
  });

  it('a missing record shows the not-found error (no retry: it will not help) with the back link', async () => {
    list('/items/64d100000000000000000099');
    // The mock words its refusal like the server does; the catalog text is the fallback.
    expect(await screen.findByRole('alert')).toHaveTextContent(/not found/i);
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
    expect(screen.getByRole('link', { name: 'Back to Items' })).toHaveAttribute('href', '/items');
  });
});
