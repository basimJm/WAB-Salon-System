import { useContainer } from '@/app/ContainerContext';
import type { ExportFormat } from '@/constants/dateRange';
import { EXPORT_POLL_INTERVAL_MS, EXPORT_POLL_TIMEOUT_MS } from '@/constants/ui';
import { waitForExport, type ExportKind } from '@/domain/exports/exports';

/**
 * `runner(kind, params)` returns the `onExport(format)` of an ExportMenu: it asks the server for the file, waits until it
 * is ready and opens the short-lived download link. Failures reject so the menu shows its error toast.
 */
export function useExportRunner() {
  const { repositories } = useContainer();
  const repo = repositories.exports;
  return (kind: ExportKind, params: Record<string, unknown>) => async (format: ExportFormat) => {
    const started = await repo.request({ kind, format, params });
    const job = await waitForExport(() => repo.get(started.id), {
      intervalMs: EXPORT_POLL_INTERVAL_MS,
      timeoutMs: EXPORT_POLL_TIMEOUT_MS,
    });
    if (job.status === 'FAILED' || !job.downloadUrl) throw new Error(job.failure ?? 'FAILED');
    window.open(job.downloadUrl, '_blank', 'noopener,noreferrer');
  };
}
