/** Admin finance views (SRV-104, Admin PRD A16-A18). */
export const ADMIN_TRANSACTION_ROUTES = { base: '/transactions', byId: '/:id' } as const;
export const ADMIN_RECONCILIATION_ROUTES = { base: '/finance/reconciliation' } as const;
/** Rows shown per reconciliation section. */
export const RECONCILIATION_LIMIT = 50;
