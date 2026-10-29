import brandIcon from '@/assets/wab-app-icon.png';

export const BRAND_MARK = 'WAB';
/** The WAB app icon (design/assets/wab-app-icon.png): sidebar and login brand. */
export const BRAND_ICON_URL: string = brandIcon;
/** Keyboard hint of the global search (Cmd+K on macOS, Ctrl+K elsewhere). */
export const SEARCH_SHORTCUT_KEY = 'k';
export const SEARCH_SHORTCUT_HINT = '⌘K';
export const BRAND_TAGLINE = 'WEDDING & BEAUTY';
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;
/** The largest page the admin API serves (lookups load one full page). */
export const MAX_PAGE_SIZE = 100;
export const SKELETON_ROWS = 6;
/** Placeholder cards while a card grid (banners) loads. */
export const SKELETON_CARDS = 4;
export const MIN_REASON_LENGTH = 3;
export const TOAST_DURATION_MS = 4_000;
export const SIDEBAR_DRAWER_ID = 'wab-sidebar';
export const STARTUP_ERROR_FALLBACK = 'Startup error';
/** Sample external link shown in the dev-only design gallery. */
export const GALLERY_EXTERNAL_LINK = 'https://example.com/docs';
/** Debounce of every search box (Admin PRD §2, same as the apps). */
export const SEARCH_DEBOUNCE_MS = 500;
/** Longest free-text value accepted by the generic text validators. */
export const MAX_TEXT_LENGTH = 500;
/** Sample timestamp shown by the gallery's save bar. */
export const GALLERY_UPDATED_AT = '2026-10-12T09:30:00Z';
/** Fixed "now" of the gallery's date pickers so screenshots and tests are stable (2026-10-14 12:00 Amman). */
export const GALLERY_NOW = '2026-10-14T09:00:00Z';
/** Most toasts on screen at once; a newer one pushes the oldest out. */
export const MAX_VISIBLE_TOASTS = 3;
/** JSON viewer: levels expanded at first, and the deepest level drawn (deeper values show an ellipsis). */
export const JSON_OPEN_DEPTH = 2;
export const JSON_MAX_DEPTH = 12;
/** Sample booking reference shown by the gallery's detail page. */
export const GALLERY_SAMPLE_REF = 'WAB-7K2M9Q';
/** Nav counters above this show as "99+". */
export const MAX_COUNTER = 99;
/** Characters needed before the global search runs, and how many results it shows per group. */
export const SEARCH_MIN_CHARS = 2;

/** Query-string names of the list state kept in the URL (shareable, bookmarkable, back/forward safe). */
export const LIST_PARAMS = {
  page: 'page',
  pageSize: 'pageSize',
  search: 'q',
  sort: 'sort',
} as const;
export const LIST_SORT_SEPARATOR = ':';
export const LIST_SEARCH_MAX_LENGTH = 100;

/** An export is asked again every 2 seconds, for at most 2 minutes, before the screen stops waiting for it. */
export const EXPORT_POLL_INTERVAL_MS = 2_000;
export const EXPORT_POLL_TIMEOUT_MS = 120_000;
export const SEARCH_GROUP_SIZE = 5;
/** Latest NEW alerts shown in the top-bar bell dropdown (design `WAB Admin Topbar`). */
export const BELL_LATEST_ALERTS = 5;
/** Bookings of a refused audience change listed by reference (the rest are counted), §5.12 conflict list. */
export const AUDIENCE_CONFLICTS_SHOWN = 10;
