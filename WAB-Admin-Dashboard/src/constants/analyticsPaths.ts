/**
 * Nav paths of the app-usage analytics boards (A02-A06), all served by one lazy page module; the module path
 * itself opens traffic. Kept apart from `analytics.ts` so the route table (entry bundle) stays small.
 */
export const APP_USAGE_BOARDS = {
  '/analytics': 'traffic',
  '/analytics/traffic': 'traffic',
  '/analytics/screens': 'screens',
  '/analytics/funnels': 'funnels',
  '/analytics/search': 'search',
  '/analytics/retention': 'retention',
} as const;
export const APP_USAGE_PATHS = Object.keys(APP_USAGE_BOARDS);
