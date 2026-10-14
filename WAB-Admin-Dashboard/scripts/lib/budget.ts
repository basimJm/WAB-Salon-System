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
const GALLERY_CHUNK = 'DesignSystemPage';
/** Strings that must never reach a production bundle, with what each one gives away. */
export const PROD_FORBIDDEN_MARKERS: ReadonlyArray<{
  marker: string;
  what: string;
  /** Only release builds are minified and tree-shaken, so debug builds may still hold dead code. */
  releaseOnly?: boolean;
}> = [
  { marker: 'MockAuthRepository', what: 'mock code' },
  { marker: 'mock-access-token', what: 'mock code' },
  { marker: 'wab-env-ribbon', what: 'the DEV ribbon' },
  { marker: 'designKits', what: 'design-system gallery strings', releaseOnly: true },
];

export interface BuildCheckInput {
  files: readonly BuildFile[];
  indexHtml: string;
  variant: string;
  budget: Budget;
}

const kb = (n: number) => (n / KB).toFixed(1);
const gzipSum = (files: readonly BuildFile[]) => files.reduce((sum, f) => sum + f.gzip, 0);

/** What users download: the dev-only gallery chunk is excluded (prod builds are proven not to contain it). */
const shipped = (js: readonly BuildFile[]): BuildFile[] =>
  js.filter((f) => !f.name.includes(GALLERY_CHUNK));

/** Size budgets (release builds only: debug builds are unminified on purpose). */
function sizeProblems(
  js: readonly BuildFile[],
  css: readonly BuildFile[],
  entry: BuildFile | undefined,
  budget: Budget,
): string[] {
  const problems: string[] = [];
  if (entry && entry.gzip > budget.entryJsGzipKb * KB) {
    problems.push(
      `entry ${entry.name} is ${kb(entry.gzip)} KB gzip (budget ${budget.entryJsGzipKb})`,
    );
  }
  for (const f of js) {
    if (f !== entry && f.gzip > budget.chunkJsGzipKb * KB) {
      problems.push(`chunk ${f.name} is ${kb(f.gzip)} KB gzip (budget ${budget.chunkJsGzipKb})`);
    }
  }
  const totalJs = gzipSum(js);
  if (totalJs > budget.totalJsGzipKb * KB)
    problems.push(`total JS ${kb(totalJs)} KB gzip (budget ${budget.totalJsGzipKb})`);
  const totalCss = gzipSum(css);
  if (totalCss > budget.cssGzipKb * KB)
    problems.push(`total CSS ${kb(totalCss)} KB gzip (budget ${budget.cssGzipKb})`);
  return problems;
}

/** Strings that must never reach a production bundle. */
function prodMarkerProblems(js: readonly BuildFile[], isRelease: boolean): string[] {
  return js.flatMap((f) => {
    const hit = PROD_FORBIDDEN_MARKERS.find(
      ({ marker, releaseOnly }) => (isRelease || !releaseOnly) && f.content?.includes(marker),
    );
    return hit ? [`prod build contains ${hit.what} ("${hit.marker}" in ${f.name})`] : [];
  });
}

/** The design-system gallery is a dev tool: no emitted file of a prod build may be its page chunk. */
function prodGalleryProblems(js: readonly BuildFile[]): string[] {
  return js
    .filter((f) => f.name.includes(GALLERY_CHUNK))
    .map((f) => `prod build ships the design-system gallery (${f.name})`);
}

/** Performance + security gate for one built variant. Returns human-readable problems. */
export function checkBuild({ files, indexHtml, variant, budget }: BuildCheckInput): string[] {
  const js = files.filter((f) => f.name.endsWith('.js'));
  const css = files.filter((f) => f.name.endsWith('.css'));
  const isRelease = variant.endsWith('-release');
  const entry = js.find((f) => indexHtml.includes(f.name));

  return [
    ...(entry ? [] : ['no entry script referenced by index.html']),
    ...(isRelease ? sizeProblems(shipped(js), css, entry, budget) : []),
    ...(isRelease && files.some((f) => f.name.endsWith('.map'))
      ? ['release build ships source maps']
      : []),
    ...(variant.startsWith('prod') ? prodMarkerProblems(js, isRelease) : []),
    ...(variant.startsWith('prod') ? prodGalleryProblems(js) : []),
  ];
}
