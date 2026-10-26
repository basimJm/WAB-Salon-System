import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GALLERY_SAMPLE_REF } from '@/constants/ui';
import { Button } from '../../components/core/Button';
import { Card } from '../../components/core/Card';
import { Heading } from '../../components/core/Heading';
import { KeyValue } from '../../components/core/KeyValue';
import { SectionCard } from '../../components/core/SectionCard';
import { CardGrid } from '../../components/data/CardGrid';
import { StatusBadge } from '../../components/core/StatusBadge';
import type { Column } from '../../components/data/DataTable';
import { ListPage } from '../../components/templates/ListPage';
import { DetailPage } from '../../components/templates/DetailPage';
import { JsonViewer } from '../../components/templates/JsonViewer';
import { Timeline, type TimelineEntry } from '../../components/templates/Timeline';

interface BookingRow {
  id: string;
  customer: string;
  status: string;
}
const BOOKINGS: readonly BookingRow[] = [
  { id: 'WAB-7K2M9Q', customer: 'a', status: 'PENDING' },
  { id: 'WAB-3F8H1X', customer: 'b', status: 'APPROVED' },
  { id: 'WAB-9D4T6B', customer: 'c', status: 'NO_SHOW' },
];
const AUDIT_PAYLOAD = {
  action: 'SALON_SET_OFFLINE',
  before: { state: 'LIVE', offlineReason: null },
  after: { state: 'OFFLINE', offlineReason: 'maintenance', tags: ['a', 'b'] },
};
const HISTORY: readonly Omit<TimelineEntry, 'title' | 'actor' | 'reason'>[] = [
  { id: 'h3', at: '2026-10-12T13:05:00Z', tone: 'rose' },
  { id: 'h2', at: '2026-10-12T09:40:00Z', tone: 'green' },
  { id: 'h1', at: '2026-10-11T18:20:00Z', tone: 'amber' },
];

/** Gallery section for the page templates (ADM-018): list page, section card + card grid, detail page, timeline, JSON viewer. */
export function TemplatesSection() {
  const { t } = useTranslation();
  const k = (key: string) => t(`designKits.templates.${key}`);
  const [tab, setTab] = useState('overview');
  const [page, setPage] = useState(1);
  const columns: readonly Column<BookingRow>[] = [
    { key: 'id', header: k('colRef'), render: (r) => r.id, ltr: true },
    { key: 'customer', header: k('colCustomer'), render: (r) => k(`customer.${r.customer}`) },
    { key: 'status', header: k('colStatus'), render: (r) => <StatusBadge kind="booking" value={r.status} /> },
  ];
  const entries: TimelineEntry[] = HISTORY.map((h) => ({
    ...h,
    title: k(`history.${h.id}.title`),
    actor: k(`history.${h.id}.actor`),
    ...(h.id === 'h3' ? { reason: k('history.h3.reason') } : {}),
  }));
  return (
    <Card className="wab-stack" aria-label={k('title')}>
      <Heading level={2}>{k('title')}</Heading>
      <ListPage
        title={k('listTitle')}
        subtitle={k('listSubtitle')}
        actions={<Button>{k('create')}</Button>}
        table={{
          caption: k('listTitle'),
          columns,
          rows: BOOKINGS,
          rowKey: (r) => r.id,
        }}
        pagination={{
          page,
          pageSize: 10,
          total: 23,
          onPageChange: setPage,
          onPageSizeChange: () => undefined,
          ariaLabel: k('pagination'),
        }}
      />
      <SectionCard title={k('tabOverview')} subtitle={k('listSubtitle')}>
        <CardGrid
          caption={k('tabOverview')}
          rows={BOOKINGS}
          rowKey={(r) => r.id}
          renderCard={(r) => (
            <article className="wab-gridcard">
              <div className="wab-gridcard__body">
                <span className="wab-gridcard__title">{r.id}</span>
                <StatusBadge kind="booking" value={r.status} />
              </div>
            </article>
          )}
        />
      </SectionCard>
      <DetailPage
        title={GALLERY_SAMPLE_REF}
        subtitle={k('detailSubtitle')}
        status={<StatusBadge kind="booking" value="PENDING" />}
        actions={<Button variant="danger">{k('reject')}</Button>}
        back={{ to: '#', label: k('listTitle') }}
        tabsLabel={k('tabs')}
        activeTab={tab}
        onTabChange={setTab}
        tabs={[
          { id: 'overview', label: k('tabOverview'), content: <Heading level={2}>{k('overviewBody')}</Heading> },
          {
            id: 'history',
            label: k('tabHistory'),
            content: <Timeline entries={entries} ariaLabel={k('tabHistory')} empty={k('noHistory')} />,
          },
          {
            id: 'payload',
            label: k('tabPayload'),
            content: <JsonViewer value={AUDIT_PAYLOAD} label={k('tabPayload')} />,
          },
        ]}
        aside={
          <KeyValue
            placeholder={k('empty')}
            items={[
              { key: 'salon', label: k('salon'), value: k('salonName') },
              { key: 'amount', label: k('amount'), value: '45.500', ltr: true },
              { key: 'note', label: k('note'), value: '' },
            ]}
          />
        }
      />
    </Card>
  );
}
