import { expect, test } from '@playwright/test';
import { DESIGN_SYSTEM_PATH } from '../src/constants/routes.ts';
import { noHorizontalScroll, signIn } from './helpers.ts';

test('charts (English): all six types render inside their box, View data shows the table, CSV downloads', async ({
  page,
}) => {
  await signIn(page, DESIGN_SYSTEM_PATH);
  await page.getByRole('button', { name: /switch language|تبديل اللغة/i }).click();
  const card = page.locator('.wab-card[aria-label="Charts kit"]');
  await card.scrollIntoViewIfNeeded();

  await expect(card.locator('figure.wab-chart')).toHaveCount(6);
  for (const svg of await card.locator('svg.wab-chart__svg').all()) {
    const box = await svg.boundingBox();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(50);
  }
  await expect(card.getByRole('img', { name: 'Bookings, last 7 days' })).toBeVisible();

  const line = card.locator('figure.wab-chart').first();
  await line.getByRole('button', { name: 'View data' }).click();
  await expect(line.getByRole('table')).toBeVisible();
  await expect(line.getByRole('columnheader')).toHaveText(['Day', 'Created', 'Cancelled']);

  const download = page.waitForEvent('download');
  await line.getByRole('button', { name: 'Export CSV' }).click();
  expect((await download).suggestedFilename()).toBe('bookings-line.csv');

  const heat = card.locator('table.wab-heatmap');
  await expect(heat.locator('td.wab-heat--4').first()).toBeVisible();
  expect(await noHorizontalScroll(page)).toBe(true);
});

test('charts (Arabic dark): Arabic digits and labels, charts stay inside the page width', async ({
  page,
}) => {
  await signIn(page, DESIGN_SYSTEM_PATH);
  await page.getByRole('button', { name: /dark theme|الوضع الداكن/i }).click();
  const card = page.locator('.wab-card[aria-label="عناصر المخططات"]');
  await card.scrollIntoViewIfNeeded();
  await expect(card.getByText('٦٤٠', { exact: false }).first()).toBeAttached();
  const donut = card.locator('figure.wab-chart').nth(3);
  await expect(donut.locator('svg text').first()).toHaveText('٨٨٥');
  const page_ = page.viewportSize()!.width;
  for (const fig of await card.locator('figure.wab-chart').all()) {
    const box = await fig.boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(page_ + 1);
    expect(box!.x).toBeGreaterThanOrEqual(-1);
  }
  expect(await noHorizontalScroll(page)).toBe(true);
});
