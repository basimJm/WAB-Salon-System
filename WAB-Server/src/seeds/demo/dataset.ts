import { DEMO_SEED_LABEL } from '../../constants/demoSeed';
import { buildBookings } from './bookings';
import { buildCustomers } from './customers';
import { buildPayouts } from './payouts';
import { buildPlatform } from './platform';
import { createDemoRandom } from './random';
import { buildSalons } from './salons';
import { emptyDataset, type DemoContext, type DemoDataset } from './types';

/**
 * The whole demo data set, built in memory from the context only (no database access): the same
 * context always gives the same rows and ids, so a second run inserts nothing new.
 */
export const buildDemoDataset = (ctx: DemoContext): DemoDataset => {
  const random = createDemoRandom(DEMO_SEED_LABEL);
  const data = emptyDataset();
  const salons = buildSalons(ctx, random, data);
  const customers = buildCustomers(ctx, random, data, salons);
  buildBookings(ctx, random, data, salons, customers);
  buildPayouts(ctx, data);
  buildPlatform(ctx, data);
  return data;
};
