import { AppError } from '@/infrastructure/errors/AppError';

export type PutFile = (
  target: { url: string; headers: Readonly<Record<string, string>> },
  file: File,
  onProgress: (ratio: number) => void,
) => Promise<void>;

/** Sends the file straight to storage with progress (fetch cannot report upload progress). */
export const putFileWithProgress: PutFile = (target, file, onProgress) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', target.url);
    for (const [name, value] of Object.entries(target.headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new AppError({ kind: 'server', status: xhr.status }));
    xhr.onerror = () => reject(new AppError({ kind: 'network' }));
    xhr.send(file);
  });

/** Mock data source: pretend the storage accepted the file. */
export const fakePutFile: PutFile = (_target, _file, onProgress) => {
  onProgress(1);
  return Promise.resolve();
};
