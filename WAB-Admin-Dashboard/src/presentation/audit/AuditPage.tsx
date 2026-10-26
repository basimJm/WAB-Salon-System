import { Badge } from '../components/core/Badge';
import { Icon } from '../components/core/Icon';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { hasDiff, humanizeAction, type AuditLog, type AuditQuery } from '@/domain/audit/audit';
import { formatInstant } from '@/domain/shared/format';
import { isLocalDate, localDayRange } from '@/domain/shared/time';
import { KeyValue } from '../components/core/KeyValue';
import { ExportMenu } from '../components/data/ExportMenu';
import type { Column } from '../components/data/tableTypes';
import { DateField } from '../components/form/DateField';
import { SearchField } from '../components/form/SearchField';
import { TextField } from '../components/form/TextField';
import { Drawer } from '../components/overlay/Drawer';
import { JsonViewer } from '../components/templates/JsonViewer';
import { ListPage } from '../components/templates/ListPage';
import { useListController } from '../controllers/useListController';
import { useExportRunner } from '../hooks/useExportRunner';
import { useLanguage } from '../hooks/useLanguage';
import { BOOKINGS_STRINGS } from '@/locales/lazy/bookings';
import { useLazyStrings } from '../hooks/useLazyStrings';

const OPTIONS = { filterKeys: ['action', 'entityType', 'entityId', 'admin', 'from', 'to'] };

function queryOf(
  filters: Readonly<Record<string, readonly string[]>>,
  page: number,
  pageSize: number,
): AuditQuery {
  const f = (k: string) => filters[k]?.[0];
  const from = f('from');
  const to = f('to');
  return {
    page,
    pageSize,
    ...(f('action') ? { action: f('action') } : {}),
    ...(f('entityType') ? { entityType: f('entityType') } : {}),
    ...(f('entityId') ? { entityId: f('entityId') } : {}),
    ...(f('admin') ? { adminId: f('admin') } : {}),
    ...(from && isLocalDate(from) ? { from: localDayRange(from).start.toISOString() } : {}),
    ...(to && isLocalDate(to) ? { to: localDayRange(to).end.toISOString() } : {}),
  };
}

const exportParams = ({
  page: _page,
  pageSize: _size,
  ...filters
}: AuditQuery): Record<string, unknown> => filters;

function Details({ log }: { log: AuditLog }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  return (
    <div className="wab-stack">
      <KeyValue
        placeholder="—"
        items={[
          { key: 'action', label: t('audit.action'), value: humanizeAction(log.action) },
          {
            key: 'entity',
            label: t('audit.entity'),
            value: `${log.entityType} · ${log.entityId}`,
            ltr: true,
          },
          { key: 'reason', label: t('appConfig.reason'), value: log.reason },
          {
            key: 'at',
            label: t('transactions.at'),
            value: formatInstant(log.createdAt, language, 'dateTime'),
            ltr: true,
          },
          { key: 'admin', label: t('audit.admin'), value: log.adminId, ltr: true },
          { key: 'ip', label: t('audit.ip'), value: log.ip, ltr: true },
          { key: 'ua', label: t('audit.device'), value: log.userAgent, ltr: true },
        ]}
      />
      {hasDiff(log) ? (
        <div className="wab-row">
          <JsonViewer value={log.before ?? null} label={t('audit.before')} />
          <JsonViewer value={log.after ?? null} label={t('audit.after')} />
        </div>
      ) : (
        <p>{t('audit.noDiff')}</p>
      )}
    </div>
  );
}

/** Admin PRD A29 · Audit log: every admin action with who, what, why and from where; open one for the before/after diff. */
export default function AuditPage() {
  useLazyStrings(BOOKINGS_STRINGS);
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { repositories } = useContainer();
  const list = useListController(OPTIONS);
  const { state } = list;
  const runner = useExportRunner();
  const f = (k: string) => state.filters[k]?.[0] ?? '';
  const [open, setOpen] = useState<AuditLog | null>(null);
  const query = useQuery({
    queryKey: ['getAuditLogs', state],
    queryFn: () => repositories.audit.list(queryOf(state.filters, state.page, state.pageSize)),
  });
  const title = t('nav.auditLog');
  const columns: Column<AuditLog>[] = [
    {
      key: 'at',
      header: t('transactions.at'),
      ltr: true,
      render: (r) => formatInstant(r.createdAt, language, 'dateTime'),
    },
    {
      key: 'action',
      header: t('audit.action'),
      render: (r) => (
        <span className="wab-cell2">
          <span className="wab-cell2__main">{humanizeAction(r.action)}</span>
          <bdi className="wab-cell2__code">{r.action}</bdi>
        </span>
      ),
    },
    {
      key: 'entity',
      header: t('audit.entity'),
      ltr: true,
      render: (r) => `${r.entityType} · ${r.entityId.slice(-6)}`,
    },
    { key: 'reason', header: t('appConfig.reason'), render: (r) => r.reason },
    { key: 'ip', header: t('audit.ip'), ltr: true, render: (r) => r.ip },
    {
      key: 'device',
      header: t('audit.device'),
      ltr: true,
      render: (r) => (
        <span className="wab-cell-clip" title={r.userAgent}>
          {r.userAgent}
        </span>
      ),
    },
  ];
  const chip = (key: string, label: string) =>
    f(key) ? [{ key, label: `${label}: ${f(key)}`, onRemove: () => list.setFilter(key, []) }] : [];
  const text = (key: string, label: string) => (
    <TextField
      label={label}
      dir="ltr"
      value={f(key)}
      onChange={(e) => list.setFilter(key, e.target.value ? [e.target.value] : [])}
    />
  );
  const data = query.data;
  return (
    <>
      <ListPage
        title={title}
        badges={
          <Badge tone="grey">
            <Icon name="lock" size="sm" />
            {t('audit.readOnly')}
          </Badge>
        }
        subtitle={t('audit.subtitle')}
        exportMenu={
          <ExportMenu
            onExport={runner(
              'AUDIT_LOGS',
              exportParams(queryOf(state.filters, state.page, state.pageSize)),
            )}
          />
        }
        search={
          <SearchField
            label={t('audit.searchAction')}
            initialValue={f('action')}
            onSearch={(v) => list.setFilter('action', v ? [v] : [])}
          />
        }
        filters={{
          active: [
            ...chip('action', t('audit.action')),
            ...chip('entityType', t('audit.entityType')),
            ...chip('entityId', t('audit.entityId')),
            ...chip('admin', t('audit.admin')),
            ...chip('from', t('bookings.from')),
            ...chip('to', t('bookings.to')),
          ],
          onClearAll: list.clearFilters,
          controls: (
            <>
              {text('entityType', t('audit.entityType'))}
              {text('entityId', t('audit.entityId'))}
              {text('admin', t('audit.admin'))}
              <DateField
                label={t('bookings.from')}
                value={f('from')}
                onValueChange={(v) => list.setFilter('from', v ? [v] : [])}
              />
              <DateField
                label={t('bookings.to')}
                value={f('to')}
                onValueChange={(v) => list.setFilter('to', v ? [v] : [])}
              />
            </>
          ),
        }}
        table={{
          columns,
          rows: data?.items ?? [],
          rowKey: (r) => r.id,
          caption: title,
          loading: query.isPending,
          error: query.error,
          onRetry: () => void query.refetch(),
          emptyTitle: t('audit.empty'),
          onRowClick: setOpen,
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
      <Drawer
        open={open !== null}
        title={open ? humanizeAction(open.action) : ''}
        onClose={() => setOpen(null)}
      >
        {open ? <Details log={open} /> : null}
      </Drawer>
    </>
  );
}
