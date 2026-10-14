import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BUILD_VARIANTS } from '@/constants/env';
import pkg from '../package.json';

const workflow = readFileSync(join(process.cwd(), '..', '.github/workflows/admin-ci.yml'), 'utf8');
const playwrightConfig = readFileSync(join(process.cwd(), 'playwright.config.ts'), 'utf8');
const projectNames = [...playwrightConfig.matchAll(/name: '([\w-]+)'/g)].map((m) => m[1] as string);

describe('admin CI workflow', () => {
  it('runs on pull requests and pushes to main and admin, only for admin changes, with a read-only token', () => {
    expect(workflow).toMatch(/pull_request:\s+paths:\s+- "WAB-Admin-Dashboard\/\*\*"/);
    expect(workflow).toMatch(/push:\s+branches: \[main, admin\]/);
    expect(workflow).toMatch(/^permissions:\s+contents: read/m);
    expect(workflow).toContain('cancel-in-progress: true');
  });

  it('every job has a timeout', () => {
    const jobs = workflow.split(/^jobs:\n/m)[1] ?? '';
    const jobCount = (jobs.match(/^ {2}[\w-]+:\n/gm) ?? []).length;
    expect((jobs.match(/timeout-minutes:/g) ?? []).length).toBe(jobCount);
  });

  it('builds exactly the four variants and checks the bundle for each', () => {
    for (const v of BUILD_VARIANTS) expect(workflow).toContain(v);
    expect(workflow).toContain('npm run build:${{ matrix.variant }}');
    expect(workflow).toContain('npm run check:size -- ${{ matrix.variant }}');
    for (const v of BUILD_VARIANTS) expect(pkg.scripts).toHaveProperty(`build:${v}`);
  });

  it('runs every quality gate from package.json', () => {
    for (const step of ['typecheck', 'lint', 'format:check', 'check:hardcoded']) {
      expect(workflow).toContain(`npm run ${step}`);
      expect(pkg.scripts).toHaveProperty(step);
    }
    expect(workflow).toContain('npm test');
    expect(workflow).toContain('npm audit --omit=dev --audit-level=high');
    expect(workflow).toContain('gitleaks/gitleaks-action');
  });

  it('e2e covers Android-class (chromium) and iOS-class (webkit), portrait and landscape', () => {
    expect(workflow).toContain('browser: chromium');
    expect(workflow).toContain('browser: webkit');
    const used = [...workflow.matchAll(/--project=([\w-]+)/g)].map((m) => m[1]);
    expect([...new Set(used)].sort()).toEqual([...projectNames].sort());
    expect(projectNames).toEqual(
      expect.arrayContaining([
        'android-portrait',
        'android-landscape',
        'ios-portrait',
        'ios-landscape',
      ]),
    );
  });

  it('references no secrets other than the built-in token and no real hosts', () => {
    const secrets = [...workflow.matchAll(/secrets\.(\w+)/g)].map((m) => m[1]);
    expect(new Set(secrets)).toEqual(new Set(['GITHUB_TOKEN']));
    expect(workflow).not.toMatch(/https?:\/\/(?!(?:api|socket)\.ci\.invalid)/);
  });

  it('requires Node 22 like the server', () => {
    expect(pkg.engines.node).toBe('>=22');
  });
});
