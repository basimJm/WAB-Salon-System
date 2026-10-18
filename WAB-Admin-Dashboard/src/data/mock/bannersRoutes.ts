import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { defineEndpoint } from '../api/endpoint';
import { collection } from './mockCollection';
import { mockRoute } from './mockRoute';
import type { MockRoute } from './mockTransport';

const ops = OPERATIONS;
const CDN = 'https://cdn.example.test/'; // hardcoded-ok: mock data

/** The contract answers dates as strings: an unlimited (null) day comes back as an empty string. */
const noNulls = (body: unknown) =>
  Object.fromEntries(Object.entries(body as Record<string, unknown>).map(([k, v]) => [k, v ?? '']));

export function bannersRoutes(): readonly MockRoute[] {
  let counter = 700;
  const nextId = () => `64d${String((counter += 1)).padStart(21, '0')}`;
  const banners = collection(
    [
      {
        id: '64d000000000000000000001',
        imageKey: { ar: 'banners/summer-ar.webp', en: 'banners/summer-en.webp' },
        action: 'NONE' as const,
        gender: 'BOTH' as const,
        startAt: '2026-06-01T21:00:00.000Z',
        endAt: '2026-09-01T21:00:00.000Z',
        order: 1,
        active: true,
      },
    ],
    nextId,
    { action: 'NONE', order: 0, active: true },
  );
  let uploads = 0;
  return [
    mockRoute(
      defineEndpoint(ops.getBanners, {
        data: dto.getBannersDataSchema,
        query: dto.getBannersQuerySchema,
      }),
      banners.list,
    ),
    mockRoute(
      defineEndpoint(ops.postBanners, {
        data: dto.postBannersDataSchema,
        body: dto.postBannersBodySchema,
      }),
      (req) => banners.create({ ...req, body: noNulls(req.body) }),
    ),
    mockRoute(
      defineEndpoint(ops.patchBannersById, {
        data: dto.patchBannersByIdDataSchema,
        body: dto.patchBannersByIdBodySchema,
      }),
      (req) => banners.update({ ...req, body: noNulls(req.body) }),
    ),
    mockRoute(
      defineEndpoint(ops.postUploadsPresign, {
        data: dto.postUploadsPresignDataSchema,
        body: dto.postUploadsPresignBodySchema,
      }),
      () => {
        uploads += 1;
        return {
          data: {
            key: `banners/mock-${String(uploads)}.webp`,
            maxBytes: 10_000_000,
            upload: {
              url: `${CDN}upload/${String(uploads)}`,
              method: 'PUT' as const,
              headers: {},
              expiresAt: '2030-01-01T00:00:00.000Z',
            },
          },
        };
      },
    ),
    mockRoute(
      defineEndpoint(ops.postUploadsConfirm, {
        data: dto.postUploadsConfirmDataSchema,
        body: dto.postUploadsConfirmBodySchema,
      }),
      ({ body }) => {
        const key = (body as { key: string }).key;
        return { data: { key, url: `${CDN}${key}` } };
      },
    ),
  ];
}
