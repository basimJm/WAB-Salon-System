import { useMemo, useState } from 'react';
import { CORE_SETTINGS, type SettingDefinition } from '@/domain/settings/registry';
import type { SettingEntry } from '@/domain/settings/settings';
import {
  parseSetting,
  sameSettingValue,
  settingToText,
  type SettingError,
} from '@/domain/settings/validate';

export interface SettingRow {
  def: SettingDefinition;
  entry: SettingEntry;
  text: string;
  error: SettingError | null;
  changed: boolean;
  /** The text differs from the built-in default, so "use default" does something. */
  canReset: boolean;
}

export interface SettingChange {
  key: string;
  value: unknown;
}

/** What the admin is editing: the typed text per key on top of the saved entries, with validation and the changed set. */
export function useSettingsDraft(entries: readonly SettingEntry[] | undefined) {
  const [typed, setTyped] = useState<Readonly<Record<string, string>>>({});
  const rows = useMemo<SettingRow[]>(() => {
    const byKey = new Map((entries ?? []).map((e) => [e.key, e]));
    return CORE_SETTINGS.flatMap((def) => {
      const entry = byKey.get(def.key);
      if (!entry) return [];
      const text = typed[def.key] ?? settingToText(entry.value);
      const parsed = parseSetting(text, def);
      return [
        {
          def,
          entry,
          text,
          error: parsed.ok ? null : parsed.error,
          changed: parsed.ok && !sameSettingValue(parsed.value, entry.value),
          canReset: !parsed.ok || !sameSettingValue(parsed.value, entry.default),
        },
      ];
    });
  }, [entries, typed]);

  const changes: SettingChange[] = rows.flatMap((r) => {
    const parsed = parseSetting(r.text, r.def);
    return r.changed && parsed.ok ? [{ key: r.def.key, value: parsed.value }] : [];
  });
  return {
    rows,
    changes,
    hasErrors: rows.some((r) => r.error !== null),
    dirty: changes.length > 0,
    setText: (key: string, text: string) => setTyped((t) => ({ ...t, [key]: text })),
    useDefault: (key: string) =>
      setTyped((t) => ({
        ...t,
        [key]: settingToText(entries?.find((e) => e.key === key)?.default),
      })),
    discard: () => setTyped({}),
  };
}
