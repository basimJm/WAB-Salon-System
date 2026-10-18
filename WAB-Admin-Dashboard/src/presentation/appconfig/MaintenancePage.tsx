import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import {
  APP_KINDS,
  type AppKind,
  type Maintenance,
  type MaintenanceInput,
} from '@/domain/appconfig/appConfig';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import type { Column } from '../components/data/tableTypes';
import { TextField } from '../components/form/TextField';
import { Toggle } from '../components/form/Toggle';
import { ListPage } from '../components/templates/ListPage';
import { useListController } from '../controllers/useListController';
import { useLanguage } from '../hooks/useLanguage';
import { useResourcePanel } from '../hooks/useResourcePanel';
import {
  ResourceDrawer,
  appOptions,
  reasonError,
  Select,
} from '../components/overlay/ResourceDrawer';

const OPTIONS = { filterKeys: ['app'] };
const MAX_MESSAGE = 500;
const pickApp = (v: string | undefined): AppKind | undefined => APP_KINDS.find((a) => a === v);

function MaintenanceDrawer({
  item,
  resource,
}: {
  item: Maintenance | null;
  resource: ReturnType<typeof useMaintenance>;
}) {
  const { t } = useTranslation();
  const [v, setV] = useState({
    app: item?.app ?? APP_KINDS[0],
    enabled: item?.enabled ?? false,
    ar: item?.message.ar ?? '',
    en: item?.message.en ?? '',
    reason: '',
  });
  const [bad, setBad] = useState<ReadonlySet<string>>(new Set());
  const submit = () => {
    const found = new Set<string>();
    if (!v.ar.trim() || v.ar.length > MAX_MESSAGE) found.add('ar');
    if (!v.en.trim() || v.en.length > MAX_MESSAGE) found.add('en');
    if (reasonError(v.reason)) found.add('reason');
    setBad(found);
    if (found.size === 0)
      resource.submit(
        { app: v.app, enabled: v.enabled, message: { ar: v.ar.trim(), en: v.en.trim() } },
        v.reason.trim(),
      );
  };
  const err = (k: string) =>
    bad.has(k) ? t('appConfig.error.message', { max: MAX_MESSAGE }) : undefined;
  return (
    <ResourceDrawer
      title={t(item ? 'appConfig.editMaintenance' : 'appConfig.addMaintenance')}
      reason={v.reason}
      reasonErr={bad.has('reason') ? 'appConfig.error.reason' : undefined}
      onReason={(reason) => setV({ ...v, reason })}
      saving={resource.saving}
      error={resource.saveError}
      onSubmit={submit}
      onClose={resource.close}
    >
      <Select
        label={t('appConfig.appLabel')}
        disabled={item !== null}
        value={v.app}
        options={appOptions(t)}
        onChange={(e) => setV({ ...v, app: pickApp(e.target.value) ?? v.app })}
      />
      <Toggle
        kind="switch"
        label={t('appConfig.maintenanceOn')}
        checked={v.enabled}
        onChange={(e) => setV({ ...v, enabled: e.target.checked })}
      />
      <TextField
        label={t('appConfig.messageAr')}
        lang="ar"
        dir="rtl"
        value={v.ar}
        error={err('ar')}
        onChange={(e) => setV({ ...v, ar: e.target.value })}
      />
      <TextField
        label={t('appConfig.messageEn')}
        lang="en"
        dir="ltr"
        value={v.en}
        error={err('en')}
        onChange={(e) => setV({ ...v, en: e.target.value })}
      />
    </ResourceDrawer>
  );
}

function useMaintenance(state: ReturnType<typeof useListController>['state']) {
  const { repositories } = useContainer();
  const repo = repositories.appConfig.maintenance;
  return useResourcePanel<Maintenance, MaintenanceInput>(state, {
    queryName: 'getAppConfigMaintenance',
    load: (s) => {
      const app = pickApp(s.filters['app']?.[0]);
      return repo.list({ page: s.page, pageSize: s.pageSize, ...(app ? { app } : {}) });
    },
    save: (editing, v, reason) =>
      editing
        ? repo.update(editing.id, { enabled: v.enabled, message: v.message }, reason)
        : repo.create(v, reason),
  });
}

/** Admin PRD A28 · Maintenance mode per app with an Arabic and English message. */
export default function MaintenancePage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const list = useListController(OPTIONS);
  const resource = useMaintenance(list.state);
  const { state } = list;
  const data = resource.query.data;
  const app = state.filters['app']?.[0];
  const columns: Column<Maintenance>[] = [
    { key: 'app', header: t('appConfig.appLabel'), render: (r) => t(`appConfig.app.${r.app}`) },
    {
      key: 'enabled',
      header: t('appConfig.maintenanceStatus'),
      render: (r) => (
        <Badge tone={r.enabled ? 'rose' : 'green'}>
          {t(r.enabled ? 'appConfig.maintenanceOn' : 'appConfig.maintenanceOff')}
        </Badge>
      ),
    },
    { key: 'message', header: t('appConfig.message'), render: (r) => r.message[language] },
  ];
  const title = t('nav.sub.maintenance');
  return (
    <>
      <ListPage
        title={title}
        subtitle={t('appConfig.maintenanceSubtitle')}
        actions={<Button onClick={resource.openCreate}>{t('appConfig.addMaintenance')}</Button>}
        filters={{
          active: app
            ? [
                {
                  key: 'app',
                  label: `${t('appConfig.appLabel')}: ${t(`appConfig.app.${app}`)}`,
                  onRemove: () => list.setFilter('app', []),
                },
              ]
            : [],
          onClearAll: list.clearFilters,
          controls: (
            <Select
              label={t('appConfig.appLabel')}
              value={app ?? ''}
              options={[{ value: '', label: t('appConfig.all') }, ...appOptions(t)]}
              onChange={(e) => list.setFilter('app', e.target.value ? [e.target.value] : [])}
            />
          ),
        }}
        table={{
          columns,
          rows: data?.items ?? [],
          rowKey: (r) => r.id,
          caption: title,
          loading: resource.query.isPending,
          error: resource.query.error,
          onRetry: () => void resource.query.refetch(),
          rowActions: (r) => (
            <Button variant="ghost" size="sm" onClick={() => resource.openEdit(r)}>
              {t('appConfig.edit')}
            </Button>
          ),
        }}
        pagination={
          data
            ? {
                page: state.page,
                pageSize: state.pageSize,
                total: data.meta.total,
                onPageChange: list.setPage,
                onPageSizeChange: list.setPageSize,
                ariaLabel: title,
              }
            : undefined
        }
      />
      {resource.panel ? (
        <MaintenanceDrawer
          key={resource.panel.editing?.id ?? 'new'}
          item={resource.panel.editing}
          resource={resource}
        />
      ) : null}
    </>
  );
}
