import { DEFAULT_BRAND_COLOR, DEFAULT_BRAND_NAME, type Language } from '../constants/defaults';
import { validationError } from '../errors';
import { MESSAGES, TEMPLATE_IDS, type TemplateId } from './messages';

export type { TemplateId };
export { TEMPLATE_IDS };

export interface RenderOptions {
  readonly template: TemplateId;
  readonly language: Language;
  /** Values for the template placeholders; every placeholder must be supplied. */
  readonly params?: Readonly<Record<string, string>>;
  readonly brandName?: string;
  readonly brandColor?: string;
  /** Optional call-to-action link (must be https, or http on localhost for dev). */
  readonly actionUrl?: string;
}

export interface RenderedEmail {
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}

const PLACEHOLDER = /\{([A-Za-z0-9_]+)\}/g;
const SAFE_URL = /^https:\/\/[^\s"'<>]+$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/[^\s"'<>]*)?$/;

export const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const fill = (template: string, values: Record<string, string>, escape: boolean): string =>
  template.replace(PLACEHOLDER, (_match, name: string) => {
    const value = values[name];
    if (value === undefined) throw validationError(`missing template parameter: ${name}`);
    return escape ? escapeHtml(value) : value;
  });

/** Subject lines are single-line headers: drop line breaks a parameter could smuggle in. */
const oneLine = (value: string): string => value.replace(/[\r\n]+/g, ' ').trim();

/** Branded ar/en email (plain text + HTML). Pure: no I/O, safe to call on every request. */
export const renderEmail = (options: RenderOptions): RenderedEmail => {
  const messages = MESSAGES[options.language][options.template];
  const values: Record<string, string> = {
    brand: options.brandName ?? DEFAULT_BRAND_NAME,
    ...options.params,
  };
  if (options.actionUrl !== undefined && !SAFE_URL.test(options.actionUrl)) {
    throw validationError('actionUrl must be an https link');
  }
  const subject = oneLine(fill(messages.subject, values, false));
  const heading = fill(messages.heading, values, false);
  const body = fill(messages.body, values, false);
  const footer = fill(messages.footer, values, false);
  const action = messages.action;
  const link = options.actionUrl;

  const text = [
    heading,
    '',
    body,
    ...(action && link ? ['', `${action}: ${link}`] : []),
    '',
    footer,
  ]
    .join('\n')
    .trim();

  const rtl = options.language === 'ar';
  const button =
    action && link
      ? `<p><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 18px;background:${escapeHtml(options.brandColor ?? DEFAULT_BRAND_COLOR)};color:#fff;text-decoration:none;border-radius:8px">${escapeHtml(action)}</a></p>`
      : '';
  const html =
    `<!doctype html><html lang="${options.language}" dir="${rtl ? 'rtl' : 'ltr'}"><body style="font-family:Arial,sans-serif;color:#1F2233">` +
    `<h2>${escapeHtml(heading)}</h2><p>${escapeHtml(body)}</p>${button}` +
    `<hr><p style="color:#6B7280;font-size:12px">${escapeHtml(footer)}</p></body></html>`;
  return { subject, text, html };
};
