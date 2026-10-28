import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { alertLink, normalizeEntityType } from '@/domain/alerts/alerts';
import AlertsPage from '@/presentation/alerts/AlertsPage';
import { useShellCounters } from '@/presentation/hooks/useShellCounters';
import { makeContainer, renderWithApp } from './helpers/render';

const bodyRows = () => screen.getAllByRole('row').length - 1;

function Counters() {
  const c = useShellCounters(true);
  return <output>{`${c.alerts}|${c.sidebar['alerts'] ?? 0}`}</output>;
}

describe('alertLink', () => {
  it('maps known subjects to their page and ignores unknown ones', () => {
    expect(alertLink({ entityType: 'ITEM', entityId: 'i1' })).toBe('/items/i1');
    expect(alertLink({ entityType: 'weird', entityId: 'x' })).toBeNull();
    expect(alertLink({ entityType: null, entityId: null })).toBeNull();
    expect(alertLink({ entityType: 'ITEM', entityId: null })).toBeNull();
  });

  it('reads the spellings a server may send (UPPER_SNAKE and camelCase)', () => {
    expect(alertLink({ entityType: 'item', entityId: 'i1' })).toBe('/items/i1');
    expect(normalizeEntityType('catalogRequest')).toBe('CATALOG_REQUEST');
    expect(normalizeEntityType('item')).toBe('ITEM');
    expect(normalizeEntityType('ITEM')).toBe('ITEM');
  });
});

describe('AlertsPage', () => {
  const open = () =>
    renderWithApp(
      <MemoryRouter>
        <AlertsPage />
      </MemoryRouter>,
      makeContainer(),
    );

  it('lists alerts with severity and links the ones with a subject', async () => {
    open();
    await waitFor(() => expect(bodyRows()).toBe(3));
    expect(screen.getByRole('link', { name: 'Alert 3' })).toHaveAttribute(
      'href',
      '/items/64d100000000000000000001',
    );
    expect(screen.queryByRole('link', { name: 'Alert 2' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Alert 1' })).toBeNull();
  });

  it('acknowledging removes the action; filtering by status works', async () => {
    open();
    await waitFor(() => expect(bodyRows()).toBe(3));
    await userEvent.click(screen.getAllByRole('button', { name: 'Acknowledge' })[0] as HTMLElement);
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Acknowledge' })).toHaveLength(2),
    );
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'NEW');
    await waitFor(() => expect(bodyRows()).toBe(2));
  });
});

describe('useShellCounters', () => {
  it('reads the bell count from the API and mirrors it on the alerts nav entry', async () => {
    renderWithApp(<Counters />, makeContainer());
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('3|3'));
  });
});
