import { expect, test, type Page } from '@playwright/test';
import { MIN_PASSWORD_LENGTH, MOCK_OTP_CODE } from '../src/constants/auth.ts';
import { DESIGN_SYSTEM_PATH } from '../src/app/routes.tsx';
import { ROUTES } from '../src/constants/routes.ts';

const EMAIL = 'admin@example.com';
const PASSWORD = 'x'.repeat(MIN_PASSWORD_LENGTH);

/** Visits `target` signed out, so the guard sends us to login and back (the session is in memory only). */
async function signIn(page: Page, target: string = ROUTES.root): Promise<void> {
  await page.goto(target);
  await expect(page).toHaveURL(new RegExp(ROUTES.login));
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.locator('input[autocomplete="one-time-code"]').fill(MOCK_OTP_CODE);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(new RegExp(target === ROUTES.root ? ROUTES.liveOverview : target));
}

const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test('login screen fits the viewport and is RTL Arabic by default', async ({ page }) => {
  await page.goto(ROUTES.login);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  expect(await noHorizontalScroll(page)).toBe(true);
});

test('sign in with the mock source, shell adapts, no horizontal scroll', async ({ page }) => {
  await signIn(page);
  await expect(page.locator('main')).toBeVisible();
  expect(await noHorizontalScroll(page)).toBe(true);
  const bp = await page.locator('html').getAttribute('data-bp');
  const sidebar = page.locator('aside');
  if (bp === 'expanded') await expect(sidebar).toBeInViewport();
  else {
    await expect(sidebar).not.toBeInViewport();
    await page.getByRole('button', { name: /menu|القائمة/i }).click();
    await expect(sidebar).toBeInViewport();
  }
});

test('design-system gallery renders in both languages and themes without overflow', async ({
  page,
}) => {
  await signIn(page, DESIGN_SYSTEM_PATH);
  await expect(page.locator('h1')).toBeVisible();
  expect(await noHorizontalScroll(page)).toBe(true);
  await page.getByRole('button', { name: /switch language|تبديل اللغة/i }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await page.getByRole('button', { name: /dark theme|الوضع الداكن/i }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await noHorizontalScroll(page)).toBe(true);
});

test('login page: switch language and theme at every size, brand panel only on wide screens', async ({
  page,
}) => {
  await page.goto(ROUTES.login);
  await expect(page.locator('html')).toHaveAttribute('data-bp', /.+/);
  const bp = await page.locator('html').getAttribute('data-bp');
  const brandStory = page.locator('.wab-brand__headline');
  if (bp === 'expanded') await expect(brandStory).toBeVisible();
  else await expect(brandStory).toBeHidden();

  await page.getByRole('radio', { name: 'English' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('h1')).toHaveText('Sign in');
  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await noHorizontalScroll(page)).toBe(true);

  // Choices survive a reload (persisted).
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.getByRole('radio', { name: 'العربية' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('h1')).toHaveText('تسجيل الدخول');
  expect(await noHorizontalScroll(page)).toBe(true);
});
