/* istanbul ignore file -- thin glue over the real vendor SDKs; exercised by `npm run smoke`. */
import nodemailer from 'nodemailer';
import type { Agent } from 'node:http';
import type { App } from 'firebase-admin/app';
import { DEFAULT_SMTP, DEFAULT_TIMEOUTS } from '../constants/defaults';
import type { ServiceAccount } from '../config/serviceAccount';
import type { MessagingLike } from './push/fcm';
import type { TransportLike } from './email/smtp';

let appSequence = 0;

/** firebase-admin is loaded lazily so projects that only send email never pay for it. */
export const createFirebaseMessaging = (
  credentials: ServiceAccount,
  transport: { httpAgent?: Agent | undefined; legacyHttpTransport?: boolean | undefined } = {},
): { messaging: () => Promise<MessagingLike>; close: () => Promise<void> } => {
  let app: App | undefined;
  let messaging: Promise<MessagingLike> | undefined;
  return {
    messaging: () => {
      messaging ??= (async (): Promise<MessagingLike> => {
        const { initializeApp, cert } = await import('firebase-admin/app');
        const { getMessaging } = await import('firebase-admin/messaging');
        appSequence += 1;
        const created = initializeApp(
          {
            credential: cert(credentials as never),
            projectId: credentials.project_id,
            ...(transport.httpAgent === undefined ? {} : { httpAgent: transport.httpAgent }),
          },
          `wab-notifications-${String(appSequence)}`,
        );
        app = created;
        const instance = getMessaging(created);
        // The default HTTP/2 transport cannot go through an HTTP proxy; the legacy one honours httpAgent.
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- needed behind HTTP proxies
        if (transport.legacyHttpTransport === true) instance.enableLegacyHttpTransport();
        return instance;
      })();
      return messaging;
    },
    close: async () => {
      if (app !== undefined) {
        const { deleteApp } = await import('firebase-admin/app');
        await deleteApp(app);
      }
      app = undefined;
      messaging = undefined;
    },
  };
};

export const createSmtpTransport = (
  smtp: {
    host: string;
    port?: number | undefined;
    secure?: boolean | undefined;
    user?: string | undefined;
    pass?: string | undefined;
    timeoutMs?: number | undefined;
  },
  requireTls: boolean,
): TransportLike => {
  const port = smtp.port ?? DEFAULT_SMTP.port;
  const timeout = smtp.timeoutMs ?? DEFAULT_TIMEOUTS.smtpMs;
  return nodemailer.createTransport({
    host: smtp.host,
    port,
    secure: smtp.secure ?? port === DEFAULT_SMTP.secureOnPort,
    requireTLS: requireTls,
    pool: true,
    connectionTimeout: timeout,
    greetingTimeout: timeout,
    socketTimeout: timeout,
    ...(smtp.user !== undefined && smtp.pass !== undefined
      ? { auth: { user: smtp.user, pass: smtp.pass } }
      : {}),
  }) as unknown as TransportLike;
};
