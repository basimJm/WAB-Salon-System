import { DEMO_BUSINESSES } from '../src/constants/demoBusinessTypes';
import { DEMO_SERVICES as DEMO_CATALOG } from '../src/constants/demoCatalog';
import { REFERENCE_IMAGE_URL_TTL_SEC } from '../src/constants/bookings';
import { BUSINESS_TYPES } from '../src/constants/enums';
import { SLOT_KEYS, SLOT_PURPOSES, UPLOAD_POLICIES } from '../src/constants/uploads';
import {
  audienceFor,
  brideAllowed,
  catalogFits,
  isWidening,
  personFits,
} from '../src/domain/businessTypes/rules';
import {
  assertReferenceImages,
  createReferenceImageMover,
  referenceImageUrl,
} from '../src/domain/bookings/referenceImages';
import { createCatalogSchema } from '../src/modules/admin/catalog/catalog.validation';
import { buildDemoBusinesses, demoBusinessId } from '../src/seeds/demo/businessTypes';
import { BusinessRuleError } from '../src/utils/errors';
import { createLogger } from '../src/utils/logger';
import { context } from './helpers/demoFixtures';

const logger = createLogger({ level: 'silent' });
const TATTOO = { businessType: 'TATTOO', audience: 'BOTH' } as const;

describe('TATTOO business type (BUSINESS_DOMAIN §5.23)', () => {
  it('is a business type, always for everyone, mixed persons, never a bride', () => {
    expect(BUSINESS_TYPES).toContain('TATTOO');
    expect(audienceFor('TATTOO', 'MALE')).toBe('BOTH');
    expect(audienceFor('TATTOO', 'FEMALE')).toBe('BOTH');
    expect(personFits(TATTOO, 'MALE') && personFits(TATTOO, 'FEMALE')).toBe(true);
    expect(brideAllowed(TATTOO)).toBe(false);
    expect(isWidening('BOTH', 'BOTH')).toBe(false);
  });

  it('offers only tattoo catalog services (piercing exists per type when admin adds it)', () => {
    const piercing = { businessType: 'TATTOO', audience: 'BOTH' } as const;
    expect(catalogFits(piercing, TATTOO)).toBe(true);
    expect(catalogFits(piercing, { businessType: 'SALON', audience: 'BOTH' })).toBe(false);
    expect(catalogFits({ businessType: 'CLINIC', audience: 'BOTH' }, TATTOO)).toBe(false);
  });

  it('admin catalog: a TATTOO entry must be BOTH', () => {
    const base = {
      name: { ar: 'وشم', en: 'Tattoo' },
      description: { ar: 'وصف', en: 'Desc' },
      businessType: 'TATTOO',
      imageKey: 'catalog/tmp/ink.jpg',
      reason: 'New tattoo catalog entry',
    };
    expect(createCatalogSchema.safeParse({ ...base, audience: 'BOTH' }).success).toBe(true);
    const refused = createCatalogSchema.safeParse({ ...base, audience: 'MALE' });
    expect(refused.success).toBe(false);
    expect(refused.error?.issues[0]?.path).toEqual(['audience']);
  });
});

