import type { Express } from 'express';
import request from 'supertest';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import { APP_LINKS_PATHS, type AppLinksSettings } from '../src/constants/appLinks';
import { ENV_KEYS } from '../src/constants/env';
import { MESSAGES } from '../src/utils/i18n';
import { createLogger } from '../src/utils/logger';
import type { ErrorResponseBody } from '../src/utils/response/errorResponse';

const logger = createLogger({ level: 'silent' });
const SALON_ID = '64b7f0c2a1b2c3d4e5f60718';
const salonPath = (id: string): string => `/salon/${id}`;

const FULL: AppLinksSettings = {
  androidPackages: ['com.wab.customer', 'com.wab.customer.dev'],
  androidSha256: ['AA:BB', 'CC:DD'],
  iosAppIds: ['TEAM123.com.wab.customer'],
  playStoreUrl: 'https://play.example.test/store?id=com.wab&x="<b>',
  appStoreUrl: 'https://apps.example.test/app/wab',
};

const appWith = (appLinks?: AppLinksSettings): Express =>
  createApp({ logger, ...(appLinks === undefined ? {} : { appLinks }) });

describe('GET /.well-known/assetlinks.json', () => {
  it('lists one raw entry per package (no envelope, application/json, 200)', async () => {
    const res = await request(appWith(FULL)).get(APP_LINKS_PATHS.assetLinks);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^application\/json/);
    const target = (pkg: string): unknown => ({
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: pkg,
        sha256_cert_fingerprints: ['AA:BB', 'CC:DD'],
      },
    });
    expect(JSON.parse(res.text)).toEqual([
      target('com.wab.customer'),
      target('com.wab.customer.dev'),
    ]);
  });

  it('is an empty array when nothing is configured', async () => {
    const res = await request(appWith()).get(APP_LINKS_PATHS.assetLinks);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^application\/json/);
    expect(res.text).toBe('[]');
  });
});

describe('GET /.well-known/apple-app-site-association', () => {
  it('claims /salon/* for the configured app ids, raw JSON', async () => {
    const res = await request(appWith(FULL)).get(APP_LINKS_PATHS.appleAppSiteAssociation);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^application\/json/);
    expect(JSON.parse(res.text)).toEqual({
      applinks: {
        details: [{ appIDs: ['TEAM123.com.wab.customer'], components: [{ '/': '/salon/*' }] }],
      },
    });
  });

  it('has an empty appIDs list without configuration', async () => {
    const res = await request(appWith()).get(APP_LINKS_PATHS.appleAppSiteAssociation);
    expect(JSON.parse(res.text)).toEqual({
      applinks: { details: [{ appIDs: [], components: [{ '/': '/salon/*' }] }] },
    });
  });
});

describe('GET /salon/:salonId', () => {
  it('serves an Arabic RTL page by default with both store buttons, escaped', async () => {
    const res = await request(appWith(FULL)).get(salonPath(SALON_ID));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^text\/html/);
    expect(res.text).toContain('<html lang="ar" dir="rtl">');
    expect(res.text).toContain('<meta name="robots" content="noindex">');
    expect(res.text).toContain(MESSAGES.ar['appLinks.salon.heading']);
    expect(res.text).toContain(MESSAGES.ar['appLinks.salon.playStore']);
    expect(res.text).toContain(MESSAGES.ar['appLinks.salon.appStore']);
    expect(res.text).toContain(
      'href="https://play.example.test/store?id=com.wab&amp;x=&quot;&lt;b&gt;"',
    );
    expect(res.text).not.toContain('"<b>');
    expect(res.text).not.toMatch(/<script|<link/);
  });

  it('serves English LTR by Accept-Language and omits unset store buttons', async () => {
    const res = await request(appWith()).get(salonPath(SALON_ID)).set('Accept-Language', 'en');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<html lang="en" dir="ltr">');
    expect(res.text).toContain(MESSAGES.en['appLinks.salon.heading']);
    expect(res.text).not.toContain(MESSAGES.en['appLinks.salon.playStore']);
    expect(res.text).not.toContain(MESSAGES.en['appLinks.salon.appStore']);
    expect(res.text).not.toContain('<a ');
  });

  it('answers the normal 404 envelope for an invalid id', async () => {
    const res = await request(appWith(FULL)).get(salonPath('not-an-id'));
    const body = res.body as ErrorResponseBody;
    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});

describe('app links config', () => {
  const base = {
    [ENV_KEYS.mongoUri]: 'mongodb://localhost/wab',
    [ENV_KEYS.redisUrl]: 'redis://localhost:6379',
    [ENV_KEYS.jwtAccessSecret]: 'a'.repeat(48),
  };

  it('splits the comma lists and keeps the store URLs', () => {
    const config = loadConfig({
      ...base,
      [ENV_KEYS.appLinksAndroidPackages]: ' com.a , com.b ,',
      [ENV_KEYS.appLinksAndroidSha256]: 'AA:BB',
      [ENV_KEYS.appLinksIosAppIds]: 'T.com.a',
      [ENV_KEYS.appLinksPlayStoreUrl]: 'https://play.example.test/a',
      [ENV_KEYS.appLinksAppStoreUrl]: 'https://apps.example.test/a',
    });
    expect(config.appLinks).toEqual({
      androidPackages: ['com.a', 'com.b'],
      androidSha256: ['AA:BB'],
      iosAppIds: ['T.com.a'],
      playStoreUrl: 'https://play.example.test/a',
      appStoreUrl: 'https://apps.example.test/a',
    });
  });

  it('defaults to empty lists and no store URLs', () => {
    expect(loadConfig(base).appLinks).toEqual({
      androidPackages: [],
      androidSha256: [],
      iosAppIds: [],
    });
  });

  it('treats an empty store URL as unset', () => {
    const config = loadConfig({ ...base, [ENV_KEYS.appLinksPlayStoreUrl]: '' });
    expect(config.appLinks.playStoreUrl).toBeUndefined();
  });

  it('rejects a store URL that is not a URL', () => {
    expect(() => loadConfig({ ...base, [ENV_KEYS.appLinksPlayStoreUrl]: 'nope' })).toThrow();
  });
});
