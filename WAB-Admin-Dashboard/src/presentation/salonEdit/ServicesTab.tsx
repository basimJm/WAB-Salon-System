import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { MAX_PAGE_SIZE } from '@/constants/ui';
import type { BranchScope, SalonService } from '@/domain/salonEdit/salonEdit';
import { formatJodAmount, formatNumber } from '@/domain/shared/format';
import { Button } from '../components/core/Button';
import { DataTable } from '../components/data/DataTable';
import type { Column } from '../components/data/tableTypes';
import { useLanguage } from '../hooks/useLanguage';
import { ServiceDrawer } from './ServiceDrawer';
import { useSalonMutation } from './useSalonMutation';

const REFRESH = [['getSalonsByIdServices']] as const;

export function ServicesTab({ scope, gender }: { scope: BranchScope; gender: 'MALE' | 'FEMALE' }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { repositories } = useContainer();
  const edit = repositories.salonEdit;
  const [open, setOpen] = useState<SalonService | 'new' | null>(null);
  const list = useQuery({
    queryKey: ['getSalonsByIdServices', scope],
    queryFn: () => edit.services(scope),
  });
  const catalog = useQuery({
    queryKey: ['getServices', 'options', gender],
    queryFn: () => repositories.catalog.services.list({ page: 1, pageSize: MAX_PAGE_SIZE, gender }),
  });
  const close = () => setOpen(null);
  const create = useSalonMutation(
    (v: { input: Parameters<typeof edit.addService>[1]; reason: string }) =>
      edit.addService(scope, v.input, v.reason),
    REFRESH,
    close,
  );
  const update = useSalonMutation(
    (v: { id: string; patch: Parameters<typeof edit.updateService>[2]; reason: string }) =>
      edit.updateService(scope, v.id, v.patch, v.reason),
    REFRESH,
    close,
  );
  const columns: Column<SalonService>[] = [
    { key: 'name', header: t('salonEdit.service'), render: (r) => r.name },
    {
      key: 'price',
      header: t('salonEdit.price'),
      ltr: true,
      render: (r) => `${formatJodAmount(r.price, language)} ${t('common.currency')}`,
    },
    {
      key: 'minutes',
      header: t('salonEdit.minutes'),
      ltr: true,
      render: (r) => formatNumber(r.durationMinutes, language),
    },
    {
      key: 'bride',
      header: t('salonEdit.brideOnly'),
      render: (r) => (r.brideOnly ? t('salonEdit.yes') : t('salonEdit.no')),
    },
    {
      key: 'active',
      header: t('salonEdit.active'),
      render: (r) => (r.active ? t('salonEdit.yes') : t('salonEdit.no')),
    },
  ];
  const taken = new Set((list.data ?? []).map((s) => s.catalogServiceId));
  const options = (catalog.data?.items ?? [])
    .filter((c) => !taken.has(c.id))
    .map((c) => ({ value: c.id, label: c.name[language] }));
  return (
    <div className="wab-stack">
      <div>
        <Button onClick={() => setOpen('new')}>{t('salonEdit.addService')}</Button>
      </div>
      <DataTable
        caption={t('salonEdit.tab.services')}
        columns={columns}
        rows={list.data ?? []}
        rowKey={(r) => r.id}
        loading={list.isPending}
        error={list.error}
        onRetry={() => void list.refetch()}
        emptyTitle={t('salonEdit.noServices')}
        rowActions={(r) => (
          <Button size="sm" variant="secondary" onClick={() => setOpen(r)}>
            {t('salonEdit.edit')}
          </Button>
        )}
      />
      {open ? (
        <ServiceDrawer
          key={open === 'new' ? 'new' : open.id}
          service={open === 'new' ? null : open}
          catalog={options}
          allowBride={gender === 'FEMALE'}
          saving={create.isPending || update.isPending}
          error={create.error ?? update.error}
          onCreate={(input, reason) => create.mutate({ input, reason })}
          onUpdate={(patch, reason) =>
            open !== 'new' && update.mutate({ id: open.id, patch, reason })
          }
          onClose={close}
        />
      ) : null}
    </div>
  );
}
