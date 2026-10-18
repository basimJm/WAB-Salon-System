import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { expect, test, type Page } from '@playwright/test';
import { DESIGN_SYSTEM_PATH } from '../src/constants/routes.ts';
import { signIn } from './helpers.ts';

const require = createRequire(import.meta.url);
const SHOTS = 'reports/gallery';
const LANG_BUTTON = /switch language|تبديل اللغة/i;
const THEME_BUTTON = /dark theme|الوضع الداكن|light theme|الوضع الفاتح/i;

interface AxeViolation {
  id: string;
  impact: string | null;
  nodes: { target: unknown[] }[];
}

async function violationsOf(page: Page): Promise<string[]> {
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const found = await page.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: { run: (c: Document) => Promise<{ violations: AxeViolation[] }> };
      }
    ).axe;
    return (await axe.run(document)).violations;
  });
  return found
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(' ')}`));
}

const COMBOS = [
  { lang: 'ar', theme: 'light' },
  { lang: 'ar', theme: 'dark' },
  { lang: 'en', theme: 'light' },
  { lang: 'en', theme: 'dark' },
] as const;

for (const { lang, theme } of COMBOS) {
  test(`gallery ${lang}/${theme}: no serious or critical accessibility violations (with real colour contrast) and a screenshot per section`, async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== 'desktop',
      'one viewport is enough for the visual and contrast pass',
    );
    await signIn(page, DESIGN_SYSTEM_PATH);
    if (lang === 'en') await page.getByRole('button', { name: LANG_BUTTON }).click();
    if (theme === 'dark') await page.getByRole('button', { name: THEME_BUTTON }).first().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

    const cards = page.locator('.wab-card[aria-label]');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(12);
    mkdirSync(`${SHOTS}/${lang}-${theme}`, { recursive: true });
    for (let i = 0; i < count; i += 1) {
      await cards
        .nth(i)
        .screenshot({ path: `${SHOTS}/${lang}-${theme}/${String(i + 1).padStart(2, '0')}.png` });
    }
    expect(await violationsOf(page)).toEqual([]);
  });
}
