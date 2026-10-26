/**
 * Analytics boards as drawn in `design/WAB Admin 03 Analytics` (A02-A10) — the KPI row and the cards, each card
 * with its column span on the 12-column board. Labels live in `locales/<lang>/analytics*.json` under
 * `<ns>.<board>.kpi.<id>` / `<ns>.<board>.card.<id>`. A page fills the KPIs and cards the server has
 * data for; every other one shows the design's "no data yet" state (numbers are never invented).
 */
export type CardSpan = 4 | 5 | 6 | 7 | 8 | 12;

export interface BoardCard {
  readonly id: string;
  readonly span: CardSpan;
}

export interface BoardDef {
  /** Locale area holding the labels (one file would pass the 300-line limit). */
  readonly ns: 'analytics' | 'analyticsOps';
  readonly kpis: readonly string[];
  readonly cards: readonly BoardCard[];
  /** Live pill next to the title (design A09). */
  readonly live?: boolean;
}

const card = (id: string, span: CardSpan): BoardCard => ({ id, span });
const FULL: CardSpan = 12;
const HALF: CardSpan = 6;
/** Design spans from 8 columns up stay full width on tablets; narrower cards take half the row. */
const TABLET_FULL_FROM = 8;
export const tabletSpan = (span: CardSpan): CardSpan => (span >= TABLET_FULL_FROM ? FULL : HALF);

export const ANALYTICS_BOARDS = {
  traffic: {
    ns: 'analytics',
    kpis: ['installs', 'dau', 'wau', 'mau', 'sessions', 'avgSession', 'conversion'],
    cards: [
      card('active', 8),
      card('byApp', 4),
      card('byPlatform', 4),
      card('byVersion', 4),
      card('byGender', 4),
      card('byCity', 4),
      card('topDevices', 4),
      card('byLanguage', 4),
      card('osVersion', FULL),
      card('daily', FULL),
    ],
  },
  screens: {
    ns: 'analytics',
    kpis: ['events', 'users', 'perUser'],
    cards: [card('screens', FULL), card('overTime', 8), card('byParam', 4), card('raw', FULL)],
  },
  funnels: {
    ns: 'analytics',
    kpis: ['overall', 'entered', 'completed', 'median'],
    cards: [card('result', FULL)],
  },
  search: {
    ns: 'analytics',
    kpis: ['searches', 'zero', 'bannerCtr', 'recommended', 'location', 'favorites'],
    cards: [
      card('top', 6),
      card('noResults', 6),
      card('filters', 6),
      card('entry', 6),
      card('banners', 6),
      card('locationPermission', 6),
      card('salonPages', FULL),
    ],
  },
  retention: {
    ns: 'analytics',
    kpis: ['d1', 'd7', 'd30', 'repeat30', 'repeat90'],
    cards: [card('cohorts', FULL), card('perCustomer', FULL)],
  },
  bookings: {
    ns: 'analyticsOps',
    kpis: [
      'bookings',
      'acceptance',
      'response',
      'bride',
      'autoCancelled',
      'noShow',
      'persons',
      'leadTime',
    ],
    cards: [
      card('byStatus', 8),
      card('paymentMethod', 4),
      card('byGender', 4),
      card('byCity', 4),
      card('persons', 4),
      card('rejectReasons', 6),
      card('cancelWindow', 6),
      card('leadTime', 6),
      card('salonCancel', 6),
      card('perSalon', FULL),
    ],
  },
  payments: {
    ns: 'analyticsOps',
    kpis: ['success', 'attempts', 'collected', 'fees', 'refunds', 'refundTime', 'refundFailed'],
    cards: [
      card('failReason', 6),
      card('failPlatform', 6),
      card('attempts', FULL),
      card('trend', FULL),
    ],
  },
  errors: {
    ns: 'analyticsOps',
    live: true,
    kpis: ['apiRate', 'p95', 'crashFree', 'crashes', 'otpSent', 'otpBlocked', 'pushFailed'],
    cards: [
      card('latency', 8),
      card('clientErrors', 4),
      card('endpoints', FULL),
      card('crashes', 7),
      card('failures', 5),
      card('trend', FULL),
    ],
  },
  merchants: {
    ns: 'analyticsOps',
    kpis: ['acceptTime', 'trials', 'ending', 'expired', 'paid'],
    cards: [
      card('byState', 5),
      card('completeness', 7),
      card('perSalon', FULL),
      card('missing', 6),
      card('members', 6),
    ],
  },
} as const satisfies Record<string, BoardDef>;

export type BoardId = keyof typeof ANALYTICS_BOARDS;

/** Subscriptions counted as "ending soon" on the merchants board (design: "ending ≤ 7 days"). */
export const ENDING_SOON_DAYS = 7;
