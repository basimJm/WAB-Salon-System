/** Admin profile (SRV-117, Admin PRD §4): own data, password, email and alert recipients. */
export const ADMIN_PROFILE_ROUTES = {
  base: '/profile',
  password: '/password',
  emailRequest: '/email/request',
  emailVerify: '/email/verify',
} as const;

/** A new password is at least this long (the sign-in form only bounds it, it never checks policy). */
export const ADMIN_PASSWORD_MIN_LENGTH = 12;
/** How many addresses may receive the platform alert emails. */
export const ADMIN_ALERT_EMAILS_MAX = 10;
/** Redis key of a pending email change; the value holds the new address and the code hash. */
export const ADMIN_EMAIL_CHANGE_KEY_PREFIX = 'admin:email-change';
/** Separator between the address and the code hash inside the stored value. */
export const ADMIN_EMAIL_CHANGE_VALUE_SEPARATOR = '|';

/** Audit entries of the admin's own changes; the reason is fixed because the admin acts on themselves. */
export const ADMIN_PROFILE_AUDIT = {
  entityType: 'admin',
  actions: {
    profile: 'ADMIN_PROFILE_UPDATE',
    password: 'ADMIN_PASSWORD_CHANGE',
    email: 'ADMIN_EMAIL_CHANGE',
  },
  reasons: {
    profile: 'Admin updated the alert recipients',
    password: 'Admin changed the password',
    email: 'Admin changed the sign-in email',
  },
} as const;
