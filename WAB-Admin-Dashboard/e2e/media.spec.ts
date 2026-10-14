import { expect, test } from '@playwright/test';
import { DESIGN_SYSTEM_PATH } from '../src/constants/routes.ts';
import { noHorizontalScroll, signIn } from './helpers.ts';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

test('media kit (English): upload with progress, bad type rejected, failed upload retried, viewer zoom', async ({
  page,
}) => {
  await signIn(page, DESIGN_SYSTEM_PATH);
  await page.getByRole('button', { name: /switch language|تبديل اللغة/i }).click();
  const card = page.locator('.wab-card[aria-label="Media kit"]');
  await card.scrollIntoViewIfNeeded();
  const english = card.getByLabel('Banner image · English', { exact: true });

  await english.setInputFiles({
    name: 'doc.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('hello'),
  });
  await expect(card.getByRole('alert').first()).toContainText('not allowed');

  await english.setInputFiles({ name: 'fail.png', mimeType: 'image/png', buffer: PNG });
  await expect(card.getByRole('alert').first()).toContainText('failed', { timeout: 5000 });
  await expect(card.getByRole('button', { name: 'Retry upload' })).toBeVisible();

  await english.setInputFiles({ name: 'banner.png', mimeType: 'image/png', buffer: PNG });
  await expect(card.getByRole('img', { name: 'English phone preview' })).toBeVisible({
    timeout: 5000,
  });
  await expect(card.getByRole('button', { name: 'Replace' })).toBeVisible();

  const zoom = card.locator('.wab-docviewer__zoom');
  await expect(zoom).toHaveText('100%');
  await card.getByRole('button', { name: 'Zoom in' }).click();
  await expect(zoom).toHaveText('125%');
  expect(await noHorizontalScroll(page)).toBe(true);
});

test('media kit (Arabic dark): phone previews keep their own direction and fit the page', async ({
  page,
}) => {
  await signIn(page, DESIGN_SYSTEM_PATH);
  await page.getByRole('button', { name: /dark theme|الوضع الداكن/i }).click();
  const card = page.locator('.wab-card[aria-label="عناصر الوسائط"]');
  await card.scrollIntoViewIfNeeded();
  const en = card.getByRole('group', { name: 'معاينة الهاتف بالإنجليزية' });
  const ar = card.getByRole('group', { name: 'معاينة الهاتف بالعربية' });
  await expect(en.locator('.wab-phone__screen')).toHaveAttribute('dir', 'ltr');
  await expect(ar.locator('.wab-phone__screen')).toHaveAttribute('dir', 'rtl');
  const width = page.viewportSize()!.width;
  for (const phone of [en, ar]) {
    const box = await phone.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(-1);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
  }
  expect(await noHorizontalScroll(page)).toBe(true);
});
