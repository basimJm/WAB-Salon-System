import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOT } from './helpers/files';

const DEPCRUISE = join(ROOT, 'node_modules/dependency-cruiser/bin/dependency-cruiser.mjs');
const CONFIG = join(ROOT, '.dependency-cruiser.cjs');
const TSCONFIG = JSON.stringify({
  compilerOptions: { module: 'ESNext', moduleResolution: 'Bundler' },
});

/** Builds a throwaway `src/` tree and returns the depcruise exit status (0 = clean). */
function cruise(files: Record<string, string>): number {
  const dir = mkdtempSync(join(tmpdir(), 'wab-layers-'));
  writeFileSync(join(dir, 'tsconfig.json'), TSCONFIG);
  for (const [path, code] of Object.entries(files)) {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), code);
  }
  try {
    execFileSync('node', [DEPCRUISE, 'src', '--config', CONFIG], { cwd: dir, stdio: 'pipe' });
    return 0;
  } catch (error) {
    return (error as { status?: number }).status ?? -1;
  }
}

describe('dependency-cruiser layer rules', () => {
  it('accepts imports that point inward', () => {
    expect(
      cruise({
        'src/domain/a.ts': 'export const a = 1;',
        'src/data/b.ts': "import { a } from '../domain/a'; export const b = a;",
      }),
    ).toBe(0);
  });

  it('rejects a layer importing a forbidden layer', () => {
    expect(
      cruise({
        'src/data/b.ts': 'export const b = 1;',
        'src/domain/a.ts': "import { b } from '../data/b'; export const a = b;",
      }),
    ).not.toBe(0);
  });

  it('rejects circular imports', () => {
    expect(
      cruise({
        'src/app/a.ts': "import { b } from './b'; export const a = b;",
        'src/app/b.ts': "import { a } from './a'; export const b = a;",
      }),
    ).not.toBe(0);
  });

  it('the real source tree is clean', () => {
    expect(() =>
      execFileSync('node', [DEPCRUISE, 'src', '--config', CONFIG], { cwd: ROOT, stdio: 'pipe' }),
    ).not.toThrow();
  });
});
