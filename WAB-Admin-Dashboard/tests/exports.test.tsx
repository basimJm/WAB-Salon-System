import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ExportTimeoutError, waitForExport, type ExportJob } from '@/domain/exports/exports';
import ExportsPage from '@/presentation/exports/ExportsPage';
import TransactionsPage from '@/presentation/transactions/TransactionsPage';
import { makeContainer, renderWithApp } from './helpers/render';

const job = (status: ExportJob['status']): ExportJob => ({
  id: '1',
  kind: 'TRANSACTIONS',
  format: 'CSV',
  params: {},
  status,
  rowCount: null,
  failure: null,
  createdAt: '',
  finishedAt: null,
  downloadUrl: null,
});

describe('waitForExport', () => {
  it('returns as soon as the job is finished', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce(job('QUEUED'))
      .mockResolvedValueOnce(job('RUNNING'))
      .mockResolvedValueOnce(job('DONE'));
    const sleep = vi.fn(() => Promise.resolve());
    expect((await waitForExport(get, { intervalMs: 10, timeoutMs: 100, sleep })).status).toBe(
      'DONE',
    );
    expect(get).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('a failed job is a finished job', async () => {
    expect(
      (await waitForExport(() => Promise.resolve(job('FAILED')), { intervalMs: 1, timeoutMs: 5 }))
        .status,
    ).toBe('FAILED');
  });

  it('gives up after the timeout', async () => {
    await expect(
      waitForExport(() => Promise.resolve(job('RUNNING')), {
        intervalMs: 10,
        timeoutMs: 30,
        sleep: () => Promise.resolve(),
      }),
    ).rejects.toBeInstanceOf(ExportTimeoutError);
  });
});

describe('ExportsPage', () => {
  it('lists exports with the download link for the finished one and the reason for the failed one', async () => {
    renderWithApp(
      <MemoryRouter>
        <ExportsPage />
      </MemoryRouter>,
      makeContainer(),
    );
    expect(await screen.findByRole('link', { name: 'Download' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
    expect(screen.getByText('Too many rows: narrow the filters')).toBeInTheDocument();
  });
});

describe('export button', () => {
  it('asks for the file, waits for it and opens the download link', async () => {
    const opened = vi.spyOn(window, 'open').mockReturnValue(null);
    renderWithApp(
      <MemoryRouter>
        <TransactionsPage />
      </MemoryRouter>,
      makeContainer(),
    );
    await userEvent.click(await screen.findByRole('button', { name: /export/i }));
    await userEvent.click(await screen.findByRole('button', { name: /csv/i }));
    await waitFor(() =>
      expect(opened).toHaveBeenCalledWith(
        expect.stringContaining('https://'),
        '_blank',
        'noopener,noreferrer',
      ),
    );
    opened.mockRestore();
  });
});
