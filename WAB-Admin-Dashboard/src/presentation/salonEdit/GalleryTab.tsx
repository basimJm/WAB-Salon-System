import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import type { GalleryItem } from '@/domain/salonEdit/salonEdit';
import { moveId } from '@/domain/shared/order';
import { Button } from '../components/core/Button';
import { Card } from '../components/core/Card';
import { AsyncView } from '../components/feedback/AsyncView';
import { InlineAlert } from '../components/feedback/InlineAlert';
import { Skeleton } from '../components/feedback/Skeleton';
import { ImageUploader } from '../components/media/ImageUploader';
import { useReasonAction } from '../hooks/useReasonAction';
import { useSalonMutation } from './useSalonMutation';

const REFRESH = [['getSalonsByIdGallery']] as const;

function GalleryEditor({ salonId, items }: { salonId: string; items: readonly GalleryItem[] }) {
  const { t } = useTranslation();
  const { repositories } = useContainer();
  const [ids, setIds] = useState(() => items.map((i) => i.id));
  const edit = repositories.salonEdit;
  const add = useSalonMutation(
    (v: { key: string; reason: string }) =>
      edit.addGalleryItem(salonId, { type: 'IMAGE', key: v.key }, v.reason),
    REFRESH,
  );
  const remove = useSalonMutation(
    (v: { id: string; reason: string }) => edit.removeGalleryItem(salonId, v.id, v.reason),
    REFRESH,
  );
  const order = useSalonMutation(
    (v: { reason: string }) => edit.reorderGallery(salonId, ids, v.reason),
    REFRESH,
  );
  const reason = useReasonAction(add.isPending || remove.isPending || order.isPending);
  const byId = new Map(items.map((i) => [i.id, i]));
  const changed = ids.some((id, i) => items[i]?.id !== id);
  const error = add.error ?? remove.error ?? order.error;
  return (
    <Card aria-label={t('salonEdit.tab.gallery')}>
      <div className="wab-stack">
        {ids.length === 0 ? <p>{t('salonEdit.galleryEmpty')}</p> : null}
        <ul className="wab-stack" aria-label={t('salonEdit.tab.gallery')}>
          {ids.map((id, index) => {
            const item = byId.get(id);
            return item ? (
              <li key={id} className="wab-row">
                <img
                  src={item.thumbnailUrl ?? item.url}
                  alt=""
                  width={64}
                  height={64}
                  loading="lazy"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={index === 0}
                  aria-label={t('salonEdit.moveUp')}
                  onClick={() => setIds(moveId(ids, id, -1))}
                >
                  ↑
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={index === ids.length - 1}
                  aria-label={t('salonEdit.moveDown')}
                  onClick={() => setIds(moveId(ids, id, 1))}
                >
                  ↓
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => reason.ask((r) => remove.mutate({ id, reason: r }))}
                >
                  {t('salonEdit.remove')}
                </Button>
              </li>
            ) : null;
          })}
        </ul>
        <div>
          <Button
            disabled={!changed}
            onClick={() => reason.ask((r) => order.mutate({ reason: r }))}
          >
            {t('salonEdit.saveOrder')}
          </Button>
        </div>
        <ImageUploader
          label={t('salonEdit.addImage')}
          value={null}
          onChange={(v) => v && reason.ask((r) => add.mutate({ key: v.key, reason: r }))}
          upload={(file, onProgress) =>
            repositories.uploads
              .upload('GALLERY_IMAGE', file, onProgress)
              .then((f) => ({ key: f.key, url: f.url ?? '' }))
          }
        />
        {error ? <InlineAlert error={error} /> : null}
      </div>
      {reason.dialog}
    </Card>
  );
}

export function GalleryTab({ salonId }: { salonId: string }) {
  const { repositories } = useContainer();
  const q = useQuery({
    queryKey: ['getSalonsByIdGallery', salonId],
    queryFn: () => repositories.salonEdit.gallery(salonId),
  });
  return (
    <AsyncView
      loading={q.isPending}
      error={q.error}
      onRetry={() => void q.refetch()}
      skeleton={<Skeleton height="lg" />}
    >
      {q.data ? <GalleryEditor key={q.dataUpdatedAt} salonId={salonId} items={q.data} /> : null}
    </AsyncView>
  );
}
