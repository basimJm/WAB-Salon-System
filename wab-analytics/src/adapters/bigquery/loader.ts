import { AnalyticsError, configError, notConfiguredError } from '../../errors';
import { ERROR_CODES } from '../../constants/codes';
import type { BigQueryLike } from './runner';

export interface ClientSettings {
  readonly projectId: string;
  readonly location: string | undefined;
  readonly credentials: string | object | undefined;
}

type BigQueryConstructor = new (options: Record<string, unknown>) => BigQueryLike;
type Importer = () => Promise<{ BigQuery?: BigQueryConstructor }>;

/** Service-account JSON arrives as text or as an object; invalid JSON never echoes its content. */
export const parseCredentials = (credentials: string | object | undefined): object | undefined => {
  if (credentials === undefined || typeof credentials === 'object') return credentials;
  try {
    const parsed: unknown = JSON.parse(credentials);
    if (typeof parsed === 'object' && parsed !== null) return parsed;
  } catch {
    // fall through to the typed error below
  }
  throw configError('bigquery credentials are not valid JSON', {
    paths: ['warehouse.bigquery.credentials'],
  });
};

/**
 * Loads `@google-cloud/bigquery` on first use (it is an optional peer dependency) and builds the
 * client. `importer` is replaced in tests.
 */
export const loadBigQuery = async (
  settings: ClientSettings,
  importer: Importer = () => import('@google-cloud/bigquery'),
): Promise<BigQueryLike> => {
  const credentials = parseCredentials(settings.credentials);
  let module: Awaited<ReturnType<Importer>>;
  try {
    module = await importer();
  } catch (error) {
    throw notConfiguredError('install @google-cloud/bigquery to use the bigquery warehouse', {
      cause: error,
    });
  }
  if (module.BigQuery === undefined) {
    throw new AnalyticsError(ERROR_CODES.MALFORMED_RESPONSE, 'bigquery module has no client class');
  }
  return new module.BigQuery({
    projectId: settings.projectId,
    ...(settings.location === undefined ? {} : { location: settings.location }),
    ...(credentials === undefined ? {} : { credentials }),
  });
};
