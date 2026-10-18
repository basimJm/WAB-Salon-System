import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import {
  compareVersions,
  isStoreUrl,
  isVersion,
  validateVersionRow,
} from '@/domain/appconfig/versions';
import MaintenancePage from '@/presentation/appconfig/MaintenancePage';
import VersionsPage from '@/presentation/appconfig/VersionsPage';
import { makeContainer, renderWithApp } from './helpers/render';

const routed = (ui: ReactElement, container = makeContainer()) =>
  renderWithApp(<MemoryRouter>{ui}</MemoryRouter>, container);

describe('version rules', () => {
  it.each([
    ['1', true],
    ['1.4.0', true],
    ['1.2.3.4', true],
    ['1.2.3.4.5', false],
    ['v1', false],
    ['1..2', false],
    ['', false],
  ])('isVersion(%s) = %s', (v, ok) => expect(isVersion(v)).toBe(ok));

  it('compares numerically, not as text', () => {
    expect(compareVersions('1.10', '1.9')).toBe(1);
    expect(compareVersions('1.0', '1')).toBe(0);
    expect(compareVersions('2.0.1', '2.1')).toBe(-1);
  });

  it('accepts only https store links', () => {
    expect(isStoreUrl('https://play.example.test/x')).toBe(true);
    expect(isStoreUrl('http://play.example.test/x')).toBe(false);
    expect(isStoreUrl(`https://x.test/${'a'.repeat(500)}`)).toBe(false);
  });

  it('reports every problem of a row, and that the minimum may not exceed the latest', () => {
    const ok = { latest: '1.4', minSupported: '1.2', storeUrl: 'https://a.test' };
    expect(validateVersionRow(ok)).toEqual([]);
    expect(validateVersionRow({ ...ok, minSupported: '1.5' })).toEqual(['order']);
    expect(validateVersionRow({ latest: 'x', minSupported: 'y', storeUrl: 'ftp://a' })).toEqual([
      'latest',
      'minSupported',
      'storeUrl',
    ]);
  });
});

describe('VersionsPage', () => {
  it('lists versions and filters by platform', async () => {
    routed(<VersionsPage />);
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3));
    await userEvent.selectOptions(screen.getByLabelText('Platform'), 'IOS');
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(2));
  });

  it('validates, asks for a reason and saves an edit', async () => {
    routed(<VersionsPage />);
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3));
    await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0] as HTMLElement);
    const dialog = await screen.findByRole('dialog');
    const min = within(dialog).getByLabelText(/Minimum supported version/);
    await userEvent.clear(min);
    await userEvent.type(min, '9.0');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(
      await within(dialog).findByText('The minimum cannot be above the latest'),
    ).toBeInTheDocument();
    await userEvent.clear(min);
    await userEvent.type(min, '1.3.0');
    await userEvent.type(within(dialog).getByLabelText('Reason'), 'Raise the floor');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect((await screen.findAllByText('1.3.0')).length).toBeGreaterThan(0);
  });

  it('shows the error state when the server fails', async () => {
    const container = makeContainer();
    container.mock?.scenarios.set('serverError');
    routed(<VersionsPage />, container);
    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});

describe('MaintenancePage', () => {
  it('shows the status and message, and turns maintenance on with a reason', async () => {
    routed(<MaintenancePage />);
    expect(await screen.findByText('We are improving the app')).toBeInTheDocument();
    expect(screen.getByText('Off')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('switch', { name: 'Maintenance on' }));
    await userEvent.type(within(dialog).getByLabelText('Reason'), 'Database upgrade');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByText('Maintenance on')).toBeInTheDocument();
  });

  it('requires both messages and a reason', async () => {
    routed(<MaintenancePage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Add maintenance record' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findAllByText('Required, up to 500 characters')).toHaveLength(2);
    expect(
      within(dialog).getByText('Write the reason (at least 3 characters)'),
    ).toBeInTheDocument();
  });
});
