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
  return (
    <output>{`${c.alerts}|${c.sidebar['applications'] ?? 0}|${c.sidebar['reviews'] ?? 0}`}</output>
  );
}

describe('alertLink', () => {
  it('maps known subjects to their page and ignores unknown ones', () => {
    expect(alertLink({ entityType: 'salon', entityId: 's1' })).toBe('/salons/s1');
    expect(alertLink({ entityType: 'booking', entityId: 'b1' })).toBe('/bookings/b1');
    expect(alertLink({ entityType: 'refund', entityId: 'r1' })).toBe('/finance/refunds');
    expect(alertLink({ entityType: 'weird', entityId: 'x' })).toBeNull();
    expect(alertLink({ entityType: null, entityId: null })).toBeNull();
  });

  it('reads the real server spellings (UPPER_SNAKE and camelCase) and routes by kind', () => {
    expect(alertLink({ entityType: 'SALON', entityId: 's1' })).toBe('/salons/s1');
    expect(alertLink({ entityType: 'REFUND', entityId: 'r1' })).toBe('/finance/refunds');
    expect(alertLink({ entityType: 'REVIEW', entityId: 'v1' })).toBe('/reviews');
    expect(alertLink({ entityType: 'CATALOG_REQUEST', entityId: 'c1' })).toBe('/catalog/requests');
    expect(alertLink({ entityType: 'catalogRequest', entityId: 'c1' })).toBe('/catalog/requests');
    expect(alertLink({ kind: 'SALON_DELETION_REQUEST', entityType: 'salon', entityId: 's1' })).toBe(
      '/salons/s1',
    );
    expect(alertLink({ kind: 'SALON_APPLICATION', entityType: 'SALON', entityId: 's2' })).toBe(
      '/salons/applications/s2',
    );
    expect(alertLink({ kind: 'SALON_APPLICATION', entityType: null, entityId: null })).toBeNull();
  });

  it('normalizes entity types to UPPER_SNAKE', () => {
    expect(normalizeEntityType('catalogRequest')).toBe('CATALOG_REQUEST');
    expect(normalizeEntityType('salon')).toBe('SALON');
    expect(normalizeEntityType('REFUND')).toBe('REFUND');
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
      '/salons/applications/64f000000000000000000001',
    );
    expect(screen.getByRole('link', { name: 'Alert 2' })).toHaveAttribute(
      'href',
      '/finance/refunds',
    );
    expect(screen.queryByRole('link', { name: 'Alert 1' })).toBeNull();
  });

  it('acknowledging removes the action; filtering by status works', async () => {
    open();
    await waitFor(() => expect(bodyRows()).toBe(3));
    await userEvent.click(screen.getAllByRole('button', { name: 'Acknowledge' })[0] as HTMLElement);
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Acknowledge' })).toHaveLength(2),
    );
    await userEvent.selectOptions(screen.getByLabelText('State'), 'NEW');
    await waitFor(() => expect(bodyRows()).toBe(2));
  });
});

describe('useShellCounters', () => {
  it('reads the bell count and the pending queues from the API', async () => {
    renderWithApp(<Counters />, makeContainer());
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('3|3|3'));
  });
});
