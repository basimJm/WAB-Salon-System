/** Device registration routes (SRV-033, BUSINESS_DOMAIN.md §3.1 `installations`). */
export const INSTALLATION_ROUTES = {
  base: '/installations',
  register: '/',
  pushEnabled: '/push-enabled',
} as const;
