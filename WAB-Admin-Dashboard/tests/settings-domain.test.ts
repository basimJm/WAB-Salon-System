import { describe, expect, it } from 'vitest';
import { CORE_SETTINGS, settingId } from '@/domain/settings/registry';
import { parseSetting, sameSettingValue, settingToText } from '@/domain/settings/validate';
import { MOCK_SETTING_DEFAULTS } from '@/data/mock/settingsFixture';
import en from '@/locales/en';
import ar from '@/locales/ar';

const def = (key: string) => CORE_SETTINGS.find((d) => d.key === key)!;

describe('settings registry', () => {
  it('every default satisfies its own definition', () => {
    for (const d of CORE_SETTINGS) {
      const text = settingToText(MOCK_SETTING_DEFAULTS[d.key]);
      expect(parseSetting(text, d).ok, d.key).toBe(true);
    }
  });

  it('has a label in both languages for every key and group', () => {
    for (const d of CORE_SETTINGS) {
      expect(en.settings.key).toHaveProperty(settingId(d.key));
      expect(ar.settings.key).toHaveProperty(settingId(d.key));
      expect(en.settings.group).toHaveProperty(d.group);
    }
  });
});

describe('parseSetting', () => {
  it.each([
    ['', 'required'],
    ['abc', 'integer'],
    ['1.5', 'integer'],
    ['-3', 'integer'],
    ['0', 'min'],
    ['500', 'max'],
  ])('rejects "%s" as %s', (text, error) =>
    expect(parseSetting(text, def('discovery.nearbyRadiusKm'))).toEqual({ ok: false, error }),
  );

  it('accepts a whole number inside the bounds, trimmed', () => {
    expect(parseSetting(' 12 ', def('discovery.nearbyRadiusKm'))).toEqual({ ok: true, value: 12 });
  });

  it('lists: comma separated, sorted largest first, no repeats, each inside the bounds', () => {
    const d = def('booking.reminderMinutes');
    expect(parseSetting('15, 60', d)).toEqual({ ok: true, value: [60, 15] });
    expect(parseSetting('15,15', d)).toEqual({ ok: false, error: 'list' });
    expect(parseSetting(' , ', d)).toEqual({ ok: false, error: 'required' });
    expect(parseSetting('0,5', d)).toEqual({ ok: false, error: 'min' });
  });
});

describe('helpers', () => {
  it('compares values structurally and prints lists', () => {
    expect(sameSettingValue([60, 15], [60, 15])).toBe(true);
    expect(sameSettingValue(15, 16)).toBe(false);
    expect(settingToText([60, 15])).toBe('60, 15');
    expect(settingToText(undefined)).toBe('');
  });
});
