import { createAdminCrud } from '../src/domain/adminCrud/adminCrud.service';
import { createAdminBannerService } from '../src/domain/adminCrud/banners';
import { BANNER_IMAGE_FIELDS, CATALOG_IMAGE_FIELDS } from '../src/domain/adminCrud/imageFields';
import { withAdminImageSlots } from '../src/domain/adminCrud/imageSlots';
import { createAuditWriter } from '../src/domain/audit/audit.service';
import type { BannerRaw } from '../src/models/banner.model';
import type { CatalogServiceRaw } from '../src/models/catalogService.model';
import { FakeStorageProvider } from '../src/providers/storage';
import { BannersRepository } from '../src/repositories/banners.repository';
import { CatalogServicesRepository } from '../src/repositories/catalog.repository';
import { ValidationError } from '../src/utils/errors';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';
import { fileSlotsKit } from './helpers/fileSlots';

const logger = createLogger({ level: 'silent' });
const actor = { adminId: '64a000000000000000000001', ip: '127.0.0.1', userAgent: 'jest' };
const REASON = 'Image update for the catalog';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- test rig, inferred shape
const setup = () => {
  const storage = new FakeStorageProvider();
  const kit = fileSlotsKit(storage);
  const audits: Record<string, unknown>[] = [];
  const audit = createAuditWriter({
    append: (data) => {
      audits.push(data);
      return Promise.resolve({ id: 'a', ...data } as never);
    },
  });
  const catalogModel = createFakeModel();
  const catalogStore = new CatalogServicesRepository(catalogModel.model as never);
  const catalog = withAdminImageSlots<CatalogServiceRaw>({
    crud: createAdminCrud<CatalogServiceRaw>({
      name: 'CATALOG_SERVICE',
      entityType: 'catalogService',
      store: catalogStore,
      audit,
    }),
    store: catalogStore,
    files: kit.slots,
    fields: CATALOG_IMAGE_FIELDS,
    logger,
  });
  const bannersModel = createFakeModel();
  const bannersStore = new BannersRepository(bannersModel.model as never);
  const banners = withAdminImageSlots<BannerRaw>({
    crud: createAdminBannerService(bannersStore, audit),
    store: bannersStore,
    files: kit.slots,
    fields: BANNER_IMAGE_FIELDS,
    logger,
  });
  const adminUpload = (
    key: string,
    purpose: 'CATALOG_IMAGE' | 'BANNER_IMAGE',
    ownerType: 'ADMIN' | 'MEMBER' = 'ADMIN',
  ): Promise<string> => kit.confirmed(key, { purpose, ownerType, ownerId: actor.adminId });
  return { storage, kit, audits, catalog, catalogModel, banners, bannersModel, adminUpload };
};

const CATALOG = {
  name: { ar: 'قص', en: 'Haircut' },
  description: { ar: 'وصف', en: 'Cut' },
  businessType: 'SALON',
  audience: 'BOTH',
  active: true,
} as const;

