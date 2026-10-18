/** One platform setting as the server reports it: the effective value and the built-in default. */
export interface SettingEntry {
  readonly key: string;
  readonly value: unknown;
  readonly default: unknown;
  /** True while no admin override is stored (the effective value is the default). */
  readonly isDefault: boolean;
}

export interface SettingsRepository {
  list(): Promise<readonly SettingEntry[]>;
  /** Saves one setting; the server audits it with the reason. */
  update(key: string, value: unknown, reason: string): Promise<SettingEntry>;
}
