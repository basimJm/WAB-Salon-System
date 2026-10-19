import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useContainer } from '@/app/ContainerContext';
import { ROUTES } from '@/constants/routes';
import { PageHeader } from '../components/core/PageHeader';
import { Tabs } from '../components/data/Tabs';
import { AsyncView } from '../components/feedback/AsyncView';
import { Skeleton } from '../components/feedback/Skeleton';
import { GalleryTab } from './GalleryTab';
import { HoursTab } from './HoursTab';
import { PolicyTab } from './PolicyTab';
import { ProfileTab } from './ProfileTab';
import { ServicesTab } from './ServicesTab';
import { StaffTab } from './StaffTab';

const TABS = ['profile', 'gallery', 'hours', 'services', 'staff', 'policy'] as const;
type TabId = (typeof TABS)[number];

/** Admin PRD A13 · edit a salon on its behalf: every change asks for a reason, is audited and told to the owner. */
export default function SalonEditPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const { repositories } = useContainer();
  const [tab, setTab] = useState<TabId>('profile');
  const salon = useQuery({
    queryKey: ['getSalonsById', id],
    queryFn: () => repositories.salons.get(id),
  });
  const gender = salon.data?.gender ?? 'FEMALE';
  const content: Record<TabId, React.ReactNode> = {
    profile: <ProfileTab salonId={id} />,
    gallery: <GalleryTab salonId={id} />,
    hours: <HoursTab salonId={id} />,
    services: <ServicesTab salonId={id} gender={gender} />,
    staff: <StaffTab salonId={id} gender={gender} />,
    policy: <PolicyTab salonId={id} />,
  };
  return (
    <>
      <PageHeader
        title={t('salonEdit.title', { name: salon.data?.name ?? '' })}
        subtitle={t('salonEdit.subtitle')}
        actions={<RouterLink to={`${ROUTES.salons}/${id}`}>{t('salonEdit.back')}</RouterLink>}
      />
      <AsyncView
        loading={salon.isPending}
        error={salon.error}
        onRetry={() => void salon.refetch()}
        skeleton={<Skeleton height="lg" />}
      >
        <Tabs
          ariaLabel={t('salonEdit.title', { name: salon.data?.name ?? '' })}
          activeId={tab}
          onChange={(next) => setTab(TABS.find((x) => x === next) ?? 'profile')}
          items={TABS.map((x) => ({ id: x, label: t(`salonEdit.tab.${x}`), content: content[x] }))}
        />
      </AsyncView>
    </>
  );
}
