import type { Page, PageQuery } from '@/domain/shared/page';

export const EXPORT_KINDS = [
  'REPORT_DAILY',
  'REPORT_WEEKLY',
  'REPORT_MONTHLY',
  'TRANSACTIONS',
  'AUDIT_LOGS',
] as const;
export const API_FORMATS = ['XLSX', 'CSV', 'PDF'] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];
export type ApiFormat = (typeof API_FORMATS)[number];
export type ExportStatus = 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED';

export interface ExportJob {
  readonly id: string;
  readonly kind: ExportKind;
  readonly format: ApiFormat;
  readonly params: Readonly<Record<string, unknown>>;
  readonly status: ExportStatus;
  readonly rowCount: number | null;
  readonly failure: 'TOO_MANY_ROWS' | 'GENERATION_FAILED' | null;
  readonly createdAt: string;
  readonly finishedAt: string | null;
  /** Signed link, valid for a few minutes: never store it. */
  readonly downloadUrl: string | null;
}
export interface ExportRequest {
  kind: ExportKind;
  format: ApiFormat;
  params: Record<string, unknown>;
}

export interface ExportsRepository {
  list(query: PageQuery): Promise<Page<ExportJob>>;
  request(input: ExportRequest): Promise<ExportJob>;
  get(id: string): Promise<ExportJob>;
}

export const isFinished = (job: Pick<ExportJob, 'status'>): boolean =>
  job.status === 'DONE' || job.status === 'FAILED';

export class ExportTimeoutError extends Error {
  constructor() {
    super('export did not finish in time');
    this.name = 'ExportTimeoutError';
  }
}

export interface WaitOptions {
  intervalMs: number;
  timeoutMs: number;
  sleep?: (ms: number) => Promise<void>;
}

/** Asks for the job until it is DONE or FAILED; gives up after `timeoutMs` (the export keeps running on the server). */
export async function waitForExport(
  get: () => Promise<ExportJob>,
  { intervalMs, timeoutMs, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }: WaitOptions,
): Promise<ExportJob> {
  let waited = 0;
  for (;;) {
    const job = await get();
    if (isFinished(job)) return job;
    if (waited >= timeoutMs) throw new ExportTimeoutError();
    await sleep(intervalMs);
    waited += intervalMs;
  }
}
