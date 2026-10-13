/** Admin routes for content and app configuration (SRV-038 parts 2-3). */
export const ADMIN_CONTENT_ROUTES = {
  base: '/content',
  pages: '/pages',
  faqs: '/faqs',
  contactInfo: '/contact-info',
} as const;
export const ADMIN_APP_CONFIG_ROUTES = {
  base: '/app-config',
  versions: '/versions',
  maintenance: '/maintenance',
} as const;
export const CONTENT_BODY_MAX_LENGTH = 50_000;
export const FAQ_TEXT_MAX_LENGTH = 2_000;
