import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useContainer } from '@/app/ContainerContext';
import { ROUTES } from '@/constants/routes';
import {
  actionsFor,
  type CustomerAction,
  type CustomerDetails,
  type CustomerDevice,
} from '@/domain/customers/customers';
import { formatInstant } from '@/domain/shared/format';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import { KeyValue } from '../components/core/KeyValue';
import { StatusBadge } from '../components/core/StatusBadge';
import { CustomerExtraActions } from './CustomerExtraActions';
import { CustomerNotificationsTab, CustomerReviewsTab } from './CustomerListTabs';
import { DataTable } from '../components/data/DataTable';
import type { Column } from '../components/data/tableTypes';
import { ReasonDialog } from '../components/overlay/ReasonDialog';
import { useToast } from '../components/overlay/Toast';
import { DetailPage } from '../components/templates/DetailPage';
import { useLanguage } from '../hooks/useLanguage';
import { useLocationOptions } from '../hooks/useLocationOptions';

function Profile({ c }: { c: CustomerDetails }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const cities = useLocationOptions('cities');
  const date = (iso: string | null) => (iso ? formatInstant(iso, language, 'date') : null);
  const devices: Column<CustomerDevice>[] = [
    { key: 'app', header: t('customers.app'), render: (d) => d.app },
    { key: 'platform', header: t('customers.platform'), render: (d) => d.platform },
    { key: 'version', header: t('customers.version'), ltr: true, render: (d) => d.appVersion },
    {
      key: 'seen',
      header: t('customers.lastActive'),
      ltr: true,
      render: (d) => date(d.lastSeenAt),
    },
    {
      key: 'push',
      header: t('customers.push'),
      render: (d) => (
        <Badge tone={d.pushToken ? 'green' : 'grey'}>
          {t(d.pushToken ? 'customers.pushOn' : 'customers.pushOff')}
        </Badge>
      ),
    },
  ];
  return (
    <div className="wab-stack">
      <KeyValue
        placeholder={t('salons.none')}
        items={[
          { key: 'phone', label: t('salons.phone'), value: c.phone, ltr: true },
          { key: 'email', label: t('customers.email'), value: c.email, ltr: true },
          { key: 'gender', label: t('business.gender'), value: t(`catalog.genders.${c.gender}`) },
          {
            key: 'city',
            label: t('salons.city'),
            value: cities.find((x) => x.value === c.cityId)?.label,
          },
          { key: 'language', label: t('customers.language'), value: c.language },
          {
            key: 'registered',
            label: t('customers.registered'),
            value: date(c.registeredAt),
            ltr: true,
          },
          { key: 'last', label: t('customers.lastActive'), value: date(c.lastActiveAt), ltr: true },
          { key: 'blocked', label: t('customers.blockedReason'), value: c.blockedReason },
          {
            key: 'deletion',
            label: t('customers.deletionAt'),
            value: date(c.deletionScheduledAt),
            ltr: true,
          },
          { key: 'journey', label: t('customers.journeyId'), value: c.journeyUserId, ltr: true },
        ]}
      />
      <h2 className="wab-settings__title">{t('customers.devices')}</h2>
      <DataTable
        columns={devices}
        rows={c.devices}
        rowKey={(d) => `${d.app}-${d.platform}-${d.appVersion}`}
        caption={t('customers.devices')}
      />
    </div>
  );
}

/** Admin PRD A12 · One customer: profile, devices, block / deletion state and the actions that fit the state. */
export default function CustomerDetailsPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { repositories } = useContainer();
  const [asking, setAsking] = useState<CustomerAction | null>(null);
  const [tab, setTab] = useState('profile');
  const query = useQuery({
    queryKey: ['getCustomersById', { id }],
    queryFn: () => repositories.customers.get(id),
  });
  const act = useMutation({
    mutationFn: ({ action, reason }: { action: CustomerAction; reason: string }) =>
      repositories.customers.act(id, action, reason),
    onSuccess: async () => {
      setAsking(null);
      toast.show(t('customers.actionDone'), 'success');
      await queryClient.invalidateQueries({ queryKey: ['getCustomersById'] });
      await queryClient.invalidateQueries({ queryKey: ['getCustomers'] });
    },
  });
  const c = query.data;
  return (
    <>
      <DetailPage
        title={c?.name ?? t('nav.customers')}
        back={{ to: ROUTES.customers, label: t('nav.customers') }}
        status={c ? <StatusBadge kind="customer" value={c.status} /> : null}
        actions={
          c ? (
            <>
              <CustomerExtraActions c={c} />
              {actionsFor(c.status).map((a) => (
                <Button
                  key={a}
                  variant={a === 'delete' || a === 'block' ? 'secondary' : 'primary'}
                  onClick={() => {
                    act.reset();
                    setAsking(a);
                  }}
                >
                  {t(`customers.actions.${a}`)}
                </Button>
              ))}
            </>
          ) : null
        }
        tabs={[
          { id: 'profile', label: t('customers.profile'), content: c ? <Profile c={c} /> : null },
          { id: 'reviews', label: t('customers.reviews'), content: <CustomerReviewsTab id={id} /> },
          {
            id: 'notifications',
            label: t('customers.notifications'),
            content: <CustomerNotificationsTab id={id} />,
          },
        ]}
        activeTab={tab}
        onTabChange={setTab}
        tabsLabel={t('customers.profile')}
        loading={query.isPending}
        error={query.error}
        onRetry={() => void query.refetch()}
      />
      <ReasonDialog
        open={asking !== null}
        destructive={asking === 'block' || asking === 'delete'}
        title={t('customers.confirmTitle', {
          action: asking ? t(`customers.actions.${asking}`) : '',
          name: c?.name ?? '',
        })}
        description={asking ? t(`customers.confirmText.${asking}`) : ''}
        confirmLabel={asking ? t(`customers.actions.${asking}`) : ''}
        loading={act.isPending}
        onConfirm={(reason) => asking && act.mutate({ action: asking, reason })}
        onClose={() => setAsking(null)}
      />
    </>
  );
}
