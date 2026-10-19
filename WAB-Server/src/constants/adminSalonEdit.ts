/** Admin edits a salon on its behalf (SRV-119 profile and gallery, SRV-120 the rest; Admin PRD A13). */
export const ADMIN_SALON_EDIT_ROUTES = {
  base: '/salons',
  profile: '/:id/profile',
  gallery: '/:id/gallery',
  galleryOrder: '/:id/gallery/order',
  galleryRemove: '/:id/gallery/:itemId/remove',
} as const;

export const ADMIN_SALON_EDIT_AUDIT = {
  entityType: 'salon',
  actions: {
    profile: 'SALON_PROFILE_EDIT',
    galleryAdd: 'SALON_GALLERY_ADD',
    galleryRemove: 'SALON_GALLERY_REMOVE',
    galleryOrder: 'SALON_GALLERY_REORDER',
  },
} as const;
