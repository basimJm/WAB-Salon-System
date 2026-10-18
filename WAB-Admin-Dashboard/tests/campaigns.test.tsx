import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import {
  audienceValid,
  parseIds,
  validateCampaign,
  type CampaignForm,
} from '@/domain/campaigns/campaigns';
import CampaignsPage from '@/presentation/campaigns/CampaignsPage';
import { makeContainer, renderWithApp } from './helpers/render';

const ID = '64a000000000000000000001';
const ok: CampaignForm = {
  titleAr: 'ع',
  titleEn: 'e',
  bodyAr: 'ع',
  bodyEn: 'e',
  link: '',
  audience: { kind: 'ALL' },
  day: '',
  time: '',
};
const open = () =>
  renderWithApp(
    <MemoryRouter>
      <CampaignsPage />
    </MemoryRouter>,
    makeContainer(),
  );
const bodyRows = () => screen.getAllByRole('row').length - 1;

describe('campaign rules', () => {
  it('validates texts, link, audience and schedule', () => {
    expect(validateCampaign(ok)).toEqual([]);
    expect(validateCampaign({ ...ok, titleAr: ' ', bodyEn: 'x'.repeat(1001) })).toEqual([
      'titleAr',
      'bodyEn',
    ]);
    expect(validateCampaign({ ...ok, link: '/offers' })).toEqual([]);
    expect(validateCampaign({ ...ok, link: 'http://a.test' })).toEqual(['link']);
    expect(validateCampaign({ ...ok, day: '2026-10-20', time: '' })).toEqual(['schedule']);
    expect(validateCampaign({ ...ok, day: '2026-10-20', time: '25:00' })).toEqual(['schedule']);
    expect(validateCampaign({ ...ok, day: '2026-10-20', time: '14:30' })).toEqual([]);
  });

  it('the audience carries what its kind needs', () => {
    expect(audienceValid({ kind: 'GUESTS' })).toBe(true);
    expect(audienceValid({ kind: 'GENDER' })).toBe(false);
    expect(audienceValid({ kind: 'GENDER', gender: 'MALE' })).toBe(true);
    expect(audienceValid({ kind: 'CITY', cityIds: [] })).toBe(false);
    expect(audienceValid({ kind: 'SALON_MEMBERS', salonId: 'x' })).toBe(false);
    expect(audienceValid({ kind: 'SALON_MEMBERS', salonId: ID })).toBe(true);
    expect(audienceValid({ kind: 'SPECIFIC_USERS', customerIds: [ID, 'bad'] })).toBe(false);
    expect(audienceValid({ kind: 'SPECIFIC_USERS', customerIds: [ID] })).toBe(true);
  });

  it('parseIds splits on commas, spaces and lines and removes repeats', () => {
    expect(parseIds('a, b\nc  a;d')).toEqual(['a', 'b', 'c', 'd']);
    expect(parseIds('')).toEqual([]);
  });
});

describe('CampaignsPage', () => {
  it('lists campaigns with their stats', async () => {
    open();
    await waitFor(() => expect(bodyRows()).toBe(2));
    expect(screen.getByText('100 / 90 / 40 / 2')).toBeInTheDocument();
  });

  it('cancels a scheduled campaign with a reason', async () => {
    open();
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel campaign' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByRole('textbox'), 'Wrong audience');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel campaign' }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Cancel campaign' })).toBeNull(),
    );
  });

  it('composes a campaign: shows the audience size, validates, then sends', async () => {
    open();
    await userEvent.click(await screen.findByRole('button', { name: 'New campaign' }));
    expect(await screen.findByText('About 1,200 people will receive it')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Send now' }));
    expect((await screen.findAllByText('Required, up to 200 characters')).length).toBe(2);
    await userEvent.type(screen.getByLabelText('Title (Arabic)'), 'عرض');
    await userEvent.type(screen.getByLabelText('Title (English)'), 'Offer');
    await userEvent.type(screen.getByLabelText('Message (Arabic)'), 'خصم');
    await userEvent.type(screen.getByLabelText('Message (English)'), 'Discount');
    await userEvent.type(screen.getByLabelText('Reason'), 'Autumn promotion');
    await userEvent.click(screen.getByRole('button', { name: 'Send now' }));
    await waitFor(() => expect(screen.getByText('Offer')).toBeInTheDocument());
  });
});
