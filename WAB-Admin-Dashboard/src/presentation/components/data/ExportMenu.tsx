import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EXPORT_FORMATS, type ExportFormat } from '@/constants/dateRange';
import { Button } from '../core/Button';
import { Popover } from '../overlay/Popover';
import { useToast } from '../overlay/Toast';

export interface ExportMenuProps {
  /** Starts the export of the current filtered result and resolves when the file is ready. */
  onExport: (format: ExportFormat) => Promise<void>;
  formats?: readonly ExportFormat[];
  disabled?: boolean;
}

/** "Export" button: choose Excel / CSV / PDF; shows progress and the outcome as toasts (Admin PRD §2). */
export function ExportMenu({ onExport, formats = EXPORT_FORMATS, disabled }: ExportMenuProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = async (format: ExportFormat) => {
    setBusy(true);
    toast.show(t('export.started', { format: t(`export.format.${format}`) }), 'info');
    try {
      await onExport(format);
      toast.show(t('export.done'), 'success');
    } catch {
      toast.show(t('export.failed'), 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Popover label={t('export.label')} disabled={disabled} loading={busy}>
      {(close) =>
        formats.map((format) => (
          <Button
            key={format}
            variant="ghost"
            size="sm"
            onClick={() => {
              close();
              void run(format);
            }}
          >
            {t(`export.format.${format}`)}
          </Button>
        ))
      }
    </Popover>
  );
}
