/**
 * Real-vendor smoke test (never part of CI). Reads credentials from the environment only:
 *   FIREBASE_CREDENTIALS_FILE  path to a service-account JSON (kept outside the repo)
 *   FIREBASE_PROJECT_ID        expected project id (guards against a dev/prod key mix-up)
 *   SMTP_HOST / SMTP_PORT      optional: a local sink such as Mailpit (localhost:1025) or smtp.gmail.com:587
 *   SMTP_USER / SMTP_PASS      optional: SMTP login (Gmail: the account + an App Password)
 *   EMAIL_FROM_ADDRESS         sender address (must equal SMTP_USER on Gmail)
 *   EMAIL_TO                   optional: where the smoke email goes (default: the sender)
 * FCM is called with `dryRun`: Google validates the message and the credentials, nothing is delivered.
 */
/* eslint-disable no-console */
import { readFileSync } from 'node:fs';
import { createNotifier, isNotificationError, parseServiceAccount, renderEmail } from '../src';

const required = (name: string): string => {
  const value = process.env[name];
  if (value === undefined || value === '') throw new Error(`missing environment variable ${name}`);
  return value;
};

const main = async (): Promise<void> => {
  const proxy = process.env.HTTPS_PROXY;
  const httpAgent =
    proxy === undefined
      ? undefined
      : new (await import('https-proxy-agent')).HttpsProxyAgent(proxy);
  const credentials = parseServiceAccount(
    readFileSync(required('FIREBASE_CREDENTIALS_FILE'), 'utf8'),
  );
  const smtpHost = process.env.SMTP_HOST;
  const notifier = createNotifier({
    environment: 'dev',
    push: {
      provider: 'fcm',
      credentials,
      projectId: required('FIREBASE_PROJECT_ID'),
      dryRun: true,
      ...(httpAgent === undefined ? {} : { httpAgent, legacyHttpTransport: true }),
    },
    email:
      smtpHost === undefined
        ? { provider: 'fake' }
        : {
            provider: 'smtp',
            from: { name: 'WAB', address: required('EMAIL_FROM_ADDRESS') },
            smtp: {
              host: smtpHost,
              port: Number(process.env.SMTP_PORT ?? '1025'),
              ...(process.env.SMTP_USER === undefined ? {} : { user: process.env.SMTP_USER }),
              ...(process.env.SMTP_PASS === undefined ? {} : { pass: process.env.SMTP_PASS }),
            },
          },
  });

  try {
    const result = await notifier.sendPush({
      target: { tokens: ['smoke-test-token-that-does-not-exist'] },
      message: { app: 'CUSTOMER', kind: 'VISIBLE', title: 'Smoke', body: 'dry run' },
      idempotencyKey: `smoke:push:${String(Date.now())}`,
    });
    console.log(
      'push result (a rejected fake token proves auth + reachability):',
      JSON.stringify(result),
    );
  } catch (error) {
    if (isNotificationError(error)) {
      console.log(
        `push failed: ${error.code} retryable=${String(error.retryable)} details=${JSON.stringify(error.details)}`,
      );
    } else {
      console.log('push failed:', String(error));
    }
  }

  const mail = renderEmail({
    template: 'ADMIN_2FA',
    language: 'ar',
    params: { code: '123456', minutes: '5' },
  });
  const sent = await notifier.sendEmail({
    to: [process.env.EMAIL_TO ?? process.env.EMAIL_FROM_ADDRESS ?? 'admin@example.com'],
    ...mail,
    idempotencyKey: `smoke:mail:${String(Date.now())}`,
  });
  console.log('email result:', JSON.stringify(sent));
  await notifier.close();
};

main().catch((error: unknown) => {
  console.error(String(error));
  process.exitCode = 1;
});
