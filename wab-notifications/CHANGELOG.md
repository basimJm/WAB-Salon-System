# Changelog

## 0.2.0

- Brevo transactional email over HTTPS (`email.provider: 'brevo'`) behind the same `EmailChannel`, for hosts that block SMTP ports. Every HTTP status mapped to a typed error; 429, 5xx, network failures and timeouts are retried. Prod requires an https base URL.

## 0.1.0

- First release: provider-independent push (FCM) and email (SMTP) delivery behind one `Notifier` port.
- Validation, idempotency (memory / Redis), retry with backoff, typed errors, ar/en email templates.
