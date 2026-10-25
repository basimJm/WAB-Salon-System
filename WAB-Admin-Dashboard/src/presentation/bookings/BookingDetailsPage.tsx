import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useContainer } from '@/app/ContainerContext';
import { ROUTES } from '@/constants/routes';
import {
  BOOKING_STATUSES,
  MAX_STATUS_REASON,
  isBookingStatus,
  type BookingDetails,
  type BookingStatus,
} from '@/domain/bookings/bookings';
import { formatInstant, formatJodAmount } from '@/domain/shared/format';
import { BookingActions } from './BookingActions';
import { KeyValue } from '../components/core/KeyValue';
import { StatusBadge } from '../components/core/StatusBadge';
import { DataTable } from '../components/data/DataTable';
import type { Column } from '../components/data/tableTypes';
import { reasonError, ResourceDrawer, Select } from '../components/overlay/ResourceDrawer';
import { useToast } from '../components/overlay/Toast';
import { DetailPage } from '../components/templates/DetailPage';
import { Timeline } from '../components/templates/Timeline';
import { useLanguage } from '../hooks/useLanguage';

type Person = BookingDetails['persons'][number];

function Facts({ b }: { b: BookingDetails }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const jod = (v: string) => `${formatJodAmount(v, language)} ${t('common.currency')}`;
  const when = (iso: string) => formatInstant(iso, language, 'dateTime');
  const persons: Column<Person>[] = [
    {
      key: 'name',
      header: t('bookings.person'),
      render: (p) => (p.isBride ? `${p.name} · ${t('bookings.bride')}` : p.name),
    },
    {
      key: 'services',
      header: t('bookings.services'),
      render: (p) => p.services.map((s) => s.name).join(', '),
    },
    { key: 'staff', header: t('bookings.staff'), render: (p) => p.staff?.name ?? '—' },
    { key: 'subtotal', header: t('bookings.total'), ltr: true, render: (p) => jod(p.subtotal) },
  ];
  return (
    <div className="wab-stack">
      <KeyValue
        placeholder={t('salons.none')}
        items={[
          {
            key: 'customer',
            label: t('bookings.customer'),
            value: b.customer ? (
              <RouterLink to={`${ROUTES.customers}/${b.customer.id}`}>{b.customer.name}</RouterLink>
            ) : null,
          },
          {
            key: 'branch',
            label: t('branches.name'),
            value: b.branch
              ? [b.branch.name, b.branch.locationText].filter(Boolean).join(' · ')
              : null,
          },
          {
            key: 'salon',
            label: t('bookings.salon'),
            value: b.salon ? (
              <RouterLink to={`${ROUTES.salons}/${b.salon.id}`}>{b.salon.name}</RouterLink>
            ) : null,
          },
          {
            key: 'when',
            label: t('bookings.appointment'),
            value: when(b.appointmentStart),
            ltr: true,
          },
          { key: 'respond', label: t('bookings.respondBy'), value: when(b.respondBy), ltr: true },
          { key: 'method', label: t('bookings.method'), value: b.paymentMethod },
          {
            key: 'payment',
            label: t('bookings.payment'),
            value: t(`bookings.paymentStatus.${b.paymentStatus}`, {
              defaultValue: b.paymentStatus,
            }),
          },
          { key: 'refund', label: t('bookings.refund'), value: b.refundStatus },
          { key: 'created', label: t('salons.created'), value: when(b.createdAt), ltr: true },
        ]}
      />
      <DataTable
        columns={persons}
        rows={b.persons}
        rowKey={(p) => `${p.name}-${p.start}`}
        caption={t('bookings.persons')}
      />
      <KeyValue
        placeholder={t('salons.none')}
        items={[
          { key: 'total', label: t('bookings.total'), value: jod(b.money.total), ltr: true },
          { key: 'due', label: t('bookings.dueOnline'), value: jod(b.money.dueOnline), ltr: true },
          {
            key: 'paid',
            label: t('bookings.paidOnline'),
            value: jod(b.money.paidOnline),
            ltr: true,
          },
          {
            key: 'remaining',
            label: t('bookings.remaining'),
            value: jod(b.money.remaining),
            ltr: true,
          },
          {
            key: 'refunded',
            label: t('bookings.refunded'),
            value: jod(b.money.refunded),
            ltr: true,
          },
        ]}
      />
    </div>
  );
}

