/** Spacing, radii, sizes, typography, motion and elevation. All lengths are rem so the UI scales. */
export const ROOT_FONT_SIZE = 'clamp(0.875rem, 0.8rem + 0.25vw, 1.0625rem)';

export const SPACING = {
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.5rem',
  6: '2rem',
  7: '3rem',
} as const;

export const RADIUS = {
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  pill: '62.4375rem',
} as const;

export const SIZES = {
  hairline: '1px',
  focusRing: '2px',
  control: '2.5rem',
  controlSm: '2rem',
  icon: '1.25rem',
  iconSm: '1rem',
  iconLg: '1.75rem',
  sidebar: '15rem',
  sidebarCollapsed: '4.5rem',
  topbar: '3.75rem',
  contentMax: '90rem',
  modal: '32rem',
  modalMax: '90dvh',
  toast: '22rem',
  tableMin: '40rem',
  skeletonLine: '1rem',
  spinner: '1.5rem',
  touchTarget: '2.75rem',
  cardMin: '15rem',
  authCard: '28rem',
  brandPanel: '34rem',
  segmentedItem: '2.25rem',
  badgeDot: '0.5rem',
  logo: '2.5rem',
  tableCellMin: '8rem',
  avatarSm: '2rem',
  avatar: '2.5rem',
  avatarLg: '3.5rem',
  tooltipMax: '18rem',
  keyValueLabel: '10rem',
} as const;

export const FONT_FAMILIES = {
  latin: "'Poppins', 'IBM Plex Sans Arabic', sans-serif",
  arabic: "'IBM Plex Sans Arabic', 'Poppins', sans-serif",
} as const;

export const FONT_SIZES = {
  xs: '0.6875rem',
  sm: '0.75rem',
  base: '0.8125rem',
  md: '0.9375rem',
  lg: '1.125rem',
  xl: '1.5rem',
  xxl: '2rem',
} as const;

export const FONT_WEIGHTS = { regular: '400', medium: '500', semibold: '600' } as const;
export const LINE_HEIGHT = '1.5';

export const OPACITY = { disabled: '0.5', pressed: '0.85', brandText: '0.85' } as const;

export const MOTION = {
  fast: '0.15s',
  normal: '0.25s',
  easing: 'ease-out',
} as const;

export const Z_INDEX = { sidebar: '30', topbar: '20', overlay: '40', popover: '45', modal: '50', toast: '60', ribbon: '70' } as const;

export const SHADOWS = {
  light: {
    card: '0 1px 2px rgba(31,34,51,.04),0 6px 20px rgba(31,34,51,.035)',
    overlay: '0 12px 40px rgba(31,34,51,.18)',
    primary: '0 6px 16px rgba(109,40,217,.22)',
  },
  dark: { card: 'none', overlay: '0 12px 40px rgba(0,0,0,.5)', primary: '0 6px 16px rgba(0,0,0,.35)' },
} as const;

export const BREAKPOINTS = { medium: 640, expanded: 1024 } as const;
export const BREAKPOINT_CLASSES = ['compact', 'medium', 'expanded'] as const;
export type BreakpointClass = (typeof BREAKPOINT_CLASSES)[number];
export const ORIENTATIONS = ['portrait', 'landscape'] as const;
export type Orientation = (typeof ORIENTATIONS)[number];
