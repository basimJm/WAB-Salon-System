import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

interface Step {
  uses?: string;
  run?: string;
  name?: string;
  with?: Record<string, unknown>;
}
interface Job {
  steps: Step[];
  'runs-on': string;
  'timeout-minutes'?: number;
}
interface Workflow {
  on: {
    pull_request: { paths: string[] };
    push: { branches: string[]; paths: string[] };
  };
  permissions: Record<string, string>;
  concurrency: { 'cancel-in-progress': boolean };
  defaults: { run: { 'working-directory': string } };
  jobs: Record<string, Job>;
}

const file = join(__dirname, '..', '..', '.github', 'workflows', 'server-ci.yml');
const text = readFileSync(file, 'utf8');
const workflow = parse(text) as Workflow;
const commands = (job: Job | undefined): string[] =>
  (job?.steps ?? []).flatMap((step) => (step.run === undefined ? [] : [step.run]));

describe('server CI workflow (SRV-010)', () => {
  it('runs on pull requests and on main, only when the server changes', () => {
    expect(workflow.on.pull_request.paths).toContain('WAB-Server/**');
    expect(workflow.on.push.branches).toEqual(['main']);
    expect(workflow.on.push.paths).toContain('WAB-Server/**');
    expect(workflow.on.push.paths).toContain('.github/workflows/server-ci.yml');
  });

  it('has read-only permissions, cancels superseded runs and works inside WAB-Server', () => {
    expect(workflow.permissions).toEqual({ contents: 'read' });
    expect(workflow.concurrency['cancel-in-progress']).toBe(true);
    expect(workflow.defaults.run['working-directory']).toBe('WAB-Server');
  });

  it('verifies with the same commands a contributor runs locally', () => {
    const run = commands(workflow.jobs['verify']);
    for (const command of [
      'npm ci',
      'npm run typecheck',
      'npm run lint',
      'npm run format:check',
      'npm test',
      'npm run build',
    ]) {
      expect(run).toContain(command);
    }
  });

  it('audits production dependencies and fails on high severity', () => {
    expect(commands(workflow.jobs['verify'])).toContain('npm audit --omit=dev --audit-level=high');
  });

  it('uses the Node version the project requires', () => {
    const setup = workflow.jobs['verify']?.steps.find((s) =>
      s.uses?.startsWith('actions/setup-node'),
    );
    expect(setup?.with?.['node-version']).toBe(22);
    const engines = (
      JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')) as {
        engines: { node: string };
      }
    ).engines.node;
    expect(engines).toBe('>=22');
  });

  it('scans the full history for secrets', () => {
    const steps = workflow.jobs['secret-scan']?.steps ?? [];
    expect(steps.some((s) => s.uses?.startsWith('gitleaks/gitleaks-action'))).toBe(true);
    const checkout = steps.find((s) => s.uses?.startsWith('actions/checkout'));
    expect(checkout?.with?.['fetch-depth']).toBe(0);
  });

  it('gives every job a timeout', () => {
    for (const job of Object.values(workflow.jobs)) {
      expect(job['timeout-minutes']).toBeGreaterThan(0);
    }
  });

  it('contains no inline secrets, only the built-in token', () => {
    const secretReferences = [...text.matchAll(/\$\{\{\s*secrets\.([A-Z_]+)\s*\}\}/g)].map(
      (m) => m[1],
    );
    expect(secretReferences.every((name) => name === 'GITHUB_TOKEN')).toBe(true);
    expect(text).not.toMatch(/(password|token|key)\s*:\s*[A-Za-z0-9+/]{16,}/i);
  });
});
