import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MOCK_BOOKINGS } from '@/data/mock/bookingsRoutes';
import { MOCK_BRANCHES, MOCK_BRANCH_IDS } from '@/data/mock/branchesFixture';
import { MOCK_SALONS } from '@/data/mock/salonsRoutes';
import SalonDetailsPage from '@/presentation/salons/SalonDetailsPage';
import { axeViolations } from './helpers/axe';
import { makeContainer, renderWithApp } from './helpers/render';

const NOOR = MOCK_SALONS[0]!.id;
const open = async (id = NOOR, container = makeContainer()) => {
  renderWithApp(
    <MemoryRouter initialEntries={[`/salons/${id}`]}>
      <Routes>
        <Route
          path="/salons/:id"
          element={
            <main>
              <SalonDetailsPage />
            </main>
          }
        />
      </Routes>
    </MemoryRouter>,
    container,
  );
  await userEvent.click(await screen.findByRole('tab', { name: 'Branches' }));
  return within(await screen.findByRole('region', { name: 'Branches' }));
};
const rowOf = async (name: RegExp) => screen.findByRole('row', { name });
const act = async (row: RegExp, action: string, reason = 'Checked with owner') => {
  await userEvent.click(within(await rowOf(row)).getByRole('button', { name: 'Branch actions' }));
  await userEvent.click(await screen.findByRole('menuitem', { name: action }));
  const dialog = await screen.findByRole('dialog');
  await userEvent.type(within(dialog).getByRole('textbox'), reason);
  await userEvent.click(within(dialog).getByRole('button', { name: action }));
};

