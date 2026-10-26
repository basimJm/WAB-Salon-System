# WhatsApp OTP — owner setup guide (Meta WhatsApp Cloud API)

This guide sets up what `@wab/otp` (0.2.0+) needs to send phone OTP codes over WhatsApp: a Meta app with the WhatsApp product, a phone number, a permanent access token and an approved **authentication template** in Arabic and English. The server reads the values from environment variables (names in §7). Owner decision 2026-10-26: no SMS fallback; users without WhatsApp cannot receive a code.

**Status of each fact:** ✅ checked against Meta's developer docs on 2026-10-26 · ⚠️ from Meta's docs or UI as known before that date, **not re-checked** (Meta changes labels and limits often; follow the screen if it differs).

---

## 1. Meta developer account, business portfolio and app

1. Sign in at <https://developers.facebook.com> with the Facebook account that will own the setup and register as a developer (accept the terms, verify phone/email). ✅
2. **My Apps → Create app.** Choose the use case **"Connect with customers through WhatsApp"**. ✅ (Older flows asked for the app type **Business**; pick it if asked. ⚠️)
3. When asked for a **business portfolio** (Meta Business Account), select the WAB portfolio or create one (business name, your name, business email). ✅ The portfolio owns the WhatsApp Business Account (WABA), the phone numbers and the system users.
4. After creation you land on the WhatsApp **Quickstart**; click **"Start using the API"** to open **WhatsApp → API Setup**. ✅

## 2. Test phone number and test recipients (development)

