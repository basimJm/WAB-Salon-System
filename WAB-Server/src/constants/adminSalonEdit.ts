/** Admin edits a salon on its behalf (SRV-119 profile and gallery, SRV-120 the rest; Admin PRD A13). */
export const ADMIN_SALON_EDIT_ROUTES = {
  base: '/salons',
  profile: '/:id/profile',
  gallery: '/:id/gallery',
  galleryOrder: '/:id/gallery/order',
  galleryRemove: '/:id/gallery/:itemId/remove',
  hours: '/:id/hours',
  hoursPreview: '/:id/hours/preview',
  closures: '/:id/closures',
  closuresPreview: '/:id/closures/preview',
  closure: '/:id/closures/:closureId',
  closureRemove: '/:id/closures/:closureId/remove',
  services: '/:id/services',
  service: '/:id/services/:serviceId',
  staff: '/:id/members/:memberId/staff',
  staffBranch: '/:id/members/:memberId/branch',
  policy: '/:id/policy',
} as const;

export const ADMIN_SALON_EDIT_AUDIT = {
  entityType: 'salon',
  actions: {
    profile: 'SALON_PROFILE_EDIT',
    galleryAdd: 'SALON_GALLERY_ADD',
    galleryRemove: 'SALON_GALLERY_REMOVE',
    galleryOrder: 'SALON_GALLERY_REORDER',
    hours: 'SALON_HOURS_EDIT',
    closureAdd: 'SALON_CLOSURE_ADD',
    closureUpdate: 'SALON_CLOSURE_UPDATE',
    closureRemove: 'SALON_CLOSURE_REMOVE',
    serviceAdd: 'SALON_SERVICE_ADD',
    serviceUpdate: 'SALON_SERVICE_UPDATE',
    staff: 'SALON_STAFF_EDIT',
    staffMove: 'SALON_STAFF_MOVE',
    policy: 'SALON_POLICY_EDIT',
  },
} as const;
