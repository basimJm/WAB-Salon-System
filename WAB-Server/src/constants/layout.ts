/** Source folders every later task builds into (WAB-Server/CLAUDE.md §4). */
export const SOURCE_LAYOUT = [
  'routes',
  'config',
  'constants',
  'locales',
  'middlewares',
  'models',
  'repositories',
  'domain',
  'modules/customer',
  'modules/merchant',
  'modules/admin',
  'jobs',
  'sockets',
  'utils',
] as const;

export type SourceFolder = (typeof SOURCE_LAYOUT)[number];
