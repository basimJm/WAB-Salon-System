/** Admin settings editor and audit-log viewer (SRV-103, Admin PRD A28, A29). */
export const ADMIN_SETTINGS_ROUTES = { base: '/settings', byKey: '/:key' } as const;
export const ADMIN_AUDIT_LOG_ROUTES = { base: '/audit-logs', byId: '/:id' } as const;
export const SETTING_AUDIT = { action: 'SETTING_UPDATE', entityType: 'setting' } as const;
export const AUDIT_FILTER_MAX_LENGTH = 100;
