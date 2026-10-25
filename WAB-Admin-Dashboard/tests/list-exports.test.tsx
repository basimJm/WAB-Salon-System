import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseListState } from '@/domain/shared/listState';
import CustomersPage from '@/presentation/customers/CustomersPage';
import { customerExportParams, customerQueryOf } from '@/presentation/customers/customerFilters';
import SalonsPage from '@/presentation/salons/SalonsPage';
import { salonExportParams, salonQueryOf } from '@/presentation/salons/salonFilters';
import { makeContainer, renderWithApp } from './helpers/render';

const CITY = '64c000000000000000000001';
const stateOf = (search: string, keys: readonly string[]) =>
  parseListState(new URLSearchParams(search), { filterKeys: [...keys] });

afterEach(() => vi.restoreAllMocks());

describe('list filters -> export params (SRV-126)', () => {
  it('customers: status, gender, city and search, no paging, unknown values dropped', () => {
    const q = customerQueryOf(
      stateOf(`page=2&status=BLOCKED&gender=FEMALE&city=${CITY}&q=dana`, [
        'status',
        'gender',
        'city',
      ]),
    );
    expect(q).toMatchObject({ page: 2, status: 'BLOCKED', gender: 'FEMALE', cityId: CITY });
    expect(customerExportParams(q)).toEqual({
      status: 'BLOCKED',
      gender: 'FEMALE',
      cityId: CITY,
      q: 'dana',
    });
    const odd = customerQueryOf(stateOf('status=NOPE&gender=X', ['status', 'gender']));
    expect(customerExportParams(odd)).toEqual({});
  });

  it('salons: state, gender, city, subscription and search; the switches without an export parameter are left out', () => {
    const q = salonQueryOf(
      stateOf(
        `state=LIVE&gender=MALE&city=${CITY}&subscription=TRIAL&recommended=true&deletion=true&q=royal`,
        ['state', 'gender', 'city', 'subscription', 'recommended', 'deletion'],
      ),
    );
    expect(salonExportParams(q)).toEqual({
      state: 'LIVE',
      gender: 'MALE',
      cityId: CITY,
      subscription: 'TRIAL',
      q: 'royal',
    });
  });

  it('a real city id reaches the server and a malformed one is refused before sending', async () => {
    const { repositories } = makeContainer();
    const job = await repositories.exports.request({
      kind: 'CUSTOMERS',
      format: 'XLSX',
      params: { cityId: CITY },
    });
    expect(job.kind).toBe('CUSTOMERS');
    await expect(
      repositories.exports.request({ kind: 'SALONS', format: 'CSV', params: { cityId: 'x' } }),
    ).rejects.toMatchObject({ kind: 'validation' });
  });
});

const exportFrom = async (page: ReactElement, url: string) => {
  const container = makeContainer();
  const request = vi.spyOn(container.repositories.exports, 'request');
  const opened = vi.spyOn(window, 'open').mockReturnValue(null);
  renderWithApp(<MemoryRouter initialEntries={[url]}>{page}</MemoryRouter>, container);
  await userEvent.click(await screen.findByRole('button', { name: /export/i }));
  await userEvent.click(await screen.findByRole('button', { name: /csv/i }));
  await waitFor(() =>
    expect(opened).toHaveBeenCalledWith(
      expect.stringContaining('https://'),
      '_blank',
      'noopener,noreferrer',
    ),
  );
  return request;
};

describe('export menus on the lists', () => {
  it('customers list exports CUSTOMERS with its filters', async () => {
    const request = await exportFrom(<CustomersPage />, '/customers?status=ACTIVE&gender=MALE');
    expect(request).toHaveBeenCalledWith({
      kind: 'CUSTOMERS',
      format: 'CSV',
      params: { status: 'ACTIVE', gender: 'MALE' },
    });
  });

  it('salons list exports SALONS with its filters', async () => {
    const request = await exportFrom(<SalonsPage />, '/salons?state=LIVE&subscription=ACTIVE');
    expect(request).toHaveBeenCalledWith({
      kind: 'SALONS',
      format: 'CSV',
      params: { state: 'LIVE', subscription: 'ACTIVE' },
    });
  });
});
