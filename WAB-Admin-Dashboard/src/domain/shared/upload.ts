import { BYTES_PER_KB, BYTES_PER_MB } from '@/constants/media';
import { formatNumber } from './format';
import type { Language } from '@/constants/i18n';

export type FileProblem = 'type' | 'size' | 'empty';

export interface FileFacts {
  readonly type: string;
  readonly size: number;
}

export interface FileRules {
  readonly accept: readonly string[];
  readonly maxBytes: number;
}

/** Checks a picked file before any upload starts. The server re-checks the real type and size on confirm. */
export function validateFile(file: FileFacts, rules: FileRules): FileProblem | null {
  if (file.size <= 0) return 'empty';
  if (!rules.accept.includes(file.type)) return 'type';
  if (file.size > rules.maxBytes) return 'size';
  return null;
}

/** "340 KB" / "4.2 MB" with the language's digits. */
export function formatBytes(
  bytes: number,
  language: Language,
  units: { kb: string; mb: string },
): string {
  if (bytes >= BYTES_PER_MB) {
    return `${formatNumber(Math.round((bytes / BYTES_PER_MB) * 10) / 10, language)} ${units.mb}`;
  }
  return `${formatNumber(Math.max(1, Math.round(bytes / BYTES_PER_KB)), language)} ${units.kb}`;
}
