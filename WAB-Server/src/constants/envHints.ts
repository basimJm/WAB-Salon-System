/**
 * What a valid value looks like, per environment key. Shown (never the value itself) when startup
 * validation fails, so a deploy log says what to fix. Keys not listed get the generic message.
 */
export const ENV_KEY_HINTS: Readonly<Record<string, string>> = {
  NODE_ENV: 'must be development, production or test',
  PORT: 'must be a whole number between 1 and 65535 (hosts like Render set it themselves: remove it)',
  LOG_LEVEL: 'must be one of fatal, error, warn, info, debug, trace, silent',
  TRUST_PROXY_HOPS: 'must be a whole number, 1 behind Render or one load balancer',
  CORS_ALLOWED_ORIGINS: 'comma-separated browser addresses, e.g. https://admin.example.com',
  MONGODB_URI: 'must start with mongodb:// or mongodb+srv:// (Atlas: Connect > Drivers)',
  REDIS_URL: 'must start with redis:// or rediss:// (Render Key Value: Internal URL)',
  JWT_ACCESS_SECRET: 'must be at least 32 characters; generate one with: openssl rand -base64 48',
  PAYOUT_ENCRYPTION_KEY:
    'must be 32 random bytes in base64; generate one with: openssl rand -base64 32',
  OTP_PROVIDER:
    'must be arqam in production (fake is for development only; whatsapp and real are no longer supported)',
  STORAGE_PROVIDER: 'must be real in production (fake is for development only)',
  NOTIFIER_PROVIDER: 'must be real in production (fake is for development only)',
  PAYMENT_PROVIDER: 'must be exactly: disabled (payments are paused)',
  ARQAM_API_KEY:
    'required when OTP_PROVIDER=arqam: the ARQAM project API key (TEST key for dev, LIVE key for production)',
  ARQAM_BASE_URL: 'optional full URL, https in production (leave it unset to use ARQAM directly)',
  ARQAM_TEMPLATE_AR:
    'required when OTP_PROVIDER=arqam: the Arabic authentication template name exactly as ARQAM shows it',
  ARQAM_TEMPLATE_EN:
    'required when OTP_PROVIDER=arqam: the English authentication template name exactly as ARQAM shows it',
  ARQAM_SENDER_ID:
    'optional: the approved sender id, only when ARQAM answers SENDER_REQUIRED (letters, digits, _ . : + -)',
  ARQAM_SEND_IP:
    'must be true or false (true only when IP rate limiting is on in the ARQAM project)',
  OTP_CODE_SECRET:
    'required when OTP_PROVIDER=arqam: at least 32 characters; generate one with: openssl rand -base64 48',
  OTP_PROOF_SECRET:
    'required when OTP_PROVIDER=arqam: at least 32 characters and different from OTP_CODE_SECRET',
  OTP_FIXED_CODE: 'development only (digits, otp.length long): remove it in production',
  FCM_SERVICE_ACCOUNT_JSON:
    'required when NOTIFIER_PROVIDER=real: the whole Firebase key file as one line',
  SMTP_HOST: 'required when NOTIFIER_PROVIDER=real, e.g. smtp.gmail.com',
  SMTP_PORT: 'must be a whole number, e.g. 465',
  SMTP_SECURE: 'must be true or false',
  SMTP_USER: 'set together with SMTP_PASS (or remove both)',
  SMTP_PASS: 'set together with SMTP_USER (or remove both)',
  EMAIL_FROM_ADDRESS: 'required when NOTIFIER_PROVIDER=real: a valid email address',
  S3_REGION: 'required when STORAGE_PROVIDER=real, e.g. eu-central-1',
  S3_PUBLIC_BUCKET: 'required when STORAGE_PROVIDER=real: the public bucket name',
  S3_PRIVATE_BUCKET:
    'required when STORAGE_PROVIDER=real: the private bucket name (not the same as the public one)',
  S3_ENDPOINT: 'must be a full URL (only for MinIO or another S3-compatible store)',
  S3_ACCESS_KEY_ID: 'set together with S3_SECRET_ACCESS_KEY (or remove both to use an IAM role)',
  S3_SECRET_ACCESS_KEY: 'set together with S3_ACCESS_KEY_ID (or remove both to use an IAM role)',
  CDN_BASE_URL:
    'required when STORAGE_PROVIDER=real: a full https:// address, e.g. https://cdn.example.com',
  CLOUDFRONT_PRIVATE_BASE_URL: 'must be a full URL; set all three CLOUDFRONT_* keys or none',
  CLOUDFRONT_KEY_PAIR_ID: 'set all three CLOUDFRONT_* keys or none',
  CLOUDFRONT_PRIVATE_KEY: 'set all three CLOUDFRONT_* keys or none',
};
