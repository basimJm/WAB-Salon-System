import { MOCK_CDN_BASE } from '@/constants/mock';
import { defineEndpoint } from '../api/endpoint';
import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { mockRoute } from './mockRoute';
import type { MockRoute } from './mockTransport';
import { type SalonEditState, uid, withoutReason } from './salonEditState';

const O = OPERATIONS;
export function salonProfileRoutes(
  of: (id: string | undefined) => SalonEditState,
): readonly MockRoute[] {
  return [
    mockRoute(
      defineEndpoint(O.getSalonsByIdProfile, { data: dto.getSalonsByIdProfileDataSchema }),
      ({ params }) => ({ data: of(params['id']).profile }),
    ),
    mockRoute(
      defineEndpoint(O.patchSalonsByIdProfile, {
        data: dto.patchSalonsByIdProfileDataSchema,
        body: dto.patchSalonsByIdProfileBodySchema,
      }),
      ({ params, body }) => {
        const s = of(params['id']);
        const patch = withoutReason(body);
        Object.assign(s.profile, patch);
        return { data: s.profile };
      },
    ),
    mockRoute(
      defineEndpoint(O.getSalonsByIdGallery, { data: dto.getSalonsByIdGalleryDataSchema }),
      ({ params }) => ({ data: of(params['id']).gallery }),
    ),
    mockRoute(
      defineEndpoint(O.postSalonsByIdGallery, {
        data: dto.postSalonsByIdGalleryDataSchema,
        body: dto.postSalonsByIdGalleryBodySchema,
      }),
      ({ params, body }) => {
        const s = of(params['id']);
        const b = body as { type: 'IMAGE' | 'VIDEO'; key: string; durationSec?: number };
        s.seq += 1;
        const item = {
          id: uid('64c', s.seq),
          type: b.type,
          url: `${MOCK_CDN_BASE}/${b.key}`,
          thumbnailUrl: null,
          durationSec: b.durationSec ?? null,
          order: s.gallery.length + 1,
        };
        s.gallery.push(item);
        return { data: item, status: 201 };
      },
    ),
    mockRoute(
      defineEndpoint(O.putSalonsByIdGalleryOrder, {
        data: dto.putSalonsByIdGalleryOrderDataSchema,
        body: dto.putSalonsByIdGalleryOrderBodySchema,
      }),
      ({ params, body }) => {
        const s = of(params['id']);
        const ids = (body as { ids: string[] }).ids;
        s.gallery = ids.map((id, i) => ({
          ...(s.gallery.find((g) => g.id === id) ?? s.gallery[0]!),
          order: i + 1,
        }));
        return { data: s.gallery };
      },
    ),
    mockRoute(
      defineEndpoint(O.postSalonsByIdGalleryByItemIdRemove, {
        data: dto.postSalonsByIdGalleryByItemIdRemoveDataSchema,
        body: dto.postSalonsByIdGalleryByItemIdRemoveBodySchema,
      }),
      ({ params }) => {
        const s = of(params['id']);
        s.gallery = s.gallery.filter((g) => g.id !== params['itemId']);
        return { data: null };
      },
    ),
  ];
}