describe('admin catalog image as a file slot (SRV-182)', () => {
  it('creates the entry with its image in catalog/{id}/image?v=1 and audits it', async () => {
    const t = setup();
    await t.adminUpload('catalog/tmp/a.jpg', 'CATALOG_IMAGE');
    const created = await t.catalog.create({
      data: { ...CATALOG, imageKey: 'catalog/tmp/a.jpg' },
      reason: REASON,
      actor,
    });
    expect(created.imageKey).toBe(`catalog/${created.id}/image?v=1`);
    expect(t.audits[0]?.['after']).toMatchObject({ imageKey: `catalog/${created.id}/image?v=1` });
    expect(t.kit.queued()).toContain('catalog/tmp/a.jpg');
  });

  it('replacing keeps the key, bumps the version; audit before shows the old image', async () => {
    const t = setup();
    await t.adminUpload('catalog/tmp/a.jpg', 'CATALOG_IMAGE');
    const created = await t.catalog.create({
      data: { ...CATALOG, imageKey: 'catalog/tmp/a.jpg' },
      reason: REASON,
      actor,
    });
    await t.adminUpload('catalog/tmp/b.jpg', 'CATALOG_IMAGE');
    const updated = await t.catalog.update({
      id: created.id,
      patch: { imageKey: 'catalog/tmp/b.jpg', active: false },
      reason: REASON,
      actor,
    });
    expect(updated).toMatchObject({ imageKey: `catalog/${created.id}/image?v=2`, active: false });
    expect(t.audits[1]).toMatchObject({
      before: { imageKey: `catalog/${created.id}/image?v=1` },
      after: { imageKey: `catalog/${created.id}/image?v=2` },
    });
    expect(
      t.kit.uploadsModel.docs.filter((d) => d['key'] === `catalog/${created.id}/image`),
    ).toHaveLength(1);
    // The dashboard sends back what it read: nothing is copied.
    const copies = t.storage.copies;
    await t.catalog.update({
      id: created.id,
      patch: { imageKey: updated.imageKey },
      reason: REASON,
      actor,
    });
    expect(t.storage.copies).toBe(copies);
  });

  it("refuses an image that is not an admin's confirmed upload and creates nothing", async () => {
    const t = setup();
    await t.adminUpload('catalog/tmp/merchant.jpg', 'CATALOG_IMAGE', 'MEMBER');
    await expect(
      t.catalog.create({
        data: { ...CATALOG, imageKey: 'catalog/tmp/merchant.jpg' },
        reason: REASON,
        actor,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(t.catalogModel.docs).toHaveLength(0);
    expect(t.audits).toHaveLength(0);
  });
});

describe('admin banner images: one slot per language (SRV-182)', () => {
  const BANNER = {
    title: { ar: 'عرض', en: 'Offer' },
    audience: 'BOTH',
    action: 'NONE',
    order: 1,
    active: true,
    startAt: new Date('2026-11-01T00:00:00.000Z'),
    endAt: new Date('2026-12-01T00:00:00.000Z'),
  } as const;

  it('places ar and en in their own slots; changing one keeps the other', async () => {
    const t = setup();
    await t.adminUpload('banners/tmp/ar.jpg', 'BANNER_IMAGE');
    await t.adminUpload('banners/tmp/en.jpg', 'BANNER_IMAGE');
    const created = await t.banners.create({
      data: {
        ...BANNER,
        imageKey: { ar: 'banners/tmp/ar.jpg', en: 'banners/tmp/en.jpg' },
      },
      reason: REASON,
      actor,
    });
    expect(created.imageKey).toEqual({
      ar: `banners/${created.id}/image-ar?v=1`,
      en: `banners/${created.id}/image-en?v=1`,
    });
    await t.adminUpload('banners/tmp/ar2.jpg', 'BANNER_IMAGE');
    const updated = await t.banners.update({
      id: created.id,
      patch: { imageKey: { ar: 'banners/tmp/ar2.jpg', en: created.imageKey.en } },
      reason: REASON,
      actor,
    });
    expect(updated.imageKey).toEqual({
      ar: `banners/${created.id}/image-ar?v=2`,
      en: `banners/${created.id}/image-en?v=1`,
    });
  });

  it('a rule violation copies nothing (rules run before the images)', async () => {
    const t = setup();
    await t.adminUpload('banners/tmp/ar.jpg', 'BANNER_IMAGE');
    await t.adminUpload('banners/tmp/en.jpg', 'BANNER_IMAGE');
    await expect(
      t.banners.create({
        data: {
          ...BANNER,
          endAt: new Date('2026-10-01T00:00:00.000Z'),
          imageKey: { ar: 'banners/tmp/ar.jpg', en: 'banners/tmp/en.jpg' },
        },
        reason: REASON,
        actor,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(t.storage.copies).toBe(0);
    expect(t.bannersModel.docs).toHaveLength(0);
  });
});
