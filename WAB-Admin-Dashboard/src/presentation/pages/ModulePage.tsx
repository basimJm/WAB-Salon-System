import { useTranslation } from 'react-i18next';
import { NAV_ITEMS } from '@/constants/nav';
import { PageHeader } from '../components/core/PageHeader';
import { EmptyState } from '../components/feedback/EmptyState';
import type { RoutePath } from '@/constants/routes';

/** Placeholder for a module whose feature task (ADM-02…05) has not landed yet. */
export function ModulePage({ path }: { path: RoutePath }) {
  const { t } = useTranslation();
  const item = NAV_ITEMS.find((n) => n.path === path);
  return (
    <>
      <PageHeader title={item ? t(item.labelKey) : t('app.name')} />
      <EmptyState
        title={t('module.comingSoon')}
        description={t('module.comingSoonText')}
        icon={item?.icon ?? 'inbox'}
      />
    </>
  );
}
