import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '@/data/api/ApiClient';
import { MOCK_BRANCH_IDS } from '@/data/mock/branchesFixture';
import { RemoteSalonEditRepository } from '@/data/salonEdit/RemoteSalonEditRepository';
import SalonEditPage from '@/presentation/salonEdit/SalonEditPage';
import { makeContainer, renderWithApp } from './helpers/render';

const SLOW = { timeout: 4000 };
const SALON = '64f000000000000000000001';
const BRANCH = MOCK_BRANCH_IDS.noorSecond;

const open = () =>
  renderWithApp(
    <MemoryRouter initialEntries={[`/salons/${SALON}/edit`]}>
      <Routes>
        <Route path="/salons/:id/edit" element={<SalonEditPage />} />
      </Routes>
    </MemoryRouter>,
    makeContainer(),
    'en',
  );
const memberOptions = () =>
  within(screen.getByLabelText('Member'))
    .getAllByRole('option')
    .map((o) => o.textContent);

describe('branch-scoped salon editing (ADM-090)', () => {
  it('sends ?branchId on every branch-scoped call and leaves it out for the main branch', async () => {
    const execute = vi.fn((..._args: unknown[]) => Promise.resolve({ data: [] }));
    const repo = new RemoteSalonEditRepository({ execute } as unknown as ApiClient);
    const scope = { salonId: SALON, branchId: BRANCH };
    await repo.hours(scope);
    await repo.saveHours(scope, [], 'r');
    await repo.previewClosure(scope, { from: '2026-12-01', to: '2026-12-02' });
    await repo.removeClosure(scope, 'c1', 'r');
    await repo.services(scope);
    await repo.updateService(scope, 's1', { active: false }, 'r');
    for (const [, args] of execute.mock.calls)
      expect((args as { query: { branchId?: string } }).query.branchId).toBe(BRANCH);
    const [, removeArgs] = execute.mock.calls[3] as [unknown, { params: object }];
    expect(removeArgs.params).toEqual({ id: SALON, closureId: 'c1' });
    execute.mockClear();
    await repo.hours({ salonId: SALON });
    expect(execute.mock.calls[0]?.[1]).toEqual({ params: { id: SALON }, query: {} });
    await repo.moveMember(SALON, 'm1', BRANCH, 'Needed there');
    expect(execute.mock.calls[1]?.[1]).toEqual({
      params: { id: SALON, memberId: 'm1' },
      body: { branchId: BRANCH, reason: 'Needed there' },
    });
  });

  it('shows the branch picker on branch tabs only, main branch first', async () => {
    const user = userEvent.setup();
    open();
    await screen.findByLabelText('Salon name', undefined, SLOW);
    expect(screen.queryByLabelText('Branch')).toBeNull();
    await user.click(screen.getByRole('tab', { name: 'Services' }));
    const picker = await screen.findByLabelText('Branch', undefined, SLOW);
    expect((picker as HTMLSelectElement).selectedOptions[0]?.textContent).toBe('Abdoun');
    expect(within(picker).queryByRole('option', { name: 'Dabouq' })).not.toBeNull();
  });

  it('keeps services per branch: a service added to Khalda is not on Abdoun (header + rows)', async () => {
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole('tab', { name: 'Services' }, SLOW));
    await user.selectOptions(await screen.findByLabelText('Branch', undefined, SLOW), 'Khalda');
    await user.click(await screen.findByRole('button', { name: 'Add service' }, SLOW));
    const drawer = await screen.findByRole('dialog');
    await within(drawer).findByRole('option', { name: /./ }, SLOW);
    await user.type(within(drawer).getByLabelText('Price'), '20');
    await user.type(within(drawer).getByLabelText('Minutes'), '30');
    await user.type(within(drawer).getByLabelText('Reason'), 'Khalda menu');
    await user.click(within(drawer).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), SLOW);
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3), SLOW);
    await user.selectOptions(screen.getByLabelText('Branch'), 'Abdoun');
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(2), SLOW);
  });

  it('lists the staff of the picked branch and moves a member to another branch', async () => {
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole('tab', { name: 'Staff' }, SLOW));
    await screen.findByLabelText('Provides services', undefined, SLOW);
    expect(memberOptions()).toEqual(['Sara Ali']);
    await user.selectOptions(screen.getByLabelText('Branch'), 'Khalda');
    await waitFor(() => expect(memberOptions()).toEqual(['Lina Odeh']), SLOW);
    const target = screen.getByLabelText('Move to branch');
    expect(within(target).queryByRole('option', { name: 'Khalda' })).toBeNull();
    await user.selectOptions(target, 'Abdoun');
    await user.click(screen.getByRole('button', { name: 'Move' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByRole('textbox'), 'Needed in Abdoun');
    await user.click(within(dialog).getByRole('button', { name: 'Save change' }));
    expect(await screen.findByText('This branch has no staff yet.', undefined, SLOW)).toBeVisible();
    await user.selectOptions(screen.getByLabelText('Branch'), 'Abdoun');
    await waitFor(() => expect(memberOptions()).toEqual(['Sara Ali', 'Lina Odeh']), SLOW);
  });
});
