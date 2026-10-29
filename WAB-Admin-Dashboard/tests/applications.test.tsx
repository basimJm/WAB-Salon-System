import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { documentKind } from '@/domain/applications/applications';
import ApplicationReviewPage from '@/presentation/applications/ApplicationReviewPage';
import ApplicationsPage from '@/presentation/applications/ApplicationsPage';
import { makeContainer, renderWithApp } from './helpers/render';

const app = () =>
  renderWithApp(
    <MemoryRouter initialEntries={['/salons/applications']}>
      <Routes>
        <Route path="/salons/applications" element={<ApplicationsPage />} />
        <Route path="/salons/applications/:id" element={<ApplicationReviewPage />} />
      </Routes>
    </MemoryRouter>,
    makeContainer(),
  );

describe('documentKind', () => {
  it('reads the kind from the extension before the signature', () => {
    expect(documentKind('https://f.test/a.pdf?sig=1')).toBe('pdf');
    expect(documentKind('https://f.test/a.PDF')).toBe('pdf');
    expect(documentKind('https://f.test/a.jpg?x=.pdf')).toBe('image');
  });
});

describe('applications', () => {
  it('lists pending applications with resubmission counts', async () => {
    app();
    expect(await screen.findByText('Glow Studio')).toBeInTheDocument();
    expect(screen.getByText('Rose Beauty')).toBeInTheDocument();
    expect(screen.getByText('Skin Care Clinic')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(4);
  });

  it('filters the queue by business type on the server (§5.19)', async () => {
    app();
    await screen.findByText('Glow Studio');
    await userEvent.click(screen.getByRole('radio', { name: 'Clinics' }));
    await waitFor(() => expect(screen.queryByText('Glow Studio')).toBeNull());
    expect(screen.getByText('Skin Care Clinic')).toBeInTheDocument();
  });

  it('a clinic application shows the medical license besides the trade license', async () => {
    app();
    await userEvent.click(await screen.findByText('Skin Care Clinic'));
    expect(await screen.findByText('Medical license')).toBeInTheDocument();
    expect(screen.getByText('License documents')).toBeInTheDocument();
    expect(screen.getAllByText('Clinic').length).toBeGreaterThan(0);
  });

  it('opens a review with the documents, and approving needs a reason and empties the queue entry', async () => {
    app();
    await userEvent.click(await screen.findByText('Glow Studio'));
    expect(await screen.findByRole('heading', { name: 'Glow Studio' })).toBeInTheDocument();
    expect(await screen.findByText('License documents')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByRole('textbox'), 'Documents are valid');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Glow Studio' })).toBeNull());
    await waitFor(() => expect(screen.queryByText('Glow Studio')).toBeNull());
    expect(screen.getByText('Rose Beauty')).toBeInTheDocument();
  });

  it('rejecting shows the rejected queue entry with its reason', async () => {
    app();
    await userEvent.click(await screen.findByText('Rose Beauty'));
    await userEvent.click(await screen.findByRole('button', { name: 'Reject' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByRole('textbox'), 'License unreadable');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(screen.queryByText('Rose Beauty')).toBeNull());
  });
});
