import type { Logger } from '../utils/logger';
import { assertDemoAllowed, seedDemo, type DemoSeedConfig } from './runDemo';

/** What `SEED_DEMO_ON_START` did on this start. */
export type DemoOnStartOutcome = 'disabled' | 'refused' | 'seeded' | 'failed';

export interface DemoOnStartDeps {
  readonly config: DemoSeedConfig;
  readonly logger: Logger;
  /** Name of the database the server is connected to. */
  readonly databaseName: string;
  /** The seed itself (tests pass a stand-in). */
  readonly seed?: (logger: Logger) => Promise<unknown>;
}

/**
 * Loads the demo data after startup when `SEED_DEMO_ON_START=true` (SRV-160), so the hosted dev
 * database gets it without anyone sharing database credentials. Runs in the background and never
 * throws: a refusal or a failure is logged and the API keeps serving. The seed is idempotent, so
 * every restart only checks that the data is there.
 */
export const seedDemoOnStart = async (deps: DemoOnStartDeps): Promise<DemoOnStartOutcome> => {
  if (!deps.config.demoSeed.onStart) return 'disabled';
  try {
    assertDemoAllowed(deps.config, deps.databaseName);
  } catch (error) {
    deps.logger.error({ err: error }, 'demo seed on start refused');
    return 'refused';
  }
  try {
    const report = await (deps.seed ?? seedDemo)(deps.logger);
    deps.logger.info({ report }, 'demo seed on start finished');
    return 'seeded';
  } catch (error) {
    deps.logger.error({ err: error }, 'demo seed on start failed');
    return 'failed';
  }
};
