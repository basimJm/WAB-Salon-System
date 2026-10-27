import { createStorage } from '@wab/storage';
import { DEMO_BRANCHES } from '../src/constants/demoSeed';
import { FAKE_STORAGE_CDN_BASE_URL } from '../src/constants/providers';
import { SEED_COUNTRIES } from '../src/constants/referenceData';
import { UPLOAD_POLICIES } from '../src/constants/uploads';
import { variantKeys } from '../src/domain/uploads/variants';
import { ensureDemoBranchStaffPhotos, type DemoStaffPhoto } from '../src/seeds/demo/branchPhotos';
import { buildDemoBranches } from '../src/seeds/demo/branches';
import type { DemoDoc } from '../src/seeds/demo/types';
import { isDemoImagePurpose, type DemoImageTarget } from '../src/seeds/demoImages';
import {
  createDevSeedSteps,
  DEV_SEED_SKIPPED,
  formatDevSeedSummary,
  runDevSeed,
  summarizeDevSeed,
  type DevSeedSteps,
} from '../src/seeds/devSeed';
import { seedDemoOnStart } from '../src/seeds/demoOnStart';
import type { DemoDataReport } from '../src/seeds/runDemo';
import { seedDemoImages, type DemoImagesReport } from '../src/seeds/runDemoImages';
import { createLogger } from '../src/utils/logger';
import {
  EMPTY_DEV_SEED_REPORT,
  base,
  context,
  memoryModels,
  sources,
} from './helpers/demoFixtures';

// SRV-173: one command fills a development database: data, branches, images, reports.
const silent = createLogger({ level: 'silent' });
const recordingLogger = (): { logger: typeof silent; warnings: string[] } => {
  const warnings: string[] = [];
  const logger = createLogger({ level: 'silent' });
  logger.warn = (message: unknown) => {
    warnings.push(String(message));
  };
  return { logger, warnings };
};

const count = { created: 1, existing: 0 };
const DEMO: DemoDataReport = {
  catalog: { created: 30, existing: 0 },
  written: { Salon: { created: 10, existing: 0 }, Upload: { created: 5, existing: 0 } } as never,
  branches: {},
  extraBranches: { written: ['lamar:khalda'], skipped: [] },
  branchStaffPhotos: { uploads: { created: 3, existing: 0 }, photoKeysSet: 0 },
  timeZone: 'Asia/Amman',
  now: new Date('2026-10-27T09:00:00.000Z'),
};
const IMAGES: DemoImagesReport = {
  images: { uploaded: 0, placeholders: 7, placeholdersByPurpose: {}, existing: 2 },
  flags: { uploaded: 1, unchanged: 0, missing: [] },
};

const recordingSteps = (
  admin: 'created' | 'existing' | 'skipped',
  withImages = true,
): { steps: DevSeedSteps; calls: string[] } => {
  const calls: string[] = [];
  const steps: DevSeedSteps = {
    reference: () => {
      calls.push('reference');
      return Promise.resolve({ countries: count, cities: count, areas: count });
    },
    admin: () => {
      calls.push('admin');
      return Promise.resolve(admin);
    },
    demo: () => {
      calls.push('demo');
      return Promise.resolve(DEMO);
    },
    ...(withImages
      ? {
          images: () => {
            calls.push('images');
            return Promise.resolve(IMAGES);
          },
        }
      : {}),
    reports: (demo) => {
      calls.push(`reports:${demo.timeZone}`);
      return Promise.resolve(14);
    },
  };
  return { steps, calls };
};

