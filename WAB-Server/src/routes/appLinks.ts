import { Router, type Request, type Response } from 'express';
import {
  ANDROID_APP_NAMESPACE,
  ANDROID_HANDLE_ALL_URLS,
  APP_LINKS_CONTENT_TYPES,
  APP_LINKS_IOS_PATH_PATTERN,
  APP_LINKS_PATHS,
  EMPTY_APP_LINKS,
  ROBOTS_NOINDEX,
  RTL_LANGUAGES,
  TEXT_DIRECTIONS,
  type AppLinksSettings,
} from '../constants/appLinks';
import { HTTP_STATUS } from '../constants/http';
import { isObjectIdString } from '../utils/database/ids';
import { NotFoundError } from '../utils/errors';

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);

export const buildAssetLinks = (settings: AppLinksSettings): unknown[] =>
  settings.androidPackages.map((packageName) => ({
    relation: [ANDROID_HANDLE_ALL_URLS],
    target: {
      namespace: ANDROID_APP_NAMESPACE,
      package_name: packageName,
      sha256_cert_fingerprints: [...settings.androidSha256],
    },
  }));

export const buildAppleAppSiteAssociation = (settings: AppLinksSettings): unknown => ({
  applinks: {
    details: [
      { appIDs: [...settings.iosAppIds], components: [{ '/': APP_LINKS_IOS_PATH_PATTERN }] },
    ],
  },
});

/**
 * The two verification files use the platforms' own formats (Google Digital Asset Links, Apple
 * AASA), so they are sent raw — NOT in the `{success,message,data}` envelope — with 200 and
 * `application/json`, and never redirect: Android and iOS reject anything else.
 */
const sendPlatformJson = (res: Response, body: unknown): void => {
  res.status(HTTP_STATUS.ok).type(APP_LINKS_CONTENT_TYPES.json).send(JSON.stringify(body));
};

const storeButton = (url: string | undefined, label: string): string =>
  url === undefined
    ? ''
    : `<p><a class="btn" href="${escapeHtml(url)}">${escapeHtml(label)}</a></p>`;

export const renderSalonPage = (req: Request, settings: AppLinksSettings): string => {
  const lang = req.language;
  const dir = RTL_LANGUAGES.includes(lang) ? TEXT_DIRECTIONS.rtl : TEXT_DIRECTIONS.ltr;
  return [
    '<!doctype html>',
    `<html lang="${escapeHtml(lang)}" dir="${dir}">`,
    '<head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<meta name="robots" content="${ROBOTS_NOINDEX}">`,
    `<title>${escapeHtml(req.t('appLinks.salon.title'))}</title></head>`,
    '<body>',
    `<h1>${escapeHtml(req.t('appLinks.salon.heading'))}</h1>`,
    `<p>${escapeHtml(req.t('appLinks.salon.body'))}</p>`,
    storeButton(settings.playStoreUrl, req.t('appLinks.salon.playStore')),
    storeButton(settings.appStoreUrl, req.t('appLinks.salon.appStore')),
    '</body></html>',
  ].join('');
};

/** `.well-known` verification files + the no-app fallback page for `/salon/{id}`. */
export const createAppLinksRouter = (settings: AppLinksSettings = EMPTY_APP_LINKS): Router => {
  const router = Router();
  router.get(APP_LINKS_PATHS.assetLinks, (_req, res) => {
    sendPlatformJson(res, buildAssetLinks(settings));
  });
  router.get(APP_LINKS_PATHS.appleAppSiteAssociation, (_req, res) => {
    sendPlatformJson(res, buildAppleAppSiteAssociation(settings));
  });
  router.get(APP_LINKS_PATHS.salon, (req, res) => {
    if (!isObjectIdString(req.params.salonId)) throw new NotFoundError();
    // Plain HTML for a browser without the app; no external assets or scripts (helmet CSP).
    res
      .status(HTTP_STATUS.ok)
      .type(APP_LINKS_CONTENT_TYPES.html)
      .send(renderSalonPage(req, settings));
  });
  return router;
};
