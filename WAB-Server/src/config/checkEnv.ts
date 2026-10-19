import { parseEnv } from 'node:util';
import { ConfigError, loadConfig } from './index';

/** Outcome of validating an env file against the server's own schema; never carries values. */
export interface EnvCheckResult {
  readonly ok: boolean;
  readonly invalidKeys: readonly string[];
}

/**
 * Validates the text of an env file exactly as the server would at startup (same schema, same
 * production rules), so a deployment is checked before it boots. Reports key names only.
 */
export const checkEnvText = (text: string): EnvCheckResult => {
  try {
    loadConfig(parseEnv(text));
    return { ok: true, invalidKeys: [] };
  } catch (error) {
    if (error instanceof ConfigError) return { ok: false, invalidKeys: error.invalidKeys };
    throw error;
  }
};
