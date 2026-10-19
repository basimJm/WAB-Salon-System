import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { formatInstant } from '@/domain/shared/format';
import { Card } from '../components/core/Card';
import { KeyValue } from '../components/core/KeyValue';
import { PageHeader } from '../components/core/PageHeader';
import { AsyncView } from '../components/feedback/AsyncView';
import { Skeleton } from '../components/feedback/Skeleton';
import { useLanguage } from '../hooks/useLanguage';
import { AlertEmailsCard } from './AlertEmailsCard';
import { EmailChangeCard } from './EmailChangeCard';
import { PasswordCard } from './PasswordCard';
import { PROFILE_QUERY_KEY } from './profileQuery';

/** Admin PRD §4 · the signed-in admin: account, alert recipients, password and email change. */
export default function ProfilePage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { repositories } = useContainer();
  const query = useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () => repositories.profile.get(),
  });
  const profile = query.data;
  return (
    <>
      <PageHeader title={t('profile.title')} subtitle={t('profile.subtitle')} />
      <AsyncView
        loading={query.isPending}
        error={query.error}
        onRetry={() => void query.refetch()}
        skeleton={<Skeleton height="lg" />}
      >
        {profile ? (
          <div className="wab-settings">
            <Card aria-label={t('profile.account')}>
              <h2 className="wab-settings__title">{t('profile.account')}</h2>
              <KeyValue
                placeholder={t('salons.none')}
                items={[
                  {
                    key: '0',
                    label: t('profile.email'),
                    value: <span dir="ltr">{profile.email}</span>,
                  },
                  {
                    key: '1',
                    label: t('profile.lastLogin'),
                    value: profile.lastLoginAt
                      ? formatInstant(profile.lastLoginAt, language, 'dateTime')
                      : t('profile.never'),
                  },
                ]}
              />
            </Card>
            <AlertEmailsCard profile={profile} />
            <PasswordCard />
            <EmailChangeCard />
          </div>
        ) : null}
      </AsyncView>
    </>
  );
}
