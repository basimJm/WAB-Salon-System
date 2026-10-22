/** Android App Links + iOS Universal Links for shared salon links (SRV-135). Mounted at the root. */
export const APP_LINKS_PATHS = {
  assetLinks: '/.well-known/assetlinks.json',
  appleAppSiteAssociation: '/.well-known/apple-app-site-association',
  salon: '/salon/:salonId',
} as const;

/** The salon path in OpenAPI syntax. */
export const APP_LINKS_SALON_DOC_PATH = '/salon/{salonId}';

/** The path pattern the iOS app claims (Apple `components` syntax). */
export const APP_LINKS_IOS_PATH_PATTERN = '/salon/*';

export const ANDROID_HANDLE_ALL_URLS = 'delegate_permission/common.handle_all_urls';
export const ANDROID_APP_NAMESPACE = 'android_app';

export const APP_LINKS_CONTENT_TYPES = {
  json: 'application/json',
  html: 'text/html; charset=utf-8',
  htmlMedia: 'text/html',
} as const;

export const ROBOTS_NOINDEX = 'noindex';

export interface AppLinksSettings {
  readonly androidPackages: readonly string[];
  readonly androidSha256: readonly string[];
  /** `<TEAM_ID>.<bundleId>` entries. */
  readonly iosAppIds: readonly string[];
  readonly playStoreUrl?: string;
  readonly appStoreUrl?: string;
}

export const EMPTY_APP_LINKS: AppLinksSettings = Object.freeze({
  androidPackages: [],
  androidSha256: [],
  iosAppIds: [],
});

/** Languages written right to left (the fallback page sets `dir` from it). */
export const RTL_LANGUAGES: readonly string[] = ['ar'];
export const TEXT_DIRECTIONS = { rtl: 'rtl', ltr: 'ltr' } as const;
