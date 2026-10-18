# wab-notifications

Push (Firebase Cloud Messaging) and email (SMTP) behind one interface, for any Node.js project.

```ts
import { createNotifier, renderEmail } from 'wab-notifications';

const notifier = createNotifier({
  environment: 'dev',
  push: { provider: 'fake' },
  email: {
    provider: 'smtp',
    from: { name: 'WAB', address: 'no-reply@example.com' },
    smtp: { host: 'localhost', port: 1025 },
  },
});

await notifier.sendPush({
  target: { tokens: ['…'] },
  message: {
    app: 'CUSTOMER',
    kind: 'VISIBLE',
    title: 'Booking approved',
    body: 'See you at 4:30 PM',
  },
  idempotencyKey: 'booking:123:approved',
});
const mail = renderEmail({
  template: 'ADMIN_2FA',
  language: 'ar',
  params: { code: '123456', minutes: '5' },
});
await notifier.sendEmail({ to: ['admin@example.com'], ...mail, idempotencyKey: 'admin:2fa:456' });
await notifier.close();
```

Full technical documentation: [`.claude/Integration.md`](.claude/Integration.md). Rules for contributors: [`.claude/Rules.md`](.claude/Rules.md).

## Develop

```
npm ci
npm run verify      # typecheck, lint, format, tests (coverage gate), build, package smoke, loop test
```

Local email sink: `docker compose up -d mailpit` in `WAB-Server/` (SMTP `localhost:1025`, UI `localhost:8025`).

## Email deliverability (SPF / DKIM / DMARC)

Gmail SMTP sends as the Gmail account: keep `from.address` equal to the authenticated account (or a verified "send as" alias), otherwise Gmail rewrites it. When you move to a custom sending domain (SES, Brevo, Resend, Postmark, …):

1. **SPF:** add the provider's include to the domain's SPF TXT record (e.g. `v=spf1 include:<provider> ~all`); keep a single SPF record.
2. **DKIM:** publish the provider's DKIM CNAME/TXT records so messages are signed.
3. **DMARC:** start with `v=DMARC1; p=none; rua=mailto:<mailbox>` and tighten to `quarantine`/`reject` once reports are clean.
4. Every email carries a plain-text part next to the HTML (`renderEmail` returns both) and a single-line subject.
5. Digests: this package sends one email per call; batch frequent alerts into one digest in the caller (a scheduled job) to stay within Gmail's limits (500 messages per rolling 24 h, 100 recipients per message).
