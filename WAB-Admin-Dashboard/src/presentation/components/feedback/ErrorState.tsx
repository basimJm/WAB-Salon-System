import { useTranslation } from 'react-i18next';
import type { AppError } from '@/infrastructure/errors/AppError';
import { normalizeError } from '@/infrastructure/errors/normalize';
import { Button } from '../core/Button';
import { Icon } from '../core/Icon';

export interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
}

/** Localized error with a retry action when a retry can help. Technical details only as a trace id. */
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const { t } = useTranslation();
  const appError: AppError = normalizeError(error);
  return (
    <div className="wab-state wab-state--error" role="alert">
      <Icon name="alert" size="lg" />
      <h2 className="wab-state__title">{t('errors.title')}</h2>
      <p className="wab-state__text">{appError.serverMessage ?? t(appError.messageKey)}</p>
      {appError.traceId ? (
        <p className="wab-state__trace" dir="ltr">
          {t('errors.traceId')}: {appError.traceId}
        </p>
      ) : null}
      {onRetry && (appError.retryable || appError.kind === 'unknown') ? (
        <Button variant="secondary" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      ) : null}
    </div>
  );
}
