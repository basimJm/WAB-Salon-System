import { basename, extname } from 'node:path';
import { DEMO_IMAGE_FOLDERS, DEMO_IMAGE_SOURCE_EXTENSIONS } from '../constants/demoSeed';

export type DemoImagePurpose = keyof typeof DEMO_IMAGE_FOLDERS;

export interface DemoImageTarget {
  readonly key: string;
  readonly purpose: DemoImagePurpose;
}
export interface DemoImageAssignment {
  readonly key: string;
  readonly purpose: DemoImagePurpose;
  /** Path of the photo, relative to the owner's folder. */
  readonly source: string;
}
export interface DemoImagePlan {
  readonly assignments: readonly DemoImageAssignment[];
  /** Keys left without a photo because their folder is empty or missing. */
  readonly missing: readonly DemoImageTarget[];
}

export const isDemoImagePurpose = (purpose: string): purpose is DemoImagePurpose =>
  Object.hasOwn(DEMO_IMAGE_FOLDERS, purpose);

const isPhoto = (file: string): boolean =>
  (DEMO_IMAGE_SOURCE_EXTENSIONS as readonly string[]).includes(extname(file).toLowerCase());
const stem = (file: string): string => basename(file, extname(file)).toLowerCase();

/**
 * Pairs every demo key with a photo: a photo with the key's file name wins, then the folder's
 * other photos are handed out in name order and reused when there are more keys than photos.
 * `files` maps a folder name to the photo file names it contains.
 */
export const planDemoImages = (
  targets: readonly DemoImageTarget[],
  files: ReadonlyMap<string, readonly string[]>,
): DemoImagePlan => {
  const assignments: DemoImageAssignment[] = [];
  const missing: DemoImageTarget[] = [];
  const turn = new Map<string, number>();
  for (const target of [...targets].sort((a, b) => a.key.localeCompare(b.key))) {
    const folder = DEMO_IMAGE_FOLDERS[target.purpose];
    const photos = [...(files.get(folder) ?? [])].filter(isPhoto).sort();
    if (photos.length === 0) {
      missing.push(target);
      continue;
    }
    const named = photos.find((photo) => stem(photo) === stem(target.key));
    const index = turn.get(folder) ?? 0;
    const photo = named ?? photos[index % photos.length] ?? '';
    if (named === undefined) turn.set(folder, index + 1);
    assignments.push({ key: target.key, purpose: target.purpose, source: `${folder}/${photo}` });
  }
  return { assignments, missing };
};