describe('runDevSeed (composition)', () => {
  it('runs reference → admin → demo data → images → reports, in that order', async () => {
    const { steps, calls } = recordingSteps('existing');
    const report = await runDevSeed(steps, silent);
    expect(calls).toEqual(['reference', 'admin', 'demo', 'images', 'reports:Asia/Amman']);
    expect(report).toMatchObject({ admin: 'existing', demo: DEMO, images: IMAGES, reports: 14 });
  });

  it('without an admin the demo parts are skipped with a warning; reference and images still run', async () => {
    const { steps, calls } = recordingSteps('skipped');
    const { logger, warnings } = recordingLogger();
    const report = await runDevSeed(steps, logger);
    expect(calls).toEqual(['reference', 'admin', 'images']);
    expect(report).toMatchObject({ demo: DEV_SEED_SKIPPED, reports: DEV_SEED_SKIPPED });
    expect(warnings.join('\n')).toContain('ADMIN_EMAIL');
  });

  it('without storage the images are skipped with a warning and the data is still seeded', async () => {
    const { steps, calls } = recordingSteps('created', false);
    const { logger, warnings } = recordingLogger();
    const report = await runDevSeed(steps, logger);
    expect(calls).toEqual(['reference', 'admin', 'demo', 'reports:Asia/Amman']);
    expect(report.images).toBe(DEV_SEED_SKIPPED);
    expect(warnings.join('\n')).toContain('STORAGE_PROVIDER=real');
  });

  it('the real steps have no image part unless storage is given', () => {
    expect(createDevSeedSteps({ logger: silent, env: {} }).images).toBeUndefined();
    const storage = createStorage({
      environment: 'dev',
      provider: 'memory',
      cdn: { baseUrl: FAKE_STORAGE_CDN_BASE_URL },
    });
    expect(createDevSeedSteps({ logger: silent, env: {}, storage }).images).toBeInstanceOf(
      Function,
    );
  });

  it('prints counts per part and never the admin credentials', async () => {
    const { steps } = recordingSteps('created');
    const lines = formatDevSeedSummary(summarizeDevSeed(await runDevSeed(steps, silent)));
    expect(lines).toEqual([
      'reference data: 3 created, 0 already there',
      'admin: created',
      'demo catalog: 30 created, 0 already there',
      'demo data rows: 18 created, 0 already there',
      'extra branches: 1 written, 0 already there, 0 staff photo keys added',
      'demo images: 0 photos, 7 placeholders, 2 already stored',
      'country flags: 1 written, 0 unchanged, 0 without a shipped file',
      'daily reports: 14',
    ]);
    const skipped = formatDevSeedSummary(summarizeDevSeed(EMPTY_DEV_SEED_REPORT));
    expect(skipped).toContain('demo images: skipped (no storage)');
    expect(skipped).toContain('daily reports: skipped');
  });
});

describe('demo images for every demo key (real @wab/storage memory adapter)', () => {
  const branches = buildDemoBranches(context, sources);
  const targets: DemoImageTarget[] = [...base.Upload, ...branches.Upload].flatMap((row) => {
    const key = String(row['key']);
    const purpose = String(row['purpose']);
    return isDemoImagePurpose(purpose) ? [{ key, purpose }] : [];
  });
  const branchStaffKeys = branches.Member.map((member) => String(member['photoKey']));

  it('branch staff carry a photo key with a confirmed upload record', () => {
    expect(branches.Member.length).toBeGreaterThan(0);
    expect(new Set(DEMO_BRANCHES.map((spec) => spec.salon)).size).toBe(sources.size);
    for (const key of branchStaffKeys) {
      expect(key).toMatch(/^demo\/members\/.+-staff\d+\.jpg$/);
      expect(targets).toContainEqual({ key, purpose: 'MEMBER_PHOTO' });
    }
  });

  it('writes every key (incl. branch staff), thumbnails and flags once; a second run writes nothing', async () => {
    const storage = createStorage({
      environment: 'dev',
      provider: 'memory',
      cdn: { baseUrl: FAKE_STORAGE_CDN_BASE_URL },
    });
    const written: string[] = [];
    const write = storage.write.bind(storage);
    const recording = {
      read: storage.read.bind(storage),
      write: (request: Parameters<typeof write>[0]): Promise<void> => {
        written.push(request.key);
        return write(request);
      },
    };
    const first = await seedDemoImages({
      storage: recording,
      logger: silent,
      targets: () => Promise.resolve(targets),
    });
    expect(first.images).toMatchObject({ uploaded: 0, placeholders: targets.length, existing: 0 });
    expect(first.flags).toEqual({ uploaded: SEED_COUNTRIES.length, unchanged: 0, missing: [] });
    for (const target of targets) {
      expect(await storage.read(target.key)).not.toBeNull();
      if (UPLOAD_POLICIES[target.purpose].visibility === 'PUBLIC') {
        for (const variant of variantKeys(target.key))
          expect(await storage.read(variant)).not.toBeNull();
      }
    }
    for (const key of branchStaffKeys) expect(written).toContain(key);
    for (const country of SEED_COUNTRIES) expect(written).toContain(country.flagKey);

    written.length = 0;
    const second = await seedDemoImages({
      storage: recording,
      logger: silent,
      targets: () => Promise.resolve(targets),
    });
    expect(written).toEqual([]);
    expect(second.images).toMatchObject({ placeholders: 0, existing: targets.length });
    expect(second.flags).toEqual({ uploaded: 0, unchanged: SEED_COUNTRIES.length, missing: [] });
  }, 120_000);
});

