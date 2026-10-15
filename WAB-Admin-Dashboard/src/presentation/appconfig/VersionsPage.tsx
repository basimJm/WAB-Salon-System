import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import {
  APP_KINDS,
  PLATFORMS,
  type AppVersion,
  type AppVersionInput,
} from '@/domain/appconfig/appConfig';
import { validateVersionRow } from '@/domain/appconfig/versions';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import type { Column } from '../components/data/tableTypes';
import { TextField } from '../components/form/TextField';
import { Toggle } from '../components/form/Toggle';
import { ListPage } from '../components/templates/ListPage';
import { useListController } from '../controllers/useListController';
import { useResourcePanel } from '../hooks/useResourcePanel';
import {
  AppConfigDrawer,
  appOptions,
  platformOptions,
  reasonError,
  Select,
} from './AppConfigDrawer';

const OPTIONS = { filterKeys: ['app', 'platform'] };
const pick = <T extends string>(all: readonly T[], v: string | undefined): T | undefined =>
  all.find((a) => a === v);

function initialForm(item: AppVersion | null) {
  return {
    app: item?.app ?? APP_KINDS[0],
    platform: item?.platform ?? PLATFORMS[0],
    latest: item?.latest ?? '',
    minSupported: item?.minSupported ?? '',
    storeUrl: item?.storeUrl ?? '',
    optionalUpdate: item?.optionalUpdate ?? false,
    reason: '',
  };
}

function VersionDrawer({
  item,
  resource,
}: {
  item: AppVersion | null;
  resource: ReturnType<typeof useVersions>;
}) {
  const { t } = useTranslation();
  const [v, setV] = useState(() => initialForm(item));
  const [errors, setErrors] = useState<readonly string[]>([]);
  const submit = () => {
    const found = validateVersionRow(v).map((e) => `appConfig.error.${e}`);
    if (reasonError(v.reason)) found.push('appConfig.error.reason');
    setErrors(found);
    if (found.length === 0) resource.submit(v, v.reason.trim());
  };
  const err = (k: string) =>
    errors.includes(`appConfig.error.${k}`) ? t(`appConfig.error.${k}`) : undefined;
  return (
    <AppConfigDrawer
      title={t(item ? 'appConfig.editVersion' : 'appConfig.addVersion')}
      reason={v.reason}
      reasonErr={errors.includes('appConfig.error.reason') ? 'appConfig.error.reason' : undefined}
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
        onChange={(e) => setV({ ...v, app: pick(APP_KINDS, e.target.value) ?? v.app })}
      />
      <Select
        label={t('appConfig.platformLabel')}
        disabled={item !== null}
        value={v.platform}
        options={platformOptions(t)}
        onChange={(e) => setV({ ...v, platform: pick(PLATFORMS, e.target.value) ?? v.platform })}
      />
      <TextField
        label={t('appConfig.latest')}
        dir="ltr"
        value={v.latest}
        error={err('latest')}
        onChange={(e) => setV({ ...v, latest: e.target.value })}
      />
      <TextField
        label={t('appConfig.minSupported')}
        hint={t('appConfig.minSupportedHint')}
        dir="ltr"
        value={v.minSupported}
        error={err('minSupported') ?? err('order')}
        onChange={(e) => setV({ ...v, minSupported: e.target.value })}
      />
      <TextField
        label={t('appConfig.storeUrl')}
        dir="ltr"
        value={v.storeUrl}
        error={err('storeUrl')}
        onChange={(e) => setV({ ...v, storeUrl: e.target.value })}
      />
      <Toggle
        kind="switch"
        label={t('appConfig.optionalUpdate')}
        checked={v.optionalUpdate}
        onChange={(e) => setV({ ...v, optionalUpdate: e.target.checked })}
      />
    </AppConfigDrawer>
  );
}

function useVersions(state: ReturnType<typeof useListController>['state']) {
  const { repositories } = useContainer();
  const repo = repositories.appConfig.versions;
  return useResourcePanel<AppVersion, AppVersionInput>(state, {
    queryName: 'getAppConfigVersions',
    load: (s) =>
      repo.list({
        page: s.page,
        pageSize: s.pageSize,
        ...(pick(APP_KINDS, s.filters['app']?.[0])
          ? { app: pick(APP_KINDS, s.filters['app']?.[0]) }
          : {}),
        ...(pick(PLATFORMS, s.filters['platform']?.[0])
          ? { platform: pick(PLATFORMS, s.filters['platform']?.[0]) }
          : {}),
      }),
    save: (editing, v, reason) => {
      if (!editing) return repo.create(v, reason);
      const { latest, minSupported, storeUrl, optionalUpdate } = v;
      return repo.update(editing.id, { latest, minSupported, storeUrl, optionalUpdate }, reason);
    },
  });
}

/** Admin PRD A28 · App versions per app and platform: latest, minimum supported (force update), store link. */
export default function VersionsPage() {
  const { t } = useTranslation();
  const list = useListController(OPTIONS);
  const resource = useVersions(list.state);
  const { state } = list;
  const data = resource.query.data;
  const columns: Column<AppVersion>[] = [
    { key: 'app', header: t('appConfig.appLabel'), render: (r) => t(`appConfig.app.${r.app}`) },
    {
      key: 'platform',
      header: t('appConfig.platformLabel'),
      render: (r) => t(`appConfig.platform.${r.platform}`),
    },
    { key: 'latest', header: t('appConfig.latest'), ltr: true, render: (r) => r.latest },
    { key: 'min', header: t('appConfig.minSupported'), ltr: true, render: (r) => r.minSupported },
    {
      key: 'optional',
      header: t('appConfig.optionalUpdate'),
      render: (r) => (
        <Badge tone={r.optionalUpdate ? 'green' : 'amber'}>
          {t(r.optionalUpdate ? 'appConfig.optional' : 'appConfig.forced')}
        </Badge>
      ),
    },
  ];
  const active = (['app', 'platform'] as const).flatMap((key) => {
    const value = state.filters[key]?.[0];
    return value
      ? [
          {
            key,
            label: `${t(`appConfig.${key}Label`)}: ${t(`appConfig.${key}.${value}`)}`,
            onRemove: () => list.setFilter(key, []),
          },
        ]
      : [];
  });
  const title = t('nav.sub.versions');
  return (
    <>
      <ListPage
        title={title}
        subtitle={t('appConfig.versionsSubtitle')}
        actions={<Button onClick={resource.openCreate}>{t('appConfig.addVersion')}</Button>}
        filters={{
          active,
          onClearAll: list.clearFilters,
          controls: (
            <>
              <Select
                label={t('appConfig.appLabel')}
                value={state.filters['app']?.[0] ?? ''}
                options={[{ value: '', label: t('appConfig.all') }, ...appOptions(t)]}
                onChange={(e) => list.setFilter('app', e.target.value ? [e.target.value] : [])}
              />
              <Select
                label={t('appConfig.platformLabel')}
                value={state.filters['platform']?.[0] ?? ''}
                options={[{ value: '', label: t('appConfig.all') }, ...platformOptions(t)]}
                onChange={(e) => list.setFilter('platform', e.target.value ? [e.target.value] : [])}
              />
            </>
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
        <VersionDrawer
          key={resource.panel.editing?.id ?? 'new'}
          item={resource.panel.editing}
          resource={resource}
        />
      ) : null}
    </>
  );
}
