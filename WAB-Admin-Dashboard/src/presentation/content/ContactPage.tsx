import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { APP_KINDS, type AppKind } from '@/domain/appconfig/appConfig';
import {
  isEmail,
  isPhone,
  type ContactInfo,
  type ContactInfoInput,
} from '@/domain/content/content';
import { Button } from '../components/core/Button';
import type { Column } from '../components/data/tableTypes';
import { TextField } from '../components/form/TextField';
import {
  appOptions,
  reasonError,
  ResourceDrawer,
  Select,
} from '../components/overlay/ResourceDrawer';
import { ListPage } from '../components/templates/ListPage';
import { useListController } from '../controllers/useListController';
import { useResourcePanel } from '../hooks/useResourcePanel';

const OPTIONS = { filterKeys: ['app'] };
const pickApp = (v: string | undefined): AppKind | undefined => APP_KINDS.find((a) => a === v);

function ContactDrawer({
  item,
  resource,
}: {
  item: ContactInfo | null;
  resource: ReturnType<typeof useContacts>;
}) {
  const { t } = useTranslation();
  const [v, setV] = useState({
    app: item?.app ?? APP_KINDS[0],
    phone: item?.phone ?? '',
    whatsapp: item?.whatsapp ?? '',
    email: item?.email ?? '',
    reason: '',
  });
  const [bad, setBad] = useState<ReadonlySet<string>>(new Set());
  const submit = () => {
    const found = new Set<string>();
    if (!isPhone(v.phone)) found.add('phone');
    if (!isPhone(v.whatsapp)) found.add('whatsapp');
    if (!isEmail(v.email)) found.add('email');
    if (reasonError(v.reason)) found.add('reason');
    setBad(found);
    if (found.size === 0)
      resource.submit(
        { app: v.app, phone: v.phone, whatsapp: v.whatsapp, email: v.email },
        v.reason.trim(),
      );
  };
  const text = (k: 'phone' | 'whatsapp' | 'email', hint?: string) => (
    <TextField
      label={t(`content.${k}`)}
      {...(hint ? { hint } : {})}
      dir="ltr"
      value={v[k]}
      error={
        bad.has(k) ? t(k === 'email' ? 'content.error.email' : 'content.error.phone') : undefined
      }
      onChange={(e) => setV({ ...v, [k]: e.target.value.trim() })}
    />
  );
  return (
    <ResourceDrawer
      title={t(item ? 'content.editContact' : 'content.addContact')}
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
      {text('phone', t('content.phoneHint'))}
      {text('whatsapp')}
      {text('email')}
    </ResourceDrawer>
  );
}

function useContacts(state: ReturnType<typeof useListController>['state']) {
  const { repositories } = useContainer();
  const repo = repositories.content.contactInfo;
  return useResourcePanel<ContactInfo, ContactInfoInput>(state, {
    queryName: 'getContentContactInfo',
    load: (s) => {
      const app = pickApp(s.filters['app']?.[0]);
      return repo.list({ page: s.page, pageSize: s.pageSize, ...(app ? { app } : {}) });
    },
    save: (editing, v, reason) =>
      editing
        ? repo.update(editing.id, { phone: v.phone, whatsapp: v.whatsapp, email: v.email }, reason)
        : repo.create(v, reason),
  });
}

/** Admin PRD A24 · Contact info shown in the apps (phone, WhatsApp, email) per app. */
export default function ContactPage() {
  const { t } = useTranslation();
  const list = useListController(OPTIONS);
  const resource = useContacts(list.state);
  const { state } = list;
  const app = pickApp(state.filters['app']?.[0]);
  const data = resource.query.data;
  const title = t('nav.sub.contact');
  const columns: Column<ContactInfo>[] = [
    { key: 'app', header: t('appConfig.appLabel'), render: (r) => t(`appConfig.app.${r.app}`) },
    { key: 'phone', header: t('content.phone'), ltr: true, render: (r) => r.phone },
    { key: 'whatsapp', header: t('content.whatsapp'), ltr: true, render: (r) => r.whatsapp },
    { key: 'email', header: t('content.email'), ltr: true, render: (r) => r.email },
  ];
  return (
    <>
      <ListPage
        title={title}
        subtitle={t('content.contactSubtitle')}
        actions={<Button onClick={resource.openCreate}>{t('content.addContact')}</Button>}
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
        <ContactDrawer
          key={resource.panel.editing?.id ?? 'new'}
          item={resource.panel.editing}
          resource={resource}
        />
      ) : null}
    </>
  );
}
