import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { moveId, validatePlacement } from '@/domain/placements/placements';
import PlacementsPage from '@/presentation/placements/PlacementsPage';
import { makeContainer, renderWithApp } from './helpers/render';

const open = () =>
  renderWithApp(
    <MemoryRouter>
      <PlacementsPage />
    </MemoryRouter>,
    makeContainer(),
  );
const bodyRows = () => screen.getAllByRole('row').length - 1;
const ok = { salonId: 's', start: '2026-10-01', end: '', order: '', amount: '150.000', note: '' };

describe('placement rules', () => {
  it('moveId swaps neighbours and ignores moves past the ends', () => {
    expect(moveId(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(moveId(['a', 'b', 'c'], 'b', 1)).toEqual(['a', 'c', 'b']);
    expect(moveId(['a', 'b'], 'a', -1)).toEqual(['a', 'b']);
    expect(moveId(['a', 'b'], 'x', 1)).toEqual(['a', 'b']);
  });

  it('validates salon, amount, period, order and note', () => {
    expect(validatePlacement(ok, true)).toEqual([]);
    expect(validatePlacement({ ...ok, salonId: '' }, true)).toEqual(['salonId']);
    expect(validatePlacement({ ...ok, salonId: '' }, false)).toEqual([]);
    expect(validatePlacement({ ...ok, amount: '12.5555' }, true)).toEqual(['amount']);
    expect(validatePlacement({ ...ok, start: '2026-10-10', end: '2026-10-01' }, true)).toEqual([
      'period',
    ]);
    expect(validatePlacement({ ...ok, order: '-1' }, true)).toEqual(['order']);
    expect(validatePlacement({ ...ok, note: 'x'.repeat(501) }, true)).toEqual(['note']);
  });
});

describe('PlacementsPage', () => {
  it('shows the Recommended salons in order and switches to Recommended clinics (§5.13)', async () => {
    open();
    await waitFor(() => expect(bodyRows()).toBe(3));
    expect(screen.getByText('Noor Salon')).toBeInTheDocument();
    expect(screen.queryByText('Glow Clinic')).toBeNull();
    await userEvent.click(screen.getByRole('radio', { name: 'Clinics' }));
    await waitFor(() => expect(screen.getByText('Glow Clinic')).toBeInTheDocument());
    expect(screen.queryByText('Noor Salon')).toBeNull();
  });

  it('moves a salon down: the order numbers follow', async () => {
    open();
    await waitFor(() => expect(bodyRows()).toBe(3));
    await userEvent.click(screen.getByRole('button', { name: 'Move Noor Salon down' }));
    await waitFor(() =>
      expect(
        within(screen.getAllByRole('row')[1] as HTMLElement).getByText('Lama Beauty'),
      ).toBeInTheDocument(),
    );
  });

  it('ends a placement with a reason', async () => {
    open();
    await waitFor(() => expect(bodyRows()).toBe(3));
    await userEvent.click(screen.getAllByRole('button', { name: 'End now' })[0] as HTMLElement);
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByRole('textbox'), 'Contract finished');
    await userEvent.click(within(dialog).getByRole('button', { name: 'End now' }));
    await waitFor(() => expect(screen.getAllByText('Ended').length).toBeGreaterThan(0));
  });

  it('adding needs a salon, an amount and a reason', async () => {
    open();
    await userEvent.click(await screen.findByRole('button', { name: 'Add a salon' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('Choose a salon')).toBeInTheDocument();
    expect(within(dialog).getByText('Enter an amount like 150.000')).toBeInTheDocument();
  });
});
