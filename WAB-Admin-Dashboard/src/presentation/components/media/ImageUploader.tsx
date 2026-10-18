import { useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_MAX_IMAGE_BYTES, IMAGE_TYPES, PROGRESS_DONE } from '@/constants/media';
import { formatPercent } from '@/domain/shared/format';
import { formatBytes } from '@/domain/shared/upload';
import { useImageUpload, type UploadFailure } from '../../hooks/useImageUpload';
import { useLanguage } from '../../hooks/useLanguage';
import { cx } from '../../utils/cx';
import { Button } from '../core/Button';

export interface UploadedImage {
  /** Storage key returned by the server after confirm. */
  key: string;
  /** URL the preview is drawn from (CDN or signed). */
  url: string;
}

export interface ImageUploaderProps {
  label: string;
  value: UploadedImage | null;
  onChange: (value: UploadedImage | null) => void;
  /** Does the presign -> PUT -> confirm round trip and reports progress 0..1. Wired by the feature (banners...). */
  upload: (file: File, onProgress: (ratio: number) => void) => Promise<UploadedImage>;
  accept?: readonly string[];
  maxBytes?: number;
  disabled?: boolean;
}

interface FeedbackProps {
  progress: number | null;
  failure: UploadFailure | null;
  accept: readonly string[];
  maxBytes: number;
}

/** Progress bar while uploading, the error text after a problem. */
function UploaderFeedback({ progress, failure, accept, maxBytes }: FeedbackProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const message = failure
    ? t(`media.error.${failure}`, {
        max: formatBytes(maxBytes, language, { kb: t('media.kb'), mb: t('media.mb') }),
        types: accept.map((a) => a.replace('image/', '').toUpperCase()).join(', '),
      })
    : null;
  return (
    <>
      {progress !== null ? (
        <progress
          className="wab-uploader__progress"
          value={progress}
          max={PROGRESS_DONE}
          aria-label={t('media.uploading')}
        />
      ) : null}
      <div role="status" aria-live="polite">
        {progress !== null ? formatPercent(progress, language) : null}
      </div>
      {message ? (
        <p className="wab-field__error" role="alert">
          {message}
        </p>
      ) : null}
    </>
  );
}

/** One image: pick or drop, checked before upload, progress, preview with replace/remove, retry on failure. */
export function ImageUploader({
  label,
  value,
  onChange,
  upload,
  accept = IMAGE_TYPES,
  maxBytes = DEFAULT_MAX_IMAGE_BYTES,
  disabled = false,
}: ImageUploaderProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { progress, uploading, failure, retryable, start } = useImageUpload({
    accept,
    maxBytes,
    upload,
    onUploaded: onChange,
  });
  const busy = disabled || uploading;

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void start(file);
  };
  const drop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !busy) void start(file);
  };

  return (
    <div className="wab-uploader">
      <span className="wab-field__label" id={`${inputId}-label`}>
        {label}
      </span>
      <div
        className={cx('wab-uploader__zone', dragging && 'wab-uploader__zone--drag')}
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
      >
        {value ? <img className="wab-uploader__preview" src={value.url} alt={label} /> : null}
        <input
          ref={input}
          id={inputId}
          className="wab-sr-only"
          type="file"
          accept={accept.join(',')}
          disabled={busy}
          aria-labelledby={`${inputId}-label`}
          onChange={pick}
        />
        <div className="wab-row">
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {value ? t('media.replace') : t('media.choose')}
          </Button>
          {value && !uploading ? (
            <Button variant="ghost" size="sm" disabled={disabled} onClick={() => onChange(null)}>
              {t('media.remove')}
            </Button>
          ) : null}
          {retryable ? (
            <Button variant="ghost" size="sm" onClick={() => void start(retryable)}>
              {t('media.retry')}
            </Button>
          ) : null}
        </div>
        <p className="wab-field__hint">
          {t('media.hint', {
            max: formatBytes(maxBytes, language, { kb: t('media.kb'), mb: t('media.mb') }),
          })}
        </p>
        <UploaderFeedback
          progress={progress}
          failure={failure}
          accept={accept}
          maxBytes={maxBytes}
        />
      </div>
    </div>
  );
}
