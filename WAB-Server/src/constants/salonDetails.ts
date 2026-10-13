/** Salon details for customers (SRV-060, Customer PRD S07). */
export const SALON_DETAILS_ROUTES = {
  base: '/salons',
  byId: '/:salonId',
  staff: '/:salonId/staff/:memberId',
} as const;
export const STAFF_STATUSES = ['ON_DUTY', 'ON_LEAVE', 'DAY_OFF'] as const;
export type StaffStatus = (typeof STAFF_STATUSES)[number];
