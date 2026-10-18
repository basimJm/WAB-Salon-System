/** Image types an uploader accepts unless told otherwise (the server checks the real type again on confirm). */
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
/** Default size limit of one image; the real limit per purpose comes from the server's presign answer. */
export const DEFAULT_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const BYTES_PER_KB = 1024;
export const BYTES_PER_MB = 1024 * 1024;
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 3;
export const ZOOM_STEP = 0.25;
export const ZOOM_DEFAULT = 1;
export const ROTATE_STEP_DEGREES = 90;
export const FULL_TURN_DEGREES = 360;
/** Phone preview frame: the logical size of the screen shown inside (a typical phone). */
export const PHONE_WIDTH_REM = 22;
export const PHONE_HEIGHT_REM = 40;
export const PROGRESS_DONE = 1;
/** Sample document drawn in the gallery (an SVG, so no file or network is needed). */
export const GALLERY_DOC_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320"><rect width="480" height="320" fill="#f4f1fb"/><rect x="24" y="24" width="432" height="272" fill="none" stroke="#6d28d9" stroke-width="4"/><text x="240" y="170" font-size="28" text-anchor="middle" fill="#6d28d9">WAB LICENSE</text></svg>';
export const GALLERY_UPLOAD_STEPS = 5;
export const GALLERY_UPLOAD_STEP_MS = 120;
export const GALLERY_FAIL_MARKER = 'fail';
