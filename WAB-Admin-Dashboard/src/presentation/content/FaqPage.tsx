import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { APP_KINDS, type AppKind } from '@/domain/appconfig/appConfig';
import { MAX_FAQ_TEXT, type Faq, type FaqInput } from '@/domain/content/content';
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
import { useLanguage } from '../hooks/useLanguage';
import { useResourcePanel } from '../hooks/useResourcePanel';

const OPTIONS = { filterKeys: ['app'] };
const WHOLE = /^\d+$/;
const MAX_ORDER = 100_000;
const pickApp = (v: string | undefined): AppKind | undefined => APP_KINDS.find((a) => a === v);
const blank = (v: string) => !v.trim() || v.length > MAX_FAQ_TEXT;

function initial(item: Faq | null) {
  return {
    app: item?.app ?? APP_KINDS[0],
    qAr: item?.question.ar ?? '',
    qEn: item?.question.en ?? '',
    aAr: item?.answer.ar ?? '',
    aEn: item?.answer.en ?? '',
    order: String(item?.order ?? 0),
    reason: '',
  };
}

function FaqDrawer({ item, resource }: { item: Faq | null; resource: ReturnType<typeof useFaqs> }) {
  const { t } = useTranslation();
  const [v, setV] = useState(() => initial(item));
  const [bad, setBad] = useState<ReadonlySet<string>>(new Set());
  const submit = () => {
    const found = new Set<string>(
      (['qAr', 'qEn', 'aAr', 'aEn'] as const).filter((k) => blank(v[k])),
    );
    if (!WHOLE.test(v.order) || Number(v.order) > MAX_ORDER) found.add('order');
    if (reasonError(v.reason)) found.add('reason');
    setBad(found);
    if (found.size === 0)
      resource.submit(
        {
          app: v.app,
          question: { ar: v.qAr.trim(), en: v.qEn.trim() },
          answer: { ar: v.aAr.trim(), en: v.aEn.trim() },
          order: Number(v.order),
        },
        v.reason.trim(),
      );
  };
  const err = (k: string) =>
    bad.has(k) ? t('content.error.faq', { max: MAX_FAQ_TEXT }) : undefined;
  const field = (k: 'qAr' | 'qEn' | 'aAr' | 'aEn', label: string, dir: 'rtl' | 'ltr') => (
    <TextField
      label={label}
      dir={dir}
      value={v[k]}
      error={err(k)}
      onChange={(e) => setV({ ...v, [k]: e.target.value })}
    />
  );
  return (
    <ResourceDrawer
      title={t(item ? 'content.editFaq' : 'content.addFaq')}
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
      {field('qAr', t('content.questionAr'), 'rtl')}
      {field('qEn', t('content.questionEn'), 'ltr')}
      {field('aAr', t('content.answerAr'), 'rtl')}
      {field('aEn', t('content.answerEn'), 'ltr')}
      <TextField
        label={t('content.order')}
        inputMode="numeric"
        dir="ltr"
        value={v.order}
        error={bad.has('order') ? t('locations.error.sortOrder') : undefined}
        onChange={(e) => setV({ ...v, order: e.target.value })}
      />
    </ResourceDrawer>
  );
}

function useFaqs(state: ReturnType<typeof useListController>['state']) {
  const { repositories } = useContainer();
  const repo = repositories.content.faqs;
  return useResourcePanel<Faq, FaqInput>(state, {
    queryName: 'getContentFaqs',
    load: (s) => {
      const app = pickApp(s.filters['app']?.[0]);
      return repo.list({ page: s.page, pageSize: s.pageSize, ...(app ? { app } : {}) });
    },
    save: (editing, v, reason) =>
      editing
        ? repo.update(
            editing.id,
            { question: v.question, answer: v.answer, order: v.order },
            reason,
          )
        : repo.create(v, reason),
  });
}

/** Admin PRD A24 · FAQ per app in Arabic and English, shown in the apps in this order. */
export default function FaqPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const list = useListController(OPTIONS);
  const resource = useFaqs(list.state);
  const { state } = list;
  const app = pickApp(state.filters['app']?.[0]);
  const data = resource.query.data;
  const title = t('nav.sub.faq');
  const columns: Column<Faq>[] = [
    { key: 'order', header: t('content.order'), ltr: true, render: (r) => r.order },
    { key: 'app', header: t('appConfig.appLabel'), render: (r) => t(`appConfig.app.${r.app}`) },
    { key: 'q', header: t('content.question'), render: (r) => r.question[language] },
  ];
  return (
    <>
      <ListPage
        title={title}
        subtitle={t('content.faqSubtitle')}
        actions={<Button onClick={resource.openCreate}>{t('content.addFaq')}</Button>}
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
        <FaqDrawer
          key={resource.panel.editing?.id ?? 'new'}
          item={resource.panel.editing}
          resource={resource}
        />
      ) : null}
    </>
  );
}
