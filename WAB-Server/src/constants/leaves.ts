/** Staff leaves (SRV-053, BUSINESS_DOMAIN.md §3.4 `staffLeaves`, Merchant PRD M17). */
export const LEAVES_COLLECTION = 'staffLeaves';
export const LEAVE_NOTE_MAX_LENGTH = 300;
export const MERCHANT_LEAVES_ROUTES = {
  list: '/:id/leaves',
  byId: '/:id/leaves/:leaveId',
} as const;