function History({ b }: { b: BookingDetails }) {
  const { t } = useTranslation();
  return (
    <Timeline
      ariaLabel={t('bookings.history')}
      empty={t('bookings.noHistory')}
      entries={b.statusHistory.map((h, i) => ({
        id: `${h.at}-${String(i)}`,
        title: t(`status.booking.${h.status}`, { defaultValue: h.status }),
        actor: h.actorType,
        at: h.at,
        ...(h.reason ? { reason: h.reason } : {}),
      }))}
    />
  );
}

function StatusDrawer({ b, onClose }: { b: BookingDetails; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { repositories } = useContainer();
  const [status, setStatus] = useState<BookingStatus>(
    BOOKING_STATUSES.find((s) => s !== b.status) ?? 'PENDING',
  );
  const [reason, setReason] = useState('');
  const [bad, setBad] = useState(false);
  const move = useMutation({
    mutationFn: () => repositories.bookings.changeStatus(b.id, status, reason.trim()),
    onSuccess: async (r) => {
      toast.show(
        t(r.irregular ? 'bookings.irregular' : 'bookings.statusChanged'),
        r.irregular ? 'info' : 'success',
      );
      await queryClient.invalidateQueries({ queryKey: ['getBookingsById'] });
      await queryClient.invalidateQueries({ queryKey: ['getBookings'] });
      onClose();
    },
  });
  const submit = () => {
    const invalid = reasonError(reason) !== undefined || reason.length > MAX_STATUS_REASON;
    setBad(invalid);
    if (!invalid) move.mutate();
  };
  return (
    <ResourceDrawer
      title={t('bookings.changeStatus')}
      reason={reason}
      reasonErr={bad ? 'appConfig.error.reason' : undefined}
      onReason={setReason}
      saving={move.isPending}
      error={move.error}
      onSubmit={submit}
      onClose={onClose}
    >
      <p className="wab-field__hint" role="note">
        {t('bookings.statusWarning')}
      </p>
      <Select
        label={t('bookings.newStatus')}
        value={status}
        options={BOOKING_STATUSES.filter((s) => s !== b.status).map((s) => ({
          value: s,
          label: t(`status.booking.${s}`),
        }))}
        onChange={(e) => setStatus(isBookingStatus(e.target.value) ? e.target.value : status)}
      />
    </ResourceDrawer>
  );
}

/** Admin PRD A15 · One booking: facts, persons and services, money, status history, and a status change with a reason. */
export default function BookingDetailsPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const { repositories } = useContainer();
  const [tab, setTab] = useState('details');
  const [changing, setChanging] = useState(false);
  const query = useQuery({
    queryKey: ['getBookingsById', { id }],
    queryFn: () => repositories.bookings.get(id),
  });
  const b = query.data;
  return (
    <>
      <DetailPage
        title={b?.referenceNumber ?? t('nav.bookings')}
        back={{ to: ROUTES.bookings, label: t('nav.bookings') }}
        status={b ? <StatusBadge kind="booking" value={b.status} /> : null}
        actions={b ? <BookingActions b={b} onStatus={() => setChanging(true)} /> : null}
        tabs={[
          { id: 'details', label: t('bookings.details'), content: b ? <Facts b={b} /> : null },
          { id: 'history', label: t('bookings.history'), content: b ? <History b={b} /> : null },
        ]}
        activeTab={tab}
        onTabChange={setTab}
        tabsLabel={t('bookings.details')}
        loading={query.isPending}
        error={query.error}
        onRetry={() => void query.refetch()}
      />
      {changing && b ? <StatusDrawer b={b} onClose={() => setChanging(false)} /> : null}
    </>
  );
}
