export const ROUTES = {
  root: '/',
  login: '/login',
  liveOverview: '/live',
  analytics: '/analytics',
  userJourney: '/journey',
  customers: '/customers',
  salons: '/salons',
  bookings: '/bookings',
  finance: '/finance',
  reviews: '/reviews',
  catalog: '/catalog',
  content: '/content',
  push: '/push',
  reports: '/reports',
  alerts: '/alerts',
  settings: '/settings',
  auditLog: '/audit-log',
  about: '/about',
  profile: '/profile',
  forbidden: '/forbidden',
  serverError: '/error',
} as const;
export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

export const LOGIN_REDIRECT_PARAM = 'next';

/** Dev-only gallery route (compiled out of prod builds). */
export const DESIGN_SYSTEM_PATH = '/design-system';
