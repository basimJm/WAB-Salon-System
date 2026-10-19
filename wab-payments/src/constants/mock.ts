/** Defaults of the local mock gateway (development only). */
export const MOCK_GATEWAY_DEFAULTS = {
  host: '127.0.0.1',
  /** Port used by `npm run mock-gateway` when `MOCK_GATEWAY_PORT` is unset. */
  cliPort: 4010,
} as const;
export const MOCK_ENV_KEYS = {
  port: 'MOCK_GATEWAY_PORT',
  entityId: 'MOCK_GATEWAY_ENTITY_ID',
  access: 'MOCK_GATEWAY_ACCESS_TOKEN',
  webhookUrl: 'MOCK_GATEWAY_WEBHOOK_URL',
  webhookKey: 'MOCK_GATEWAY_WEBHOOK_KEY',
} as const;
