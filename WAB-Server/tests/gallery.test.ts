import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { GALLERY_MAX_ITEMS } from '../src/constants/gallery';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { createGalleryService } from '../src/domain/gallery/gallery.service';
import type { UploadVerifier } from '../src/domain/uploads/uploads.service';
import { requireAuth } from '../src/middlewares/auth';
import { loadMember } from '../src/middlewares/permission';
import { FakeStorageProvider } from '../src/providers/storage';
import { GalleryRepository } from '../src/repositories/gallery.repository';
import { MembersRepository } from '../src/repositories/identity.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { ValidationError } from '../src/utils/errors';
import { createLogger } from '../src/utils/logger';
import { fileSlotsKit } from './helpers/fileSlots';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const salonId = new Types.ObjectId();
const otherSalon = new Types.ObjectId();
const gallery = createFakeModel();
const members = createFakeModel();
const storage = new FakeStorageProvider();
const deleted: string[][] = [];
const originalDelete = storage.delete.bind(storage);
storage.delete = async (keys: readonly string[]): Promise<void> => {
  deleted.push([...keys]);
  await originalDelete(keys);
};
const kit = fileSlotsKit(storage);
const verified: Parameters<UploadVerifier['assertConfirmed']>[0][] = [];
const verifier: { reject: string[] } & UploadVerifier = {
  reject: [],
  assertConfirmed(input) {
    verified.push(input);
    return input.keys.some((k) => this.reject.includes(k))
      ? Promise.reject(new ValidationError({ code: 'UPLOAD_INVALID' }))
      : Promise.resolve();
  },
};
const app = createApp({
  logger,
  services: {
    gallery: createGalleryService({
      gallery: new GalleryRepository(gallery.model as never),
      storage,
      uploads: verifier,
      settings: { get: (key: string) => Promise.resolve(SETTING_DEFAULTS[key as never]) },
      cleanup: kit.cleanup,
    }),
    salonProfile: {
      service: undefined as never,
      guard: [
        requireAuth('merchant', SECRET),
        loadMember(new MembersRepository(members.model as never)),
      ],
    },
  },
});

