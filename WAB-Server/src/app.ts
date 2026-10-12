import express, { type Express, type Router } from 'express';
import { JSON_BODY_LIMIT } from './constants/server';
import { errorHandler } from './middlewares/errorHandler';
import { language } from './middlewares/language';
import { notFound } from './middlewares/notFound';
import { requestId } from './middlewares/requestId';
import { createRootRouter } from './routes';
import type { Logger } from './utils/logger';

export interface AppDependencies {
  readonly logger: Logger;
  /** Defaults to the real namespace routers; tests inject their own. */
  readonly router?: Router;
}

/** Builds the Express app. Order matters: ids and language first, errors last. */
export const createApp = ({ logger, router }: AppDependencies): Express => {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestId(logger));
  app.use(language);
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(router ?? createRootRouter());
  app.use(notFound);
  app.use(errorHandler(logger));
  return app;
};
