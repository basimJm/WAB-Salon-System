export interface BuildFile {
  name: string;
  /** Gzip size in bytes. */
  gzip: number;
  content?: string;
}

export interface Budget {
  entryJsGzipKb: number;
  chunkJsGzipKb: number;
  totalJsGzipKb: number;
  cssGzipKb: number;
}

const KB = 1024;
/** Strings that must never reach a production bundle, with what each one gives away. */
export const PROD_FORBIDDEN_MARKERS: ReadonlyArray<{ marker: string; what: string }> = [
  { marker: 'MockAuthRepository', what: 'mock code' },
  { marker: 'mock-access-token', what: 'mock code' },
  { marker: 'wab-env-ribbon', what: 'the DEV ribbon' },
];

export interface BuildCheckInput {
  files: readonly BuildFile[];
  indexHtml: string;
  variant: string;
  budget: Budget;
}

/** Performance + security gate for one built variant. Returns human-readable problems. */
export function checkBuild({ files, indexHtml, variant, budget }: BuildCheckInput): string[] {
  const problems: string[] = [];
  const js = files.filter((f) => f.name.endsWith('.js'));
  const css = files.filter((f) => f.name.endsWith('.css'));
  const kb = (n: number) => (n / KB).toFixed(1);
  const isRelease = variant.endsWith('-release');

  const entry = js.find((f) => indexHtml.includes(f.name));
  if (!entry) problems.push('no entry script referenced by index.html');
  // Debug builds are unminified on purpose: size budgets apply to release builds only.
  else if (isRelease && entry.gzip > budget.entryJsGzipKb * KB) {
    problems.push(
      `entry ${entry.name} is ${kb(entry.gzip)} KB gzip (budget ${budget.entryJsGzipKb})`,
    );
  }
  for (const f of js) {
    if (isRelease && f !== entry && f.gzip > budget.chunkJsGzipKb * KB) {
      problems.push(`chunk ${f.name} is ${kb(f.gzip)} KB gzip (budget ${budget.chunkJsGzipKb})`);
    }
  }
  const totalJs = js.reduce((sum, f) => sum + f.gzip, 0);
  if (isRelease && totalJs > budget.totalJsGzipKb * KB)
    problems.push(`total JS ${kb(totalJs)} KB gzip (budget ${budget.totalJsGzipKb})`);
  const totalCss = css.reduce((sum, f) => sum + f.gzip, 0);
  if (isRelease && totalCss > budget.cssGzipKb * KB)
    problems.push(`total CSS ${kb(totalCss)} KB gzip (budget ${budget.cssGzipKb})`);

  if (isRelease && files.some((f) => f.name.endsWith('.map')))
    problems.push('release build ships source maps');
  if (variant.startsWith('prod')) {
    for (const f of js) {
      const hit = PROD_FORBIDDEN_MARKERS.find(({ marker }) => f.content?.includes(marker));
      if (hit) problems.push(`prod build contains ${hit.what} ("${hit.marker}" in ${f.name})`);
    }
  }
  return problems;
}
