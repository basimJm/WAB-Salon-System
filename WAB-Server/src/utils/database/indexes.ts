import type { Logger } from '../logger';

/** The part of a Mongoose model that index creation needs. */
export interface IndexedModel {
  readonly modelName: string;
  createIndexes(): Promise<unknown>;
}

/**
 * Creates the indexes the schemas declare. Production runs with `autoIndex: false`, so without
 * this the unique keys would not exist. It only creates what is missing: `createIndexes` never
 * drops or changes an index, so running it on every start and from several instances at once is
 * safe. A failure names the model and stops start-up, because a missing unique index is a
 * correctness problem.
 */
export const ensureIndexes = async (
  models: readonly IndexedModel[],
  logger: Logger,
): Promise<void> => {
  for (const model of models) {
    try {
      await model.createIndexes();
    } catch (error) {
      logger.error({ err: error, model: model.modelName }, 'creating indexes failed');
      throw error;
    }
    logger.info({ model: model.modelName }, 'indexes ready');
  }
};
