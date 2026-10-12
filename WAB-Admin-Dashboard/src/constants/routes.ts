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
} as const;
export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

export const LOGIN_REDIRECT_PARAM = 'next';
