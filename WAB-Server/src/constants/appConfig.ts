/** App config: version policy, maintenance, contact info (SRV-035, BUSINESS_DOMAIN.md §3.6). */
export const APP_CONFIG_ROUTES = { base: '/config' } as const;

export const APP_VERSIONS_COLLECTION = 'appVersions';
export const MAINTENANCE_COLLECTION = 'maintenance';
export const CONTACT_INFO_COLLECTION = 'contactInfo';

/** Mobile platforms that have store builds (the web admin has no version policy). */
export const CLIENT_PLATFORMS = ['ANDROID', 'IOS'] as const;
export type ClientPlatform = (typeof CLIENT_PLATFORMS)[number];

/** `1`, `1.2`, `1.2.3` or `1.2.3.4`: dot-separated whole numbers. */
export const APP_VERSION_PATTERN = /^[0-9]{1,6}(\.[0-9]{1,6}){0,3}$/;
export const VERSION_SEPARATOR = '.';

/** What the app does with its version (Customer PRD S24). */
export const VERSION_STATUSES = ['OK', 'UPDATE_AVAILABLE', 'UPDATE_REQUIRED'] as const;
export type VersionStatus = (typeof VERSION_STATUSES)[number];

export const STORE_URL_PATTERN = /^https:\/\/\S+$/;
export const STORE_URL_MAX_LENGTH = 500;
export const MAINTENANCE_MESSAGE_MAX_LENGTH = 500;
export const EMAIL_FIELD_MAX_LENGTH = 254;
