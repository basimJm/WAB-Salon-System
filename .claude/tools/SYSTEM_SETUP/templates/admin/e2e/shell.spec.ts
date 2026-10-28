import { expect, test } from '@playwright/test';
import { noHorizontalScroll, signIn } from './helpers.ts';

test('shell (English): breadcrumbs on a sub-page, sub-menu on wide screens, admin menu', async ({
  page,
}) => {
  await signIn(page, '/finance/refunds');
  await page.getByRole('button', { name: /switch language|تبديل اللغة/i }).click();
  const crumbs = page.getByRole('navigation', { name: 'Breadcrumbs' });
  await expect(crumbs.getByRole('link', { name: 'Finance' })).toBeVisible();
  await expect(crumbs.locator('[aria-current="page"]')).toHaveText('Refunds');

  if ((page.viewportSize()?.width ?? 0) >= 1024) {
    await expect(page.getByRole('link', { name: 'Reconciliation' })).toBeVisible();
    await page.getByRole('button', { name: 'Collapse Finance' }).click();
    await expect(page.getByRole('link', { name: 'Reconciliation' })).toHaveCount(0);
  }
  await page.locator('.app-topbar').getByRole('button').filter({ hasText: /\S/ }).last().click();
  await expect(page.getByRole('menuitem', { name: 'Sign out' })).toBeVisible();
  await page.keyboard.press('Escape');
  expect(await noHorizontalScroll(page)).toBe(true);
});

test('shell (Arabic dark): the 403 page and the 500 page fit and read right-to-left', async ({
  page,
}) => {
  await signIn(page, '/forbidden');
  await page.getByRole('button', { name: /dark theme|الوضع الداكن/i }).click();
  await expect(page.getByText('403')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ليست لديك صلاحية' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  expect(await noHorizontalScroll(page)).toBe(true);
});
