import {
  FULL_TURN_DEGREES,
  ROTATE_STEP_DEGREES,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
} from '@/constants/media';

const round = (value: number): number => Math.round(value * 100) / 100;

export const clampZoom = (value: number): number =>
  round(Math.min(Math.max(value, ZOOM_MIN), ZOOM_MAX));
export const zoomIn = (value: number): number => clampZoom(value + ZOOM_STEP);
export const zoomOut = (value: number): number => clampZoom(value - ZOOM_STEP);

/** Quarter turn, kept in 0..359 so the state never grows. */
export const rotateRight = (degrees: number): number =>
  (degrees + ROTATE_STEP_DEGREES) % FULL_TURN_DEGREES;
export const rotateLeft = (degrees: number): number =>
  (degrees - ROTATE_STEP_DEGREES + FULL_TURN_DEGREES) % FULL_TURN_DEGREES;