describe('design images of tattoo bookings (§5.23)', () => {
  it('BOOKING_REFERENCE is a private image (customer, or a member booking for one) with its own slot per booking person', () => {
    expect(UPLOAD_POLICIES.BOOKING_REFERENCE).toMatchObject({
      kind: 'image',
      visibility: 'PRIVATE',
      scopes: ['customer', 'merchant'],
      permission: 'BOOKINGS_CREATE',
    });
    expect(SLOT_PURPOSES).toContain('BOOKING_REFERENCE');
    expect(SLOT_KEYS.bookingReference('b1', 2)).toBe('bookings/b1/persons/2/reference');
  });

  it('only a TATTOO business takes them; keys are checked as BOOKING_REFERENCE uploads', async () => {
    const calls: unknown[] = [];
    const verifier = {
      assertConfirmed: (input: unknown): Promise<void> => {
        calls.push(input);
        return Promise.resolve();
      },
    };
    const accept = (): boolean => true;
    await assertReferenceImages({ businessType: 'SALON', keys: [undefined], verifier, accept });
    expect(calls).toHaveLength(0);
    await expect(
      assertReferenceImages({ businessType: 'CLINIC', keys: ['a/b.jpg'], verifier, accept }),
    ).rejects.toMatchObject({ code: 'BUSINESS_TYPE_MISMATCH' });
    await expect(
      assertReferenceImages({ businessType: 'SALON', keys: ['a/b.jpg'], verifier, accept }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
    await assertReferenceImages({
      businessType: 'TATTOO',
      keys: ['a/b.jpg', undefined, 'a/c.jpg'],
      verifier,
      accept,
    });
    expect(calls).toEqual([
      { keys: ['a/b.jpg', 'a/c.jpg'], purpose: 'BOOKING_REFERENCE', field: 'body.persons', accept },
    ]);
  });

  it('a new booking moves each image into its person slot; a failed move keeps the booking', async () => {
    const replaced: { key: string; incoming: string; ownerId: string; accepts: boolean }[] = [];
    const stored: [string, number, string][] = [];
    const booking = {
      id: 'bk1',
      customerId: 'c1',
      salonId: 's1',
      persons: [
        { referenceImageKey: 'bookings/reference/one.jpg' },
        {},
        { referenceImageKey: 'x/fail.jpg' },
      ],
    };
    const mover = createReferenceImageMover({
      slots: {
        replace: async (input) => {
          if (input.incoming === 'x/fail.jpg') throw new Error('copy failed');
          replaced.push({
            key: input.target.key,
            incoming: input.incoming,
            ownerId: input.target.ownerId,
            accepts:
              input.accept({ ownerType: 'CUSTOMER', ownerId: 'c1' } as never) &&
              !input.accept({ ownerType: 'CUSTOMER', ownerId: 'c2' } as never),
          });
          const ref = `${input.target.key}?v=1`;
          await input.commit(ref);
          return ref;
        },
      },
      bookings: {
        setPersonReference: (id, index, ref) => Promise.resolve(void stored.push([id, index, ref])),
      },
      logger,
    });
    await expect(mover.move(booking as never)).resolves.toBeUndefined();
    expect(replaced).toEqual([
      {
        key: 'bookings/bk1/persons/0/reference',
        incoming: 'bookings/reference/one.jpg',
        ownerId: 'c1',
        accepts: true,
      },
    ]);
    expect(stored).toEqual([['bk1', 0, 'bookings/bk1/persons/0/reference?v=1']]);
  });

  it('details show a short-lived signed URL, or null', async () => {
    const asked: unknown[] = [];
    const storage = {
      getSignedUrl: (input: { key: string; expiresInSec: number }): Promise<string> => {
        asked.push(input);
        return Promise.resolve(`signed:${input.key}`);
      },
    };
    await expect(referenceImageUrl(storage, undefined)).resolves.toBeNull();
    await expect(referenceImageUrl(storage, 'k?v=2')).resolves.toBe('signed:k?v=2');
    expect(asked).toEqual([{ key: 'k?v=2', expiresInSec: REFERENCE_IMAGE_URL_TTL_SEC }]);
  });
});

describe('demo tattoo studio (§5.23)', () => {
  it('the catalog has tattoo services, all for everyone', () => {
    const tattoo = DEMO_CATALOG.filter((c) => c.businessType === 'TATTOO');
    expect(tattoo.length).toBeGreaterThan(0);
    expect(tattoo.every((c) => c.audience === 'BOTH')).toBe(true);
    expect(tattoo.map((c) => c.name.en)).toContain('Piercing');
  });

  it('one LIVE tattoo studio with tattoo services only and no bride flags', () => {
    const spec = DEMO_BUSINESSES.find((b) => b.businessType === 'TATTOO');
    expect(spec?.audience).toBe('BOTH');
    const data = buildDemoBusinesses(context);
    const id = String(demoBusinessId(spec?.key ?? ''));
    const salon = data.Salon.find((s) => String(s['_id']) === id);
    expect(salon).toMatchObject({ businessType: 'TATTOO', audience: 'BOTH', state: 'LIVE' });
    const services = data.SalonService.filter((s) => String(s['salonId']) === id);
    expect(services.length).toBe(spec?.services.length);
    const tattooCatalog = new Set(
      context.catalog.filter((c) => c.businessType === 'TATTOO').map((c) => String(c.id)),
    );
    expect(services.every((s) => tattooCatalog.has(String(s['catalogServiceId'])))).toBe(true);
    expect(services.every((s) => s['brideOnly'] === false)).toBe(true);
  });
});
