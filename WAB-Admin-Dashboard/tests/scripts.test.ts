import { describe, expect, it } from 'vitest';
import budget from '../scripts/budget.json';
import { checkBuild, type BuildFile } from '../scripts/lib/budget.ts';
import { lineCount, overLimit, scanSource } from '../scripts/lib/hardcoded.ts';

const rules = (file: string, code: string) => scanSource(file, code).map((f) => f.rule);

describe('hardcoded scanner', () => {
  it('flags URLs, IPs, colors and secrets in code', () => {
    expect(rules('src/a.ts', "const u = 'https://api.example.com/v1';")).toContain('url');
    expect(rules('src/a.ts', "const h = '10.0.0.12';")).toContain('ip-address');
    expect(rules('src/a.ts', "const c = '#6D28D9';")).toContain('hex-color');
    expect(rules('src/a.ts', 'const c = `rgba(1,2,3,.4)`;')).toContain('color-function');
    expect(rules('src/a.ts', "const apiKey = 'abcd1234efgh5678';")).toContain('secret');
    expect(rules('src/a.ts', 'setTimeout(fn, 4000);')).toContain('timer-literal');
  });

  it('flags user-visible text in JSX but not expressions or translated text', () => {
    expect(rules('src/a.tsx', '<span>Hello</span>')).toContain('jsx-text');
    expect(rules('src/a.tsx', '<span>مرحبا</span>')).toContain('jsx-text');
    expect(rules('src/a.tsx', '<input aria-label="Search" />')).toContain('jsx-attribute-text');
    expect(rules('src/a.tsx', "<span>{t('a.b')}</span>")).toEqual([]);
    expect(rules('src/a.tsx', '<input aria-label={t("a")} />')).toEqual([]);
    expect(rules('src/a.ts', 'if (a > b && c < d) return;')).toEqual([]);
    expect(rules('src/a.ts', 'const x: Promise<void> = f<string>();')).toEqual([]);
  });

  it('flags raw lengths, colors and durations in CSS but allows tokens, zero and relative units', () => {
    expect(rules('src/a.css', '.a { padding: 8px; }')).toContain('css-length');
    expect(rules('src/a.css', '.a { margin: 1.5rem; }')).toContain('css-length');
    expect(rules('src/a.css', '.a { transition: all 200ms; }')).toContain('css-length');
    expect(rules('src/a.css', '.a { color: #fff; }')).toContain('hex-color');
    expect(
      rules('src/a.css', '.a { padding: var(--space-3); margin: 0; width: 100%; height: 100dvh; }'),
    ).toEqual([]);
    expect(rules('src/a.css', '.a { animation-duration: 0s !important; }')).toEqual([]);
  });

  it('exempts constants, tokens, locales and honors the allow marker and comments', () => {
    expect(rules('src/constants/x.ts', "export const U = 'https://x.dev';")).toEqual([]);
    expect(rules('src/design/tokens/colors.ts', "export const C = '#fff';")).toEqual([]);
    expect(rules('src/a.ts', "const u = 'https://x.dev'; // hardcoded-ok: docs link")).toEqual([]);
    expect(rules('src/a.ts', '// see https://x.dev')).toEqual([]);
    expect(rules('src/a.json', 'https://x.dev')).toEqual([]);
  });

  it('counts lines and reports files over the limit', () => {
    expect(lineCount('a\nb\n')).toBe(2);
    expect(lineCount('a\nb')).toBe(2);
    const files = [
      { file: 'a', content: 'x\n'.repeat(301) },
      { file: 'b', content: 'x\n'.repeat(300) },
    ];
    expect(overLimit(files, 300)).toEqual([{ file: 'a', lines: 301 }]);
  });
});

const KB = 1024;
const file = (name: string, kb: number, content = ''): BuildFile => ({
  name,
  gzip: kb * KB,
  content,
});
const html = '<script src="/assets/index-abc.js"></script>';
const run = (files: BuildFile[], variant = 'prod-release') =>
  checkBuild({ files, indexHtml: html, variant, budget });

describe('bundle gate', () => {
  it('passes a lean build', () => {
    expect(
      run([
        file('index-abc.js', budget.entryJsGzipKb - 1),
        file('Login-1.js', 10),
        file('app.css', 5),
      ]),
    ).toEqual([]);
  });

  it('fails on oversized entry, chunk, total JS and CSS', () => {
    expect(run([file('index-abc.js', budget.entryJsGzipKb + 1)]).join()).toContain('entry');
    expect(
      run([file('index-abc.js', 10), file('big-1.js', budget.chunkJsGzipKb + 1)]).join(),
    ).toContain('chunk');
    const many = Array.from({ length: 6 }, (_, i) => file(`c${i}.js`, budget.chunkJsGzipKb - 1));
    expect(run([file('index-abc.js', 10), ...many]).join()).toContain('total JS');
    expect(run([file('index-abc.js', 10), file('a.css', budget.cssGzipKb + 1)]).join()).toContain(
      'CSS',
    );
  });

  it('debug builds are exempt from size budgets only', () => {
    expect(run([file('index-abc.js', budget.entryJsGzipKb + 50)], 'dev-debug')).toEqual([]);
    expect(run([file('index-abc.js', budget.entryJsGzipKb + 50)], 'dev-release').join()).toContain(
      'entry',
    );
  });

  it('fails when no entry is referenced', () => {
    expect(run([file('other.js', 1)]).join()).toContain('no entry');
  });

  it('release builds must not ship source maps; debug builds may', () => {
    const files = [file('index-abc.js', 10), file('index-abc.js.map', 50)];
    expect(run(files, 'dev-release').join()).toContain('source maps');
    expect(run(files, 'dev-debug')).toEqual([]);
  });

  it('prod builds must not contain mock code; dev builds may', () => {
    const files = [file('index-abc.js', 10, 'class MockAuthRepository {}')];
    expect(run(files, 'prod-release').join()).toContain('mock code');
    expect(run(files, 'prod-debug').join()).toContain('mock code');
    expect(run(files, 'dev-release')).toEqual([]);
  });
});
