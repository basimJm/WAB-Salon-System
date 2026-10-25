import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { alertListSchema, alertSchema } from '@/data/alerts/RemoteAlertsRepository';
import { getAlertsDataSchema } from '@/data/contract/generated/dto';
import { MOCK_ALERTS } from '@/data/mock/alertsRoutes';
import { alertTitle } from '@/domain/alerts/alerts';
import AlertsPage from '@/presentation/alerts/AlertsPage';
import { makeContainer, renderWithApp } from './helpers/render';

const TITLES = { ar: 'فشل استرداد', en: 'Refund failed' };

describe('alert titles in the panel language (SRV-150, contract 1.4.0)', () => {
  it('alertTitle picks titles[language] and falls back to title', () => {
    expect(alertTitle({ title: 'Refund failed', titles: TITLES }, 'ar')).toBe(TITLES.ar);
    expect(alertTitle({ title: 'x', titles: TITLES }, 'en')).toBe(TITLES.en);
    expect(alertTitle({ title: 'Refund failed' }, 'ar')).toBe('Refund failed');
    expect(alertTitle({ title: 'Refund failed', titles: { ar: '', en: 'E' } }, 'ar')).toBe(
      'Refund failed',
    );
  });

  it('the mock answers the generated 1.5.0 alert shape (titles + enum subject)', () => {
    expect(getAlertsDataSchema().safeParse(MOCK_ALERTS).success).toBe(true);
  });

  it('reads an alert from a server before 1.4.0 (no titles, lowercase subject, no data)', () => {
    const old: Record<string, unknown> = { ...MOCK_ALERTS[2]!, entityType: 'salon' };
    delete old['titles'];
    delete old['data'];
    const parsed = alertListSchema().parse([old]);
    expect(parsed[0]?.titles).toBeUndefined();
    expect(parsed[0]?.entityType).toBe('salon');
    expect(parsed[0]?.data).toEqual({});
    expect(alertSchema().safeParse({ ...MOCK_ALERTS[0], titles: TITLES }).success).toBe(true);
    expect(alertSchema().safeParse({ ...MOCK_ALERTS[0], titles: { ar: 'x' } }).success).toBe(false);
  });

  it('the Arabic list shows the Arabic titles, the English list the English ones', async () => {
    const page = (
      <MemoryRouter>
        <AlertsPage />
      </MemoryRouter>
    );
    const ar = renderWithApp(page, makeContainer(), 'ar');
    expect(await screen.findByText(MOCK_ALERTS[0]!.titles.ar)).toBeInTheDocument();
    expect(screen.queryByText(MOCK_ALERTS[0]!.titles.en)).toBeNull();
    ar.unmount();
    renderWithApp(page, makeContainer(), 'en');
    expect(await screen.findByText(MOCK_ALERTS[0]!.titles.en)).toBeInTheDocument();
  });
});
