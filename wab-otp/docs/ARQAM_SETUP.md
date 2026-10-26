# ARQAM OTP — owner setup guide (WhatsApp codes for the WAB apps)

This guide sets up what the WAB server needs to send phone sign-in codes over WhatsApp through **ARQAM OTP** (<https://otp.arqam.tech>). You do not need to write code. At the end you will have put a few values into Render and checked them with one command.

**How it works (owner decisions 2026-10-26):** our server makes the 6-digit code itself, keeps only a fingerprint of it, and asks ARQAM to deliver it. ARQAM sends it on WhatsApp from its approved sender number with an "authentication" message template: the Arabic template when the app is in Arabic, the English one when the app is in English. Our server checks the code the user types; ARQAM's own "verify" feature is not used. The old direct Meta WhatsApp setup is no longer needed.

**How to read the marks:** ✅ = written in ARQAM's API documentation (read 2026-10-26). ⚠️ = a guess about the dashboard (button names, menu places). If the screen looks different, follow the screen, or ask ARQAM support.

---

## 1. Sign in and create a project

1. Open <https://otp.arqam.tech> and sign in (or create an account). ⚠️
2. Create a **project** for WAB, for example "WAB". ✅ (API keys belong to a project.) ⚠️ the menu may be called "Projects" or "Applications".
3. Make sure the project and your account are **active**. If they are not, ARQAM answers `SENDER_NOT_AVAILABLE` and no code is sent. ✅

## 2. The WhatsApp sender (the number that sends the codes)

1. Open **Sender IDs** (or "Senders") in the project. ⚠️
2. Check which WhatsApp sender the project will use. Two possibilities:
   - ARQAM's own approved sender number: nothing more to do here. ⚠️ ask ARQAM support whether this is available for your account.
   - **Your own WhatsApp number** as the sender: add it there and wait until ARQAM shows it as **approved**. ⚠️
3. **Do you need to delete WhatsApp from your personal phone?** Not because of our server. Whether ARQAM needs your number to be free of the WhatsApp app depends on how ARQAM registers senders. ⚠️ **Ask ARQAM support before you delete anything.** If ARQAM's own sender is used, your personal WhatsApp stays as it is.
4. If the project ends up with **several** approved senders, ARQAM may answer `SENDER_REQUIRED`. ✅ Then copy the sender id you want (⚠️ shown on the Sender IDs page) and put it in `ARQAM_SENDER_ID` (step 7).

## 3. Authentication templates (Arabic and English)

1. Open **Templates** (⚠️ may be "WhatsApp templates" or "Authentication templates").
2. You need **two** approved OTP (authentication) templates: one **Arabic**, one **English**. ✅ (ARQAM accepts `otp`, `reset_password` or a WhatsApp template name.)
3. If you cannot create them yourself, ask ARQAM support for an Arabic and an English OTP template for your project. ⚠️
4. Write down the **exact template names**, letter for letter, for example `wab_otp_ar` and `wab_otp_en`. A wrong name makes ARQAM answer `UNKNOWN_AUTH_TEMPLATE` (nothing is sent and nothing is charged). ✅
5. Our code is always **6 digits** (ARQAM accepts 4 to 6). ✅ Do not change "OTP length" in the WAB admin settings to more than 6.

## 4. API keys: one TEST key for dev, one LIVE key for production

1. Open **API Keys** in the project. ✅ (keys are per project)
2. Create a **TEST** key for the hosted dev server. ✅ With a TEST key **every code goes to the key's own test phone**, whatever number is typed in the app. ✅ ⚠️ Set that test phone to your own WhatsApp number when you create the key (the dashboard decides where).
3. Create a **LIVE** key for production. ✅ A LIVE key sends to any number and **costs credits**. ✅
4. Copy each key once and keep it safe. Never send it in chat or email, never put it in git. If a key leaks, revoke it in the dashboard and make a new one (a revoked key gives `UNAUTHORIZED`). ✅

## 5. Credits / balance

1. Open **Balance** or **Billing** (⚠️) and add credits for the LIVE key. Every sent code has a cost (the API example shows `cost: 25`). ✅
2. With no credits ARQAM answers `INSUFFICIENT_CREDITS` and the app shows "service unavailable". ✅
3. ARQAM refunds a message that WhatsApp refused (`PROVIDER_ERROR`). ✅

## 6. IP rate limiting (yes or no?)

1. Look in the project settings for **IP rate limiting** (⚠️ place and name). ✅ (the API takes `ipAddress` only when this is on)
2. **On** → set `ARQAM_SEND_IP=true` in Render (step 7): our server then sends the phone user's IP address with every code.
3. **Off** (or you are not sure) → leave `ARQAM_SEND_IP` unset. If ARQAM later answers `INVALID_REQUEST` or `RATE_LIMIT_IP`, check this setting first.

## 7. Put the values into Render

Render → your service → **Environment** → add or edit these variables, then **Save** (Render restarts the service). Do this on the **dev** service with the TEST key, and on the **prod** service with the LIVE key.

| Variable | Dev service (`wab-server-dev`) | Prod service |
|---|---|---|
| `OTP_PROVIDER` | `arqam` | `arqam` |
| `ARQAM_API_KEY` | the **TEST** key | the **LIVE** key |
| `ARQAM_TEMPLATE_AR` | Arabic template name | Arabic template name |
| `ARQAM_TEMPLATE_EN` | English template name | English template name |
| `ARQAM_SENDER_ID` | only if ARQAM answered `SENDER_REQUIRED` | same |
| `ARQAM_SEND_IP` | `true` only if IP rate limiting is on | same |
| `ARQAM_BASE_URL` | leave unset | leave unset |
| `OTP_CODE_SECRET` | keep the existing value (or `openssl rand -base64 48`) | its own value |
| `OTP_PROOF_SECRET` | keep the existing value (a different one) | its own value |
| `OTP_FIXED_CODE` | must not exist (the hosted services run with production rules) | must not exist |

Remove the old Meta variables if they are still there: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_TEMPLATE_NAME`, `WHATSAPP_API_VERSION`. The server now refuses `OTP_PROVIDER=whatsapp` (and `real`) at startup with a message saying to use `arqam`.

## 8. Check the setup with one command

Render → the service → **Shell** (⚠️ Render's console tab), then run:

```
npm run otp:arqam-check
```

It prints the account **mode** (`TEST` on dev, `LIVE` on prod), the **balance** and the two template names. It never prints the key. To send one real test code:

```
npm run otp:arqam-check -- --send +9627XXXXXXXX --lang ar
npm run otp:arqam-check -- --send +9627XXXXXXXX --lang en
```

The message should arrive on WhatsApp (with the TEST key: on the key's test phone). The command shows the test code it sent so you can compare; that code cannot be used to sign in.

If the Render shell has no `npm`, run `node dist/providers/otp/arqamCheckCli.js` (same options) instead.

The server also writes the account mode in its log once at startup ("arqam otp account"). Because both Render services run with `NODE_ENV=production`, a **TEST** key is logged as a warning ("arqam otp uses a TEST key with NODE_ENV=production"). That is expected on the **dev** service; on the **prod** service fix it at once, because every user's code would go to the test phone.

## 9. Test in the apps

1. **Dev** (TEST key): open the customer or merchant dev app, type any Jordanian number, request the code. The code arrives on the **TEST key's phone**. Type it in the app: you are signed in as the number you typed.
2. **Prod** (LIVE key): sign in with your own number. The code arrives on your WhatsApp from the sender number.
3. A number that has no WhatsApp: the app shows "We could not send the code on WhatsApp…". That is expected.

## 10. Troubleshooting (by ARQAM `errorCode`)

The server log shows the code after `arqamError` (never the key or the full phone number). `npm run otp:arqam-check` shows it too.

| `errorCode` | What it means ✅ | What the app user sees | What to do |
|---|---|---|---|
| `INVALID_PHONE` | ARQAM refused the phone number | "could not send the code on WhatsApp" (422) | The user checks the number |
| `PROVIDER_ERROR` | WhatsApp refused the message (refunded) | "could not send the code on WhatsApp" (422) | Usually the number has no WhatsApp; if it happens for everyone, contact ARQAM |
| `UNAUTHORIZED` | Key missing, wrong or revoked | "service unavailable" (503) | Copy the key again into `ARQAM_API_KEY` |
| `UNKNOWN_AUTH_TEMPLATE` | Template name not found (nothing sent or charged) | "service unavailable" | Fix `ARQAM_TEMPLATE_AR` / `ARQAM_TEMPLATE_EN` (exact names) |
| `SENDER_REQUIRED` | Several approved senders; choose one | "service unavailable" | Set `ARQAM_SENDER_ID` |
| `SENDER_NOT_AVAILABLE` | Project or account inactive | "service unavailable" | Activate it in the dashboard / ask ARQAM |
| `INSUFFICIENT_CREDITS` | No balance left | "service unavailable" | Add credits |
| `INVALID_REQUEST` | ARQAM refused the request (for example IP needed) | "service unavailable" | Check IP rate limiting (step 6); send the server log line to the developer |
| `RATE_LIMIT_PHONE` | Too many codes to this phone | "service unavailable" | Wait; our own limits (5 per 5 min) normally stop this first |
| `RATE_LIMIT_IP` | Too many codes from one IP | "service unavailable" | Check `ARQAM_SEND_IP` / IP limits in the project |
| `RATE_LIMITED` | Too many requests for the account | the server waits up to 2 s and tries again, then "service unavailable" | Ask ARQAM to raise the limit |
| (5xx, timeout) | ARQAM is down or slow | the server retries, then "service unavailable" | Wait; check ARQAM status |

Questions for ARQAM support (keep the answers in this file):
- ⚠️ Can our project use ARQAM's approved sender, or must we add our own WhatsApp number? Does adding our number require removing the WhatsApp app from that phone?
- ⚠️ Does `POST /sms/otp` accept `senderId` (we send it only if `ARQAM_SENDER_ID` is set) and honour the `Idempotency-Key` header?
- ⚠️ The exact Arabic and English OTP template names for our project.