describe('salon branches tab (ADM-089)', () => {
  it('lists the branches main first with status, readiness, area, staff and the limit', async () => {
    await open();
    const main = await rowOf(/Abdoun/);
    expect(within(main).getByText('Main')).toBeInTheDocument();
    expect(within(main).getByText('Complete')).toBeInTheDocument();
    expect(within(main).getByRole('cell', { name: '1' })).toBeInTheDocument();
    const dabouq = await rowOf(/Dabouq/);
    expect(within(dabouq).getByText('Offline: Renovation')).toBeInTheDocument();
    expect(within(dabouq).getByText('Missing: SERVICES, STAFF')).toBeInTheDocument();
    expect(await screen.findByText('3 open of 20 allowed')).toBeInTheDocument();
  });

  it('has no accessibility violations (table and the open drawer)', async () => {
    await open();
    await rowOf(/Khalda/);
    expect(await axeViolations()).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: 'Add branch' }));
    await screen.findByRole('dialog', { name: 'Add a branch' });
    expect(await axeViolations()).toEqual([]);
  });

  it('validates the new-branch form, then creates the branch with a reason', async () => {
    await open();
    await userEvent.click(await screen.findByRole('button', { name: 'Add branch' }));
    const drawer = within(await screen.findByRole('dialog', { name: 'Add a branch' }));
    await userEvent.click(drawer.getByRole('button', { name: 'Save' }));
    expect(drawer.getByText('Enter the Arabic name (up to 60 characters)')).toBeInTheDocument();
    expect(drawer.getByText('Choose a city')).toBeInTheDocument();
    await userEvent.type(drawer.getByLabelText('Name (Arabic)'), 'الصويفية');
    await userEvent.type(drawer.getByLabelText('Name (English)'), 'Sweifieh');
    await userEvent.selectOptions(drawer.getByLabelText('City'), 'Amman');
    await userEvent.selectOptions(drawer.getByLabelText('Area'), 'Abdoun');
    await userEvent.type(drawer.getByLabelText('Address'), 'Wakalat street');
    await userEvent.type(drawer.getByLabelText('Latitude'), '31.95');
    await userEvent.type(drawer.getByLabelText('Longitude'), '35.86');
    expect(drawer.getByRole('link', { name: 'Open on the map' })).toHaveAttribute(
      'target',
      '_blank',
    );
    await userEvent.type(drawer.getByLabelText('Phone'), '+962790000777');
    await userEvent.type(drawer.getByLabelText('Reason'), 'Owner opened a branch');
    await userEvent.click(drawer.getByRole('button', { name: 'Save' }));
    expect(await rowOf(/Sweifieh/)).toBeInTheDocument();
    expect(await screen.findByText('4 open of 20 allowed')).toBeInTheDocument();
  });

  it('edits a branch and refuses to save when nothing changed', async () => {
    await open();
    await userEvent.click(
      within(await rowOf(/Khalda/)).getByRole('button', { name: 'Branch actions' }),
    );
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    const drawer = within(await screen.findByRole('dialog', { name: 'Edit Khalda' }));
    await userEvent.type(drawer.getByLabelText('Reason'), 'Typo fix');
    await userEvent.click(drawer.getByRole('button', { name: 'Save' }));
    expect(drawer.getByText('Nothing changed')).toBeInTheDocument();
    await userEvent.clear(drawer.getByLabelText('Name (English)'));
    await userEvent.type(drawer.getByLabelText('Name (English)'), 'Khalda Hills');
    await userEvent.click(drawer.getByRole('button', { name: 'Save' }));
    expect(await rowOf(/Khalda Hills/)).toBeInTheDocument();
  });

  it('a close refused for upcoming bookings lists them with links', async () => {
    await open();
    await act(/Khalda/, 'Close branch');
    const dialog = within(
      await screen.findByRole('dialog', { name: /still has upcoming bookings/ }),
    );
    const blocking = MOCK_BOOKINGS[1]!.id;
    expect(dialog.getByRole('link', { name: `Open booking ${blocking}` })).toHaveAttribute(
      'href',
      `/bookings/${blocking}`,
    );
    await userEvent.click(dialog.getByRole('button', { name: 'Got it' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('closes a branch without bookings, brings one online and changes the main branch', async () => {
    await open();
    await act(/Dabouq/, 'Close branch');
    expect(await within(await rowOf(/Dabouq/)).findByText('Closed')).toBeInTheDocument();
    expect(
      within(await rowOf(/Dabouq/)).queryByRole('button', { name: 'Branch actions' }),
    ).toBeNull();
    await act(/Khalda/, 'Make main branch');
    await waitFor(async () =>
      expect(within(await rowOf(/Khalda/)).getByText('Main')).toBeInTheDocument(),
    );
  });

  it('takes a branch offline with the reason shown to the owner', async () => {
    await open();
    await act(/Khalda/, 'Take offline', 'Water leak');
    expect(
      await within(await rowOf(/Khalda/)).findByText('Offline: Water leak'),
    ).toBeInTheDocument();
  });

  it('shows the error state with retry when the server fails', async () => {
    const c = makeContainer();
    renderWithApp(
      <MemoryRouter initialEntries={[`/salons/${NOOR}`]}>
        <Routes>
          <Route path="/salons/:id" element={<SalonDetailsPage />} />
        </Routes>
      </MemoryRouter>,
      c,
    );
    await screen.findByRole('heading', { name: 'Noor Salon' });
    c.mock?.scenarios.set('serverError');
    await userEvent.click(screen.getByRole('tab', { name: 'Branches' }));
    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('shows a refused action above the table', async () => {
    const c = makeContainer();
    await open(NOOR, c);
    await rowOf(/Khalda/);
    c.mock?.scenarios.set('conflict');
    await act(/Khalda/, 'Take offline');
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});

describe('branch repository against the mock server rules', () => {
  const code = (p: Promise<unknown>) =>
    p.then(
      () => 'ok',
      (e: { code?: string }) => e.code,
    );

  it('refuses closing the last branch and the main branch', async () => {
    const { repositories } = makeContainer();
    const royal = MOCK_SALONS[1]!.id;
    const royalMain = MOCK_BRANCHES[royal]![0]!.id;
    expect(await code(repositories.branches.act(royal, royalMain, 'close', 'x'))).toBe(
      'LAST_BRANCH',
    );
    expect(
      await code(repositories.branches.act(NOOR, MOCK_BRANCH_IDS.noorMain, 'close', 'x')),
    ).toBe('INVALID_TRANSITION');
    expect(await code(repositories.branches.act(NOOR, 'missing', 'online', 'x'))).toBe(
      'BRANCH_NOT_FOUND',
    );
  });

  it('refuses a new branch past salon.maxBranches', async () => {
    const { repositories } = makeContainer();
    const input = {
      name: { ar: 'فرع', en: 'Branch' },
      location: { latitude: 31.9, longitude: 35.9 },
      locationText: 'Street',
      cityId: '64a000000000000000000001',
      areaId: '64a000000000000000000021',
      phone: '+962790000123',
    };
    const results: unknown[] = [];
    for (let i = 0; i < 18; i += 1)
      results.push(await code(repositories.branches.create(NOOR, input, 'growth')));
    expect(results.slice(0, 17).every((r) => r === 'ok')).toBe(true);
    expect(results[17]).toBe('BRANCH_LIMIT_REACHED');
  });
});
