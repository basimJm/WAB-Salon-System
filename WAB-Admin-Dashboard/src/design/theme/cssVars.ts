import type { Direction } from '@/constants/i18n';
import { BRAND, PALETTES, TONES, type ThemeName } from '../tokens/colors';
import {
  FONT_FAMILIES,
  FONT_SIZES,
  FONT_WEIGHTS,
  LINE_HEIGHT,
  MOTION,
  OPACITY,
  RADIUS,
  ROOT_FONT_SIZE,
  SHADOWS,
  SIZES,
  SPACING,
  Z_INDEX,
} from '../tokens/layout';

export type CssVars = Record<string, string>;

const kebab = (key: string): string => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const prefixed = (prefix: string, source: Readonly<Record<string, string>>): CssVars =>
  Object.fromEntries(Object.entries(source).map(([k, v]) => [`--${prefix}-${kebab(k)}`, v]));

/** Every token the stylesheets use, as CSS custom properties. The single bridge from TS tokens to CSS. */
export function buildCssVars(theme: ThemeName, direction: Direction): CssVars {
  const tones: CssVars = {};
  for (const [name, [fg, bg]] of Object.entries(TONES[theme])) {
    tones[`--tone-${name}-fg`] = fg;
    tones[`--tone-${name}-bg`] = bg;
  }
  return {
    '--root-font-size': ROOT_FONT_SIZE,
    ...prefixed('c', PALETTES[theme]),
    '--c-primary': BRAND.primary,
    '--c-primary-end': BRAND.primaryEnd,
    '--c-on-primary': BRAND.onPrimary,
    ...tones,
    ...prefixed('space', SPACING),
    ...prefixed('radius', RADIUS),
    ...prefixed('size', SIZES),
    ...prefixed('fs', FONT_SIZES),
    ...prefixed('fw', FONT_WEIGHTS),
    ...prefixed('motion', MOTION),
    ...prefixed('opacity', OPACITY),
    ...prefixed('z', Z_INDEX),
    ...prefixed('shadow', SHADOWS[theme]),
    '--lh': LINE_HEIGHT,
    '--font-family': direction === 'rtl' ? FONT_FAMILIES.arabic : FONT_FAMILIES.latin,
    '--flip': direction === 'rtl' ? '-1' : '1',
  };
}
