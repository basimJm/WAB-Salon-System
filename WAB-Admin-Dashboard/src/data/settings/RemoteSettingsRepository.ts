import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import {
  getSettingsDataSchema,
  putSettingsByKeyBodySchema,
  putSettingsByKeyDataSchema,
} from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { SettingEntry, SettingsRepository } from '@/domain/settings/settings';

const listEndpoint = defineEndpoint(OPERATIONS.getSettings, { data: getSettingsDataSchema });
const updateEndpoint = defineEndpoint(OPERATIONS.putSettingsByKey, {
  data: putSettingsByKeyDataSchema,
  body: putSettingsByKeyBodySchema,
});

const toEntry = (e: {
  key: string;
  value?: unknown;
  default?: unknown;
  isDefault: boolean;
}): SettingEntry => ({
  key: e.key,
  value: e.value,
  default: e.default,
  isDefault: e.isDefault,
});

export class RemoteSettingsRepository implements SettingsRepository {
  constructor(private readonly api: ApiClient) {}

  async list(): Promise<readonly SettingEntry[]> {
    const { data } = await this.api.execute(listEndpoint);
    return data.map(toEntry);
  }

  async update(key: string, value: unknown, reason: string): Promise<SettingEntry> {
    const { data } = await this.api.execute(updateEndpoint, {
      params: { key },
      body: { value, reason },
    });
    return toEntry(data);
  }
}
