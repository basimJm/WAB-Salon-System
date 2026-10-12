import { describe, expect, it } from 'vitest';
import { ERROR_KINDS } from '@/constants/errors';
import { LANGUAGES } from '@/constants/i18n';
import { NAV_ITEMS } from '@/constants/nav';
import { createI18n, directionOf } from '@/infrastructure/i18n/i18n';
import ar from '@/locales/ar.json';
import en from '@/locales/en.json';
import { listFiles, read, SRC } from './helpers/files';

type Tree = { [key: string]: string | Tree };
const flatten = (tree: Tree, prefix = ''): Record<string, string> =>
  Object.entries(tree).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return typeof v === 'string' ? { ...acc, [key]: v } : { ...acc, ...flatten(v, key) };
  }, {});

const arFlat = flatten(ar);
const enFlat = flatten(en);
const placeholders = (s: string) => (s.match(/{{\s*\w+\s*}}/g) ?? []).sort().join();
const ARABIC = /[؀-ۿ]/;

describe('locale files', () => {
  it('have exactly the same keys', () => {
    expect(Object.keys(arFlat).sort()).toEqual(Object.keys(enFlat).sort());
  });

  it('have no empty values and the same placeholders', () => {
    for (const [key, value] of Object.entries(enFlat)) {
      expect(value.trim(), key).not.toBe('');
      expect(arFlat[key]?.trim(), key).not.toBe('');
      expect(placeholders(arFlat[key] ?? ''), key).toBe(placeholders(value));
    }
  });

  it('Arabic values are Arabic (except currency-free technical text)', () => {
    const missing = Object.entries(arFlat)
      .filter(([, v]) => !ARABIC.test(v))
      .map(([k]) => k);
    expect(missing).toEqual([]);
  });

  it('define every error kind, every nav label and every static t("…") key used in src', () => {
    const used = new Set<string>([
      ...ERROR_KINDS.map((k) => `errors.${k}`),
      ...NAV_ITEMS.map((n) => n.labelKey),
    ]);
    for (const file of listFiles(SRC, /\.(ts|tsx)$/)) {
      for (const m of read(file).matchAll(/\bt\(\s*'([\w.]+)'/g)) used.add(m[1] as string);
    }
    const missing = [...used].filter((k) => !(k in enFlat) || !(k in arFlat));
    expect(missing).toEqual([]);
  });
});

describe('i18n instance', () => {
  it('translates in both languages and interpolates', () => {
    expect(createI18n('en').t('table.range', { from: 1, to: 10, total: 42 })).toBe('1–10 of 42');
    expect(createI18n('ar').t('common.retry')).toBe(ar.common.retry);
  });

  it('Arabic is RTL and English LTR', () => {
    expect(LANGUAGES.map(directionOf)).toEqual(['rtl', 'ltr']);
  });
});