1. On **API Setup**, Meta gives a free **test phone number** in the **From** dropdown. ✅ (⚠️ It can only message recipients you add in the next step.)
2. In **To**, add each tester's WhatsApp number (up to **5** recipients ⚠️). Meta sends a confirmation code to that WhatsApp number; enter it to verify the recipient. ⚠️
3. A number not in this list fails with Meta error **131030** ("recipient not in allowed list"); the SDK reports it as `OTP_DELIVERY_FAILED`.
4. Click **Send message** once to check the setup (Meta's `hello_world` template). ✅

## 3. IDs you need

On **WhatsApp → API Setup**: ⚠️ (labels as known; Meta's current page calls the WABA the "Messaging account ID" ✅)
- **Phone number ID** — under the From number. This is **not** the phone number; it is a numeric id → `WHATSAPP_PHONE_NUMBER_ID`.
- **WhatsApp Business Account ID** (WABA ID / "Messaging account ID") — needed for template management and support tickets; the server does not send it today → keep it in the owner's notes (`WHATSAPP_WABA_ID` is reserved, optional).

## 4. Access token: temporary vs permanent

- **Temporary token** (API Setup → "Generate access token"): expires quickly (⚠️ about 24 h) — only for a first manual test. ✅ Meta says it is not suitable for real development.
- **Permanent System User token** (use this on Render dev and prod): ✅
  1. <https://business.facebook.com> → **Business Settings** (Settings) → **Users → System users → Add**. Name it e.g. `wab-server`, role **Admin** (⚠️ role choice).
  2. **Assign assets**: the **app** with **Full control** ("Manage app"), and the **WhatsApp account** (WABA) with **Full control** ("Manage WhatsApp Business accounts").
  3. **Generate token** → choose the app → permissions **`whatsapp_business_messaging`** and **`whatsapp_business_management`** (Meta's guide also lists **`business_management`**). Choose **Never** expire if offered ⚠️.
  4. Copy the token once and store it only in the secret store (§7). Never paste it into git, chat, tickets or logs.
- A revoked/expired token gives Meta error **190** → `OTP_AUTH_FAILED`.

## 5. Authentication template (copy-code button)

Create **one template name** with **two languages** (`ar` and `en_US`): ✅ (template rules) / ⚠️ (UI path)
1. **WhatsApp Manager** (business.facebook.com → WhatsApp accounts → your WABA → **Message templates**) → **Create template**.
2. Category **Authentication**; type **One-time passcode**; delivery **Copy code** button.
3. Name: lowercase letters, digits and `_` only (the SDK enforces this), e.g. `wab_otp` → `WHATSAPP_TEMPLATE_NAME`.
4. Options: ✅ **Add security recommendation** ("For your security, do not share this code.") and **code expiration** = **5 minutes** (allowed 1–90; matches `otp.codeTtlSec` = 300). Button text optional (max 25 characters; default is localized).
5. Add language **Arabic (`ar`)** and **English (US) (`en_US`)** to the same name. Authentication templates have fixed Meta text; you cannot add URLs, media or emojis. ✅
6. Submit and wait for **Approved** (usually minutes, can take longer ⚠️). Sending an unapproved or missing language fails with **132001** → `OTP_CONFIG_INVALID`.

What the server sends (handled by the SDK; for troubleshooting): ✅
`POST https://graph.facebook.com/v26.0/{PHONE_NUMBER_ID}/messages` with `Authorization: Bearer {token}`, a `template` message whose code appears in the **body** parameter and in the **button** (`sub_type: "url"`, `index: "0"`) parameter. Meta turns the copy-code (OTP) button into a URL button at creation, which is why the send uses `url`. Code max 15 characters (WAB uses 6 digits).

## 6. Language mapping

The app sends `Accept-Language: ar|en`; the server passes it as `language`; the SDK maps it with `languageCodes`, e.g. `{ "ar": "ar", "en": "en_US" }`, falling back to `fallbackLanguage` (e.g. `ar`, the platform default) when the language is unknown.

## 7. Environment variables (server; names only — values never in git)

| Variable | What | Example shape |
|---|---|---|
| `OTP_CHANNEL` | `whatsapp` (or `fake` in local dev only) | `whatsapp` |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone number ID (§3) | digits |
| `WHATSAPP_ACCESS_TOKEN` | System user token (§4) — **secret** | `EAA…` |
| `WHATSAPP_TEMPLATE_NAME` | Approved template name (§5) | `wab_otp` |
| `WHATSAPP_API_VERSION` | Graph API version (optional; SDK default `v26.0`) | `v26.0` |
| `WHATSAPP_WABA_ID` | Optional, for template management / support | digits |
| `OTP_CODE_SECRET` | HMAC secret for codes at rest, ≥ 32 random chars — **secret** | `openssl rand -base64 48` |
| `OTP_PROOF_SECRET` | HMAC secret of `otpToken`, ≥ 32 chars, **different** from the code secret — **secret** | `openssl rand -base64 48` |

Final names are fixed by SRV-153 (server adoption); keep this table in sync with `WAB-Server/.env.example`.
Where: **Render → service → Environment** for dev and prod (separate values per environment; dev and prod should use different secrets and ideally different Meta apps/numbers). Locally: `WAB-Server/.env` (git-ignored). Never commit `.env*` except `.env.example` with names only.

Rotating `OTP_PROOF_SECRET` invalidates all outstanding `otpToken`s (≤ 10 min); rotating `OTP_CODE_SECRET` invalidates codes already sent (≤ 5 min).

## 8. Going to production ⚠️ (not re-checked on 2026-10-26)

1. **Add a real business phone number** (WhatsApp Manager → Phone numbers → Add): a number not registered on any WhatsApp app (or delete that account first), able to receive the SMS/voice verification code.
2. **Display name** approval: the name shown to users must match the business (e.g. "WAB"); Meta reviews it (error **131037** while missing).
3. **Business verification** of the portfolio (legal name, address, documents) — needed to lift the initial messaging limits and for a verified business profile.
4. **Payment method** on the WABA (WhatsApp Manager → Payment settings); missing/failed billing gives **131042** → `OTP_PROVIDER_UNAVAILABLE` (not retried).
5. **Pricing:** authentication messages are charged per delivered template message (per-message pricing since 2025-07-01 ⚠️), rate by the recipient's country (Jordan rate in Meta's rate card). Budget ≈ requests × rate.
6. **Messaging limits:** new numbers start at a limited number of unique recipients per 24 h (tiers grow with quality and volume, e.g. 250 → 1K → 10K → 100K → unlimited ⚠️). Throughput errors **130429** / pair limit **131056** are retried; **131048** (spam rate limit) is not.
7. Point prod `WHATSAPP_PHONE_NUMBER_ID` at the real number; keep the test number for dev.

## 9. Troubleshooting by Meta error code (SDK mapping)

Source: Meta Cloud API error-codes page, read 2026-10-26. ✅

| Meta code | Meaning | SDK `code` | Retried |
|---|---|---|---|
| 131026 | Message undeliverable (not on WhatsApp, old app, terms not accepted) | `OTP_DELIVERY_FAILED` | no |
| 131021 | Sender and recipient are the same number | `OTP_DELIVERY_FAILED` | no |
| 131030 | Recipient not in the test number's allowed list | `OTP_DELIVERY_FAILED` | no |
| 0, 3, 10, 190, 200–299, 131005 | Token expired/invalid, missing permission | `OTP_AUTH_FAILED` | no |
| 100, 131008, 131009, 132000, 132001, 132005, 132007, 132012, 132015, 132016, 135000 | Bad parameter, template missing/not approved/paused/disabled | `OTP_CONFIG_INVALID` | no |
| 368, 130497, 131031, 131037, 131042, 131045, 133010 | Account restricted, country blocked, display name, billing, number not registered | `OTP_PROVIDER_UNAVAILABLE` | no |
| 4, 80007, 130429, 131056 | Rate limits | `OTP_RATE_LIMITED` | yes (backoff) |
| 131048 | Spam rate limit on the number | `OTP_RATE_LIMITED` | no |
| 1, 2, 131000, 131016, 131057, 133004 | Temporary / maintenance | `OTP_PROVIDER_UNAVAILABLE` | yes |
| HTTP 5xx, 429, timeout, network | — | `OTP_PROVIDER_UNAVAILABLE` / `OTP_RATE_LIMITED` / `OTP_TIMEOUT` / `OTP_NETWORK_ERROR` | yes |
| any other | — | `OTP_UNKNOWN` (logged with status, Meta code, `fbtrace_id`) | no |

**Important limitation** ⚠️ (Meta behaviour as known, not re-checked): Meta usually accepts the request (HTTP 200 + `wamid`) and reports **131026** later through the **webhook** message status (`failed`). The SDK only sees synchronous errors. Until a webhook is added (open question in `.claude/Integration.md`), a user who is not on WhatsApp gets "code sent" and simply never receives it.

Logs: the SDK never logs the token or the code and masks phone numbers; quote `fbtrace_id` to Meta support.
