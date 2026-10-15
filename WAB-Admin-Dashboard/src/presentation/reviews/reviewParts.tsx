import { useTranslation } from 'react-i18next';
import type { Review } from '@/domain/reviews/reviews';
import { Button } from '../components/core/Button';
import { ReasonDialog } from '../components/overlay/ReasonDialog';

export type Ask = { kind: 'reject' | 'remove'; review: Review } | { kind: 'bulk-reject' } | null;

/** Buttons at the end of a table row: decide a pending review, or remove a published one. */
export function ReviewRowActions({
  review,
  onApprove,
  onAsk,
}: {
  review: Review;
  onApprove: () => void;
  onAsk: (kind: 'reject' | 'remove') => void;
}) {
  const { t } = useTranslation();
  if (review.status === 'PENDING')
    return (
      <>
        <Button variant="ghost" size="sm" onClick={onApprove}>
          {t('reviews.approve')}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onAsk('reject')}>
          {t('reviews.reject')}
        </Button>
      </>
    );
  if (review.status === 'APPROVED')
    return (
      <Button variant="ghost" size="sm" onClick={() => onAsk('remove')}>
        {t('reviews.remove')}
      </Button>
    );
  return null;
}

/** Asks for the reason before a rejection or a removal. */
export function ReviewReasonDialog({
  asking,
  loading,
  onConfirm,
  onClose,
}: {
  asking: Ask;
  loading: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const remove = asking?.kind === 'remove';
  const title =
    asking && asking.kind !== 'bulk-reject'
      ? t(`reviews.${asking.kind}Title`)
      : t('reviews.rejectSelected');
  return (
    <ReasonDialog
      open={asking !== null}
      destructive
      title={title}
      description={t(remove ? 'reviews.removeText' : 'reviews.rejectText')}
      confirmLabel={t(remove ? 'reviews.remove' : 'reviews.reject')}
      loading={loading}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}
