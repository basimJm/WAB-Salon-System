import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useContainer } from '@/app/ContainerContext';
import { MEMBERS_QUERY } from '@/constants/branches';
import { ROUTES } from '@/constants/routes';
import type { SalonDetails, SalonMember } from '@/domain/salons/salons';
import { formatInstant, formatNumber } from '@/domain/shared/format';
import { Badge } from '../components/core/Badge';
import { KeyValue } from '../components/core/KeyValue';
import { StatusBadge } from '../components/core/StatusBadge';
import { DataTable } from '../components/data/DataTable';
import type { Column } from '../components/data/tableTypes';
import { DetailPage } from '../components/templates/DetailPage';
import { Select } from '../components/form/Select';
import { useBranchOptions } from '../hooks/useBranchOptions';
import { useLanguage } from '../hooks/useLanguage';
import { useLocationOptions } from '../hooks/useLocationOptions';
import { PayoutDetailsPanel } from './PayoutDetailsPanel';
import { DeletionDecision } from './DeletionDecision';
import { SalonActions } from './SalonActions';
import { SalonActivityTab } from './SalonActivityTab';
import { SalonInsightsTab } from './SalonInsightsTab';
import { BusinessBadges } from '../shared/BusinessBadges';
import { BranchesTab } from './branches/BranchesTab';

const TABS = ['overview', 'members', 'payout'] as const;

function Overview({ salon }: { salon: SalonDetails }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const cities = useLocationOptions('cities');
  const placeholder = t('salons.none');
  const items = [
    {
      key: 'type',
      label: t('business.type'),
      value: <BusinessBadges businessType={salon.businessType} audience={salon.audience} />,
    },
    {
      key: 'city',
      label: t('salons.city'),
      value: cities.find((c) => c.value === salon.cityId)?.label,
    },
    { key: 'phone', label: t('salons.phone'), value: salon.phone, ltr: true },
    { key: 'description', label: t('salons.description'), value: salon.description },
    {
      key: 'rating',
      label: t('salons.rating'),
      value: `${formatNumber(salon.rating.avg, language)} (${formatNumber(salon.rating.count, language)})`,
      ltr: true,
    },
    {
      key: 'created',
      label: t('salons.created'),
      value: formatInstant(salon.createdAt, language, 'date'),
      ltr: true,
    },
  ];
  return (
    <div className="wab-stack">
      <KeyValue items={items} placeholder={placeholder} />
      <section aria-label={t('salons.completeness')}>
        <h2 className="wab-settings__title">{t('salons.completeness')}</h2>
        {salon.completeness.isComplete ? (
          <Badge tone="green">{t('salons.complete')}</Badge>
        ) : (
          <ul>
            {salon.completeness.missing.map((m) => (
              <li key={m}>{t('salons.missingPart', { part: m })}</li>
            ))}
          </ul>
        )}
      </section>
      {salon.offline ? (
        <section aria-label={t('salons.offlineInfo')}>
          <h2 className="wab-settings__title">{t('salons.offlineInfo')}</h2>
          <p>{salon.offline.reason}</p>
          <p className="wab-muted">{formatInstant(salon.offline.at, language, 'date')}</p>
        </section>
      ) : null}
    </div>
  );
}

