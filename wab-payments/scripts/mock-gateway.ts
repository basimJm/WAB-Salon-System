/* Starts the local mock HyperPay gateway for development: `npm run mock-gateway`.
 * Configuration comes from the environment (see src/constants/mock.ts); nothing real is contacted. */
import { MOCK_ENV_KEYS, MOCK_GATEWAY_DEFAULTS } from '../src/constants/mock';
import { startMockGateway } from '../src/mock-gateway';

const env = (key: string): string | undefined => process.env[key];
const required = (key: string): string => {
  const value = env(key);
  if (value === undefined || value === '') throw new Error(`${key} is required`);
  return value;
};

const webhookUrl = env(MOCK_ENV_KEYS.webhookUrl);
const webhookKey = env(MOCK_ENV_KEYS.webhookKey);

startMockGateway({
  port: Number(env(MOCK_ENV_KEYS.port) ?? MOCK_GATEWAY_DEFAULTS.cliPort),
  entityId: required(MOCK_ENV_KEYS.entityId),
  accessToken: required(MOCK_ENV_KEYS.access),
  ...(webhookUrl !== undefined && webhookKey !== undefined
    ? { webhook: { url: webhookUrl, keyHex: webhookKey } }
    : {}),
})
  .then((gateway) => {
    process.stdout.write(`mock gateway listening on ${gateway.url}\n`);
    const stop = (): void => {
      void gateway.close().then(() => process.exit(0));
    };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
  })
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'mock gateway failed'}\n`);
    process.exit(1);
  });
