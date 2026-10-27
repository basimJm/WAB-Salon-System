import type { StorageProvider } from '../providers/storage/types';
import type { Logger } from '../utils/logger';
import { seedDev, summarizeDevSeed, type DevSeedReport } from './devSeed';
import { assertDemoAllowed, type DemoSeedConfig } from './runDemo';

/** What `SEED_DEMO_ON_START` did on this start. */
export type DemoOnStartOutcome = 'disabled' | 'refused' | 'seeded' | 'failed';

export interface DemoOnStartDeps {
  readonly config: DemoSeedConfig;
  readonly logger: Logger;
  /** Name of the database the server is connected to. */
  readonly databaseName: string;
  /** Real storage (S3 / MinIO) for the demo images; absent = images skipped with a warning. */
  readonly storage?: Pick<StorageProvider, 'read' | 'write'>;
  /** Where the optional `ADMIN_EMAIL` / `ADMIN_PASSWORD` come from. */
  readonly env?: Readonly<Record<string, string | undefined>>;
  /** The seed itself (tests pass a stand-in). */
  readonly seed?: (logger: Logger) => Promise<DevSeedReport>;
}

/**
 * Runs the full development seed after startup when `SEED_DEMO_ON_START=true` (SRV-160, SRV-173):
 * the same `seed:dev` run, images included when real storage is configured, so the hosted dev
 * database gets complete data without anyone sharing database credentials. Runs in the
 * background and never throws: a refusal or a failure is logged and the API keeps serving. The
 * seed is idempotent, so every restart only checks that the data is there.
 */
export const seedDemoOnStart = async (deps: DemoOnStartDeps): Promise<DemoOnStartOutcome> => {
  if (!deps.config.demoSeed.onStart) return 'disabled';
  try {
    assertDemoAllowed(deps.config, deps.databaseName);
  } catch (error) {
    deps.logger.error({ err: error }, 'demo seed on start refused');
    return 'refused';
  }
  const seed =
    deps.seed ??
    ((logger: Logger) =>
      seedDev({
        logger,
        env: deps.env ?? {},
        ...(deps.storage === undefined ? {} : { storage: deps.storage }),
      }));
  try {
    const report = await seed(deps.logger);
    deps.logger.info({ summary: summarizeDevSeed(report) }, 'demo seed on start finished');
    return 'seeded';
  } catch (error) {
    deps.logger.error({ err: error }, 'demo seed on start failed');
    return 'failed';
  }
};
