import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { SOURCE_LAYOUT } from '../src/constants/layout';

const root = join(__dirname, '..');

describe('project layout (WAB-Server/CLAUDE.md §4)', () => {
  it.each(SOURCE_LAYOUT)('has src/%s', (dir) => {
    expect(existsSync(join(root, 'src', dir))).toBe(true);
  });
});

describe('TypeScript configuration', () => {
  const tsconfig = JSON.parse(readFileSync(join(root, 'tsconfig.json'), 'utf8')) as {
    compilerOptions: Record<string, unknown>;
  };

  it('is strict', () => {
    expect(tsconfig.compilerOptions['strict']).toBe(true);
  });

  it('fails on unchecked indexed access and unused code', () => {
    expect(tsconfig.compilerOptions['noUncheckedIndexedAccess']).toBe(true);
    expect(tsconfig.compilerOptions['noUnusedLocals']).toBe(true);
  });
});

describe('lint rules', () => {
  const eslintBin = join(root, 'node_modules', '.bin', 'eslint');
  const sampleFile = 'tests/project-layout.test.ts';

  // Runs the real ESLint CLI on a snippet (typed linting needs a real file path).
  const lint = (code: string): string[] => {
    const run = spawnSync(
      eslintBin,
      ['--stdin', '--stdin-filename', sampleFile, '--format', 'json'],
      { cwd: root, input: code, encoding: 'utf8' },
    );
    const [result] = JSON.parse(run.stdout) as { messages: { ruleId: string | null }[] }[];
    return (result?.messages ?? []).map((m) => m.ruleId ?? '');
  };

  it('rejects explicit any', () => {
    expect(lint('export const value: any = 1;\n')).toContain('@typescript-eslint/no-explicit-any');
  });

  it('rejects console usage', () => {
    expect(lint('console.log(1);\n')).toContain('no-console');
  });

  it('accepts unknown narrowed code', () => {
    const code =
      'export const isText = (value: unknown): value is string => typeof value === "string";\n';
    expect(lint(code)).toEqual([]);
  });
});
