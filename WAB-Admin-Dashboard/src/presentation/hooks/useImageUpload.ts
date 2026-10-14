import { useState } from 'react';
import { validateFile, type FileProblem } from '@/domain/shared/upload';

export type UploadFailure = FileProblem | 'upload';

export interface UseImageUploadArgs<T> {
  accept: readonly string[];
  maxBytes: number;
  upload: (file: File, onProgress: (ratio: number) => void) => Promise<T>;
  onUploaded: (result: T) => void;
}

/**
 * Pick-to-uploaded flow of one file: checked before upload (type, size, empty), progress 0..1 while running,
 * a failure kept with the file so it can be retried, and nothing running twice at once.
 */
export function useImageUpload<T>({ accept, maxBytes, upload, onUploaded }: UseImageUploadArgs<T>) {
  const [progress, setProgress] = useState<number | null>(null);
  const [failure, setFailure] = useState<UploadFailure | null>(null);
  const [pending, setPending] = useState<File | null>(null);

  const start = async (file: File) => {
    if (progress !== null) return;
    const problem = validateFile(file, { accept, maxBytes });
    if (problem) {
      setFailure(problem);
      setPending(null);
      return;
    }
    setFailure(null);
    setPending(file);
    setProgress(0);
    try {
      onUploaded(await upload(file, setProgress));
      setPending(null);
    } catch {
      setFailure('upload');
    } finally {
      setProgress(null);
    }
  };

  return {
    progress,
    uploading: progress !== null,
    failure,
    /** The file to retry after an upload failure (never after a validation problem). */
    retryable: failure === 'upload' ? pending : null,
    start,
  };
}