interface Item {
  id: string;
  type: string;
  url: string;
  thumbnailUrl: string | null;
  durationSec: number | null;
  order: number;
}
interface Body {
  data: Item & Item[];
  error: { code: string; details: { field: string }[] };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const member = (role: string, permissions: string[], salon = salonId): string => {
  const _id = new Types.ObjectId();
  members.docs.push({ _id, salonId: salon, role, permissions, active: true });
  return _id.toHexString();
};
const auth = (id: string): Record<string, string> => ({
  Authorization: `Bearer ${signAccessToken({ secret: SECRET, subjectType: 'MEMBER', subjectId: id, ttlSec: 600 }).token}`,
});
const add = async (id: string, body: object): Promise<{ status: number; body: unknown }> =>
  await request(app).post('/merchant/v1/salon/gallery').set(auth(id)).send(body);
const row = (over: Record<string, unknown>): Record<string, unknown> => ({
  _id: new Types.ObjectId(),
  salonId,
  type: 'IMAGE',
  key: 'gallery/s/a.jpg',
  order: 0,
  ...over,
});

beforeEach(() => {
  gallery.docs.length = 0;
  members.docs.length = 0;
  verified.length = 0;
  deleted.length = 0;
  kit.cleanupsModel.docs.length = 0;
  verifier.reject = [];
});

describe('gallery', () => {
  it('needs GALLERY_MANAGE (owner has it) and a merchant token', async () => {
    expect((await request(app).get('/merchant/v1/salon/gallery')).status).toBe(401);
    const denied = await request(app)
      .get('/merchant/v1/salon/gallery')
      .set(auth(member('EMPLOYEE', ['REVIEWS_VIEW'])));
    expect(denied.status).toBe(403);
    expect(
      (
        await request(app)
          .get('/merchant/v1/salon/gallery')
          .set(auth(member('MANAGER', ['GALLERY_MANAGE'])))
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .get('/merchant/v1/salon/gallery')
          .set(auth(member('OWNER', [])))
      ).status,
    ).toBe(200);
  });

  it('adds an image with a thumbnail key and appends it at the end', async () => {
    const owner = member('OWNER', []);
    const first = await add(owner, { type: 'IMAGE', key: 'gallery/s1/a.jpg' });
    expect(first.status).toBe(201);
    expect(bodyOf(first).data).toMatchObject({ type: 'IMAGE', order: 0, durationSec: null });
    expect(bodyOf(first).data.thumbnailUrl).toContain('gallery/s1/a_thumb.webp');
    const second = await add(owner, { type: 'IMAGE', key: 'gallery/s1/b.jpg' });
    expect(bodyOf(second).data.order).toBe(1);
    expect(verified[0]).toMatchObject({ keys: ['gallery/s1/a.jpg'], purpose: 'GALLERY_IMAGE' });
    expect(verified[0]?.accept?.({ salonId: salonId.toHexString() } as never)).toBe(true);
    expect(verified[0]?.accept?.({ salonId: otherSalon.toHexString() } as never)).toBe(false);
  });

  it('adds a video with duration and an optional poster; checks the purposes', async () => {
    const owner = member('OWNER', []);
    const res = await add(owner, {
      type: 'VIDEO',
      key: 'gallery/s1/v.mp4',
      thumbnailKey: 'gallery/s1/poster.jpg',
      durationSec: 45,
    });
    expect(res.status).toBe(201);
    expect(bodyOf(res).data).toMatchObject({ type: 'VIDEO', durationSec: 45 });
    expect(bodyOf(res).data.thumbnailUrl).toContain('gallery/s1/poster.jpg');
    expect(verified.map((v) => v.purpose)).toEqual(['GALLERY_VIDEO', 'GALLERY_IMAGE']);
    const noPoster = await add(owner, { type: 'VIDEO', key: 'gallery/s1/w.mp4' });
    expect(bodyOf(noPoster).data.thumbnailUrl).toBeNull();
  });

  it('rejects a video longer than the limit, unconfirmed uploads and bad bodies; stores nothing', async () => {
    const owner = member('OWNER', []);
    const tooLong = await add(owner, {
      type: 'VIDEO',
      key: 'gallery/s1/v.mp4',
      durationSec: SETTING_DEFAULTS['uploads.videoMaxSec'] + 1,
    });
    expect(tooLong.status).toBe(400);
    expect(bodyOf(tooLong).error.details.map((d) => d.field)).toContain('body.durationSec');
    verifier.reject = ['gallery/s1/bad.jpg'];
    expect((await add(owner, { type: 'IMAGE', key: 'gallery/s1/bad.jpg' })).status).toBe(400);
    expect((await add(owner, { type: 'IMAGE', key: '../x' })).status).toBe(400);
    expect((await add(owner, { type: 'AUDIO', key: 'gallery/s1/a.mp3' })).status).toBe(400);
    expect(gallery.docs).toHaveLength(0);
  });

  it('stops at the item limit', async () => {
    const owner = member('OWNER', []);
    for (let i = 0; i < GALLERY_MAX_ITEMS; i += 1)
      gallery.docs.push(row({ order: i, key: `gallery/s/${String(i)}.jpg` }));
    expect((await add(owner, { type: 'IMAGE', key: 'gallery/s/new.jpg' })).status).toBe(422);
    expect(gallery.docs).toHaveLength(GALLERY_MAX_ITEMS);
  });

  it('lists only this salon’s items in order', async () => {
    const owner = member('OWNER', []);
    gallery.docs.push(
      row({ order: 2, key: 'gallery/s/c.jpg' }),
      row({ order: 0, key: 'gallery/s/a.jpg' }),
      row({ order: 1, salonId: otherSalon, key: 'gallery/o/x.jpg' }),
      row({ order: 1, key: 'gallery/s/b.jpg' }),
    );
    const res = await request(app).get('/merchant/v1/salon/gallery').set(auth(owner));
    expect(bodyOf(res).data.map((i) => i.url.split('/').pop())).toEqual([
      'a.jpg',
      'b.jpg',
      'c.jpg',
    ]);
  });

  it('reorders when every id is listed exactly once', async () => {
    const owner = member('OWNER', []);
    const a = row({ order: 0, key: 'gallery/s/a.jpg' });
    const b = row({ order: 1, key: 'gallery/s/b.jpg' });
    const c = row({ order: 2, key: 'gallery/s/c.jpg' });
    gallery.docs.push(a, b, c);
    const ids = [c, a, b].map((d) => String(d['_id']));
    const res = await request(app)
      .put('/merchant/v1/salon/gallery/order')
      .set(auth(owner))
      .send({ ids });
    expect(res.status).toBe(200);
    expect(bodyOf(res).data.map((i) => i.url.split('/').pop())).toEqual([
      'c.jpg',
      'a.jpg',
      'b.jpg',
    ]);
    expect(bodyOf(res).data.map((i) => i.order)).toEqual([0, 1, 2]);
  });

  it.each([
    ['a missing id', (ids: string[]): string[] => ids.slice(1)],
    ['a duplicate', (ids: string[]): string[] => [ids[0] ?? '', ...ids.slice(0, 2)]],
    ['a foreign id', (ids: string[]): string[] => [...ids.slice(1), otherSalon.toHexString()]],
    ['an extra id', (ids: string[]): string[] => [...ids, new Types.ObjectId().toHexString()]],
  ])('refuses a reorder with %s and changes nothing', async (_name, mutate) => {
    const owner = member('OWNER', []);
    gallery.docs.push(
      row({ order: 0 }),
      row({ order: 1, key: 'gallery/s/b.jpg' }),
      row({ order: 2, key: 'gallery/s/c.jpg' }),
    );
    const ids = gallery.docs.map((d) => String(d['_id']));
    const res = await request(app)
      .put('/merchant/v1/salon/gallery/order')
      .set(auth(owner))
      .send({ ids: mutate(ids) });
    expect(res.status).toBe(400);
    expect(gallery.docs.map((d) => d['order'])).toEqual([0, 1, 2]);
  });

  it('deletes an item with its files (variants for images), only inside the own salon', async () => {
    const owner = member('OWNER', []);
    const mine = row({ key: 'gallery/s/a.jpg', thumbnailKey: 'gallery/s/a_thumb.webp' });
    const video = row({
      type: 'VIDEO',
      key: 'gallery/s/v.mp4',
      thumbnailKey: 'gallery/s/poster.jpg',
      order: 1,
    });
    const foreign = row({ salonId: otherSalon, key: 'gallery/o/x.jpg' });
    gallery.docs.push(mine, video, foreign);
    expect(
      (
        await request(app)
          .delete(`/merchant/v1/salon/gallery/${String(foreign['_id'])}`)
          .set(auth(owner))
      ).status,
    ).toBe(404);
    expect(gallery.docs).toHaveLength(3);
    expect(
      (
        await request(app)
          .delete(`/merchant/v1/salon/gallery/${String(mine['_id'])}`)
          .set(auth(owner))
      ).status,
    ).toBe(200);
    // Queued in the outbox, deleted by its next run (SRV-182).
    expect(deleted).toHaveLength(0);
    await kit.cleanup.drain();
    expect(deleted[0]).toEqual([
      'gallery/s/a.jpg',
      'gallery/s/a_thumb.webp',
      'gallery/s/a_medium.webp',
    ]);
    expect(
      (
        await request(app)
          .delete(`/merchant/v1/salon/gallery/${String(video['_id'])}`)
          .set(auth(owner))
      ).status,
    ).toBe(200);
    await kit.cleanup.drain();
    expect(deleted[1]).toEqual(expect.arrayContaining(['gallery/s/v.mp4', 'gallery/s/poster.jpg']));
    expect(gallery.docs).toHaveLength(1);
    expect(
      (await request(app).delete('/merchant/v1/salon/gallery/nope').set(auth(owner))).status,
    ).toBe(400);
  });

  it('answers 503 when unconfigured', async () => {
    expect((await request(createApp({ logger })).get('/merchant/v1/salon/gallery')).status).toBe(
      503,
    );
  });
});