describe('branch staff photos on branches an earlier seed wrote (insert-only)', () => {
  it('adds the upload records and fills missing photo keys; a second run adds nothing', async () => {
    const branches = buildDemoBranches(context, sources);
    const models = memoryModels();
    const withoutPhoto = new Set(branches.Member.map((member) => member._id.toString()));
    const store = {
      calls: [] as (readonly DemoStaffPhoto[])[],
      setMissingPhotoKeys(rows: readonly DemoStaffPhoto[]): Promise<number> {
        this.calls.push(rows);
        let changed = 0;
        for (const row of rows) if (withoutPhoto.delete(row.id.toString())) changed += 1;
        return Promise.resolve(changed);
      },
    };
    const first = await ensureDemoBranchStaffPhotos(branches, models, store);
    expect(first.uploads).toEqual({ created: branches.Upload.length, existing: 0 });
    expect(first.photoKeysSet).toBe(branches.Member.length);
    expect(store.calls[0]?.map((row) => row.photoKey)).toEqual(
      branches.Member.map((member: DemoDoc) => member['photoKey']),
    );
    const second = await ensureDemoBranchStaffPhotos(branches, models, store);
    expect(second).toEqual({
      uploads: { created: 0, existing: branches.Upload.length },
      photoKeysSet: 0,
    });
    expect(models.get('Member')?.rows.size).toBe(0);
  });
});

describe('SEED_DEMO_ON_START runs the full dev seed (never throws)', () => {
  const config = { isProduction: false, demoSeed: { onStart: true } };

  it('logs a count summary of the run', async () => {
    const infos: unknown[] = [];
    const logger = createLogger({ level: 'silent' });
    logger.info = (payload: unknown) => {
      infos.push(payload);
    };
    const seed = jest.fn().mockResolvedValue(EMPTY_DEV_SEED_REPORT);
    expect(await seedDemoOnStart({ config, logger, databaseName: 'wab', seed })).toBe('seeded');
    expect(infos).toContainEqual({ summary: summarizeDevSeed(EMPTY_DEV_SEED_REPORT) });
  });

  it('a failing run (e.g. no database) is logged, not thrown', async () => {
    const seed = jest.fn().mockRejectedValue(new Error('connection lost'));
    await expect(
      seedDemoOnStart({ config, logger: silent, databaseName: 'wab', seed }),
    ).resolves.toBe('failed');
  });

  it('under production rules it is refused unless SEED_DEMO_DATABASE names the database', async () => {
    const seed = jest.fn().mockResolvedValue(EMPTY_DEV_SEED_REPORT);
    const production = { isProduction: true, demoSeed: { onStart: true } };
    expect(
      await seedDemoOnStart({ config: production, logger: silent, databaseName: 'wab', seed }),
    ).toBe('refused');
    const hostedDev = {
      isProduction: true,
      demoSeed: { onStart: true, allowedDatabase: 'wab-dev' },
    };
    expect(
      await seedDemoOnStart({ config: hostedDev, logger: silent, databaseName: 'wab-prod', seed }),
    ).toBe('refused');
    expect(seed).not.toHaveBeenCalled();
    expect(
      await seedDemoOnStart({ config: hostedDev, logger: silent, databaseName: 'wab-dev', seed }),
    ).toBe('seeded');
  });
});
