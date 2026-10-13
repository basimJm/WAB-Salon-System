/** Public content: legal/about pages and FAQ (SRV-037, BUSINESS_DOMAIN.md §3.6). */
export const CONTENT_ROUTES = { base: '/content', pages: '/pages', faqs: '/faqs' } as const;

export const CONTENT_PAGES_COLLECTION = 'contentPages';
export const FAQS_COLLECTION = 'faqs';

export const CONTENT_KINDS = ['PRIVACY', 'TERMS', 'ABOUT'] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];

/** URL segment per kind, e.g. `/content/pages/privacy`. */
export const CONTENT_KIND_SLUGS = { privacy: 'PRIVACY', terms: 'TERMS', about: 'ABOUT' } as const;
