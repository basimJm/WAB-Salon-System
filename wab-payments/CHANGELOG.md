# Changelog

## 0.1.0

- First release: gateway-independent payments behind one `PaymentProvider` port.
- HyperPay (OPP / COPYandPAY) adapter: checkout, verify, full and partial refunds, AES-GCM notification decryption, result-code mapping.
- Idempotency (memory / Redis), session directory, typed errors, redacting logger, Phase 2 port fields.
- OPP-compatible mock gateway for localhost development (`@wab/payments/mock-gateway`).
