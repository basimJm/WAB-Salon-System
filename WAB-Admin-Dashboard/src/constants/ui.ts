export const BRAND_MARK = 'WAB';
export const BRAND_TAGLINE = 'WEDDING & BEAUTY';
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;
export const SKELETON_ROWS = 6;
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
