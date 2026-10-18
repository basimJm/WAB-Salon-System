import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import {
  dateToInstant,
  endDateToInstant,
  instantToDate,
  instantToEndDate,
  validateBannerForm,
  type BannerFormValues,
} from '@/domain/banners/banners';
import BannersPage from '@/presentation/banners/BannersPage';
import { renderWithApp } from './helpers/render';

const ok: BannerFormValues = {
  keyAr: 'a',
  keyEn: 'b',
  action: 'NONE',
  actionValue: '',
  startDate: '',
  endDate: '',
  order: '0',
};

describe('banner rules', () => {
  it('accepts a minimal banner and reports each problem', () => {
    expect(validateBannerForm(ok)).toEqual([]);
    expect(validateBannerForm({ ...ok, keyAr: '', keyEn: '' })).toEqual(['imageAr', 'imageEn']);
    expect(validateBannerForm({ ...ok, startDate: '2026-10-10', endDate: '2026-10-10' })).toEqual([
      'schedule',
    ]);
    expect(validateBannerForm({ ...ok, startDate: '2026-02-30' })).toEqual(['schedule']);
    expect(validateBannerForm({ ...ok, order: '-1' })).toEqual(['order']);
  });

  it('the action value must fit the action', () => {
    expect(
      validateBannerForm({ ...ok, action: 'SALON', actionValue: '64a000000000000000000001' }),
    ).toEqual([]);
    expect(validateBannerForm({ ...ok, action: 'SALON', actionValue: 'nope' })).toEqual([
      'actionValue',
    ]);
    expect(
      validateBannerForm({ ...ok, action: 'EXTERNAL_URL', actionValue: 'https://a.test/x' }),
    ).toEqual([]);
    expect(
      validateBannerForm({ ...ok, action: 'EXTERNAL_URL', actionValue: 'http://a.test' }),
    ).toEqual(['actionValue']);
  });

  it('days map to Amman day boundaries and back; the end day is included', () => {
    expect(dateToInstant('2026-10-10')).toBe('2026-10-09T21:00:00.000Z');
    expect(endDateToInstant('2026-10-10')).toBe('2026-10-10T21:00:00.000Z');
    expect(instantToDate('2026-10-09T21:00:00.000Z')).toBe('2026-10-10');
    expect(instantToEndDate('2026-10-10T21:00:00.000Z')).toBe('2026-10-10');
    expect(dateToInstant('')).toBeNull();
    expect(instantToDate(null)).toBe('');
  });
});

describe('BannersPage', () => {
  const open = () =>
    renderWithApp(
      <MemoryRouter>
        <BannersPage />
      </MemoryRouter>,
    );

  it('lists banners with their schedule', async () => {
    open();
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(2));
    expect(screen.getByText('banners/summer-en.webp')).toBeInTheDocument();
    expect(screen.getByText('2026-06-02 → 2026-09-01')).toBeInTheDocument();
  });

  it('creates a banner: uploads both images, then asks for a reason', async () => {
    open();
    await userEvent.click(await screen.findByRole('button', { name: 'Add a banner' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Upload the Arabic image')).toBeInTheDocument();
    const files = document.querySelectorAll<HTMLInputElement>('input[type=file]');
    const png = (name: string) => new File([new Uint8Array(10)], name, { type: 'image/png' });
    await userEvent.upload(files[0] as HTMLInputElement, png('ar.png'));
    await userEvent.upload(files[1] as HTMLInputElement, png('en.png'));
    await waitFor(() =>
      expect(document.querySelectorAll('img.wab-banner-preview')).toHaveLength(2),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Write the reason (at least 3 characters)')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Reason'), 'Summer campaign');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3));
  });
});
