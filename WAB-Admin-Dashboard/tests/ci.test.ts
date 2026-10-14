import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BUILD_VARIANTS } from '@/constants/env';
import pkg from '../package.json';

const workflow = readFileSync(join(process.cwd(), '..', '.github/workflows/admin-ci.yml'), 'utf8');

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

  it('installs from the lockfile, runs verify and builds exactly the four variants', () => {
    expect(workflow).toContain('npm ci');
    expect(workflow).toContain('npm run verify');
    expect(pkg.scripts).toHaveProperty('verify');
    for (const v of BUILD_VARIANTS) {
      expect(workflow).toContain(`npm run build:${v}`);
      expect(pkg.scripts).toHaveProperty(`build:${v}`);
    }
  });

  it('references no secrets and no real hosts', () => {
    expect(workflow).not.toMatch(/secrets\./);
    expect(workflow).not.toMatch(/https?:\/\/(?!(?:api|socket)\.ci\.invalid)/);
  });
});
