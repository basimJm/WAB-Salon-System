# Changelog

## 0.1.0

- First release: provider-independent push (FCM) and email (SMTP) delivery behind one `Notifier` port.
- Validation, idempotency (memory / Redis), retry with backoff, typed errors, ar/en email templates.