function Members({ salonId }: { salonId: string }) {
  const { t } = useTranslation();
  const { repositories } = useContainer();
  const branches = useBranchOptions(salonId);
  const [branch, setBranch] = useState('');
  const members = useQuery({
    queryKey: [MEMBERS_QUERY, { id: salonId, branch }],
    queryFn: () => repositories.salons.members(salonId, branch || undefined),
  });
  const branchOf = (m: SalonMember) =>
    m.branchId
      ? (branches.find((b) => b.value === m.branchId)?.label ?? '—')
      : t('salons.allBranches');
  const columns: Column<SalonMember>[] = [
    { key: 'name', header: t('salons.name'), render: (m) => m.name },
    { key: 'branch', header: t('branches.name'), render: branchOf },
    { key: 'phone', header: t('salons.phone'), ltr: true, render: (m) => m.phone },
    {
      key: 'role',
      header: t('salons.role'),
      render: (m) => t(`salons.roles.${m.role}`, { defaultValue: m.role }),
    },
    {
      key: 'perm',
      header: t('salons.permissions'),
      ltr: true,
      render: (m) => m.permissions.length,
    },
    {
      key: 'active',
      header: t('locations.status'),
      render: (m) => (
        <Badge tone={m.active ? 'green' : 'grey'}>
          {t(m.active ? 'locations.active' : 'locations.inactive')}
        </Badge>
      ),
    },
  ];
  return (
    <div className="wab-stack">
      {branches.length > 1 ? (
        <Select
          label={t('branches.filter.branch')}
          value={branch}
          options={[{ value: '', label: t('branches.filter.all') }, ...branches]}
          onChange={(e) => setBranch(e.target.value)}
        />
      ) : null}
      <DataTable
        columns={columns}
        rows={members.data ?? []}
        rowKey={(m) => m.id}
        caption={t('salons.members')}
        loading={members.isPending}
        error={members.error}
        onRetry={() => void members.refetch()}
      />
    </div>
  );
}

/** Admin PRD A13 · One salon: overview (profile facts, completeness, offline reason) and its members. */
export default function SalonDetailsPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { id = '' } = useParams();
  const { repositories } = useContainer();
  const [tab, setTab] = useState<string>(TABS[0]);
  const salon = useQuery({
    queryKey: ['getSalonsById', { id }],
    queryFn: () => repositories.salons.get(id),
  });
  const s = salon.data;
  return (
    <DetailPage
      title={s?.name ?? t('nav.sub.allSalons')}
      back={{ to: ROUTES.salons, label: t('nav.sub.allSalons') }}
      status={s ? <StatusBadge kind="salon" value={s.state} /> : null}
      actions={
        s ? (
          <>
            <SalonActions salon={s} />
            <DeletionDecision salon={s} />
          </>
        ) : null
      }
      tabs={[
        { id: 'overview', label: t('salons.overview'), content: s ? <Overview salon={s} /> : null },
        { id: 'branches', label: t('branches.tab'), content: <BranchesTab salonId={id} /> },
        { id: 'insights', label: t('salons.insights'), content: <SalonInsightsTab id={id} /> },
        {
          id: 'activity',
          label: t('salons.activity.title'),
          content: <SalonActivityTab id={id} />,
        },
        { id: 'payout', label: t('salons.payout'), content: <PayoutDetailsPanel salonId={id} /> },
        {
          id: 'members',
          label: t('salons.members'),
          content: <Members salonId={id} />,
        },
      ]}
      activeTab={tab}
      onTabChange={setTab}
      tabsLabel={t('salons.tabs')}
      aside={s ? <Aside salon={s} language={language} /> : null}
      loading={salon.isPending}
      error={salon.error}
      onRetry={() => void salon.refetch()}
    />
  );
}

function Aside({ salon, language }: { salon: SalonDetails; language: 'ar' | 'en' }) {
  const { t } = useTranslation();
  const placeholder = t('salons.none');
  return (
    <KeyValue
      placeholder={placeholder}
      items={[
        {
          key: 'owner',
          label: t('salons.owner'),
          value: salon.owner ? `${salon.owner.firstName} ${salon.owner.lastName}` : null,
        },
        { key: 'ownerPhone', label: t('salons.phone'), value: salon.owner?.phone, ltr: true },
        {
          key: 'sub',
          label: t('salons.subscription'),
          value: salon.subscription ? (
            <StatusBadge kind="subscription" value={salon.subscription.status} />
          ) : null,
        },
        {
          key: 'trial',
          label: t('salons.trialEnds'),
          value: salon.subscription
            ? formatInstant(salon.subscription.trialEndsAt, language, 'date')
            : null,
          ltr: true,
        },
      ]}
    />
  );
}
