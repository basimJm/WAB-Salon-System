import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useContainer } from '@/app/ContainerContext';
import { ROUTES } from '@/constants/routes';
import type { ApplicationDetails } from '@/domain/applications/applications';
import { formatInstant } from '@/domain/shared/format';
import { Button } from '../components/core/Button';
import { KeyValue } from '../components/core/KeyValue';
import { StatusBadge } from '../components/core/StatusBadge';
import { ReasonDialog } from '../components/overlay/ReasonDialog';
import { useToast } from '../components/overlay/Toast';
import { DetailPage } from '../components/templates/DetailPage';
import { useLanguage } from '../hooks/useLanguage';
import { useLocationOptions } from '../hooks/useLocationOptions';
import { BusinessBadges } from '../shared/BusinessBadges';
import { ApplicationDocuments } from './ApplicationDocuments';

type Decision = 'approve' | 'reject' | null;

function Facts({ application }: { application: ApplicationDetails }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const cities = useLocationOptions('cities');
  return (
    <div className="wab-stack">
      <KeyValue
        placeholder={t('salons.none')}
        items={[
          {
            key: 'owner',
            label: t('salons.owner'),
            value: application.owner
              ? `${application.owner.firstName} ${application.owner.lastName}`
              : null,
          },
          { key: 'phone', label: t('salons.phone'), value: application.owner?.phone, ltr: true },
          {
            key: 'type',
            label: t('business.type'),
            value: (
              <BusinessBadges
                businessType={application.businessType}
                audience={application.audience}
              />
            ),
          },
          {
            key: 'city',
            label: t('salons.city'),
            value: cities.find((c) => c.value === application.cityId)?.label,
          },
          { key: 'description', label: t('salons.description'), value: application.description },
          {
            key: 'submitted',
            label: t('applications.submitted'),
            value: formatInstant(application.submittedAt, language, 'date'),
            ltr: true,
          },
          {
            key: 'resub',
            label: t('applications.resubmissions'),
            value: String(application.resubmissionCount),
            ltr: true,
          },
          {
            key: 'rejection',
            label: t('applications.lastRejection'),
            value: application.rejectionReason,
          },
        ]}
      />
      <ApplicationDocuments application={application} />
    </div>
  );
}

/** Admin PRD A14 · Review one application: type + audience, license (and clinic medical license) documents, approve or reject. */
export default function ApplicationReviewPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { repositories } = useContainer();
  const [asking, setAsking] = useState<Decision>(null);
  // Signed links expire quickly: never keep them in the cache.
  const query = useQuery({
    queryKey: ['getSalonsApplicationsById', { id }],
    queryFn: () => repositories.applications.get(id),
    gcTime: 0,
    staleTime: 0,
  });
  const decide = useMutation({
    mutationFn: ({ kind, reason }: { kind: Exclude<Decision, null>; reason: string }) =>
      kind === 'approve'
        ? repositories.applications.approve(id, reason)
        : repositories.applications.reject(id, reason),
    onSuccess: async (_r, { kind }) => {
      setAsking(null);
      toast.show(
        t(kind === 'approve' ? 'applications.approved' : 'applications.rejected'),
        'success',
      );
      await queryClient.invalidateQueries({ queryKey: ['getSalonsApplications'] });
      void navigate(`${ROUTES.salons}/applications`);
    },
  });
  const a = query.data;
  const pending = a?.state === 'APPLICATION_PENDING';
  return (
    <>
      <DetailPage
        title={a?.name ?? t('nav.sub.applications')}
        back={{ to: `${ROUTES.salons}/applications`, label: t('nav.sub.applications') }}
        status={a ? <StatusBadge kind="salon" value={a.state} /> : null}
        actions={
          pending ? (
            <>
              <Button onClick={() => setAsking('approve')}>{t('applications.approve')}</Button>
              <Button variant="secondary" onClick={() => setAsking('reject')}>
                {t('applications.reject')}
              </Button>
            </>
          ) : null
        }
        tabs={[
          {
            id: 'review',
            label: t('applications.review'),
            content: a ? <Facts application={a} /> : null,
          },
        ]}
        activeTab="review"
        onTabChange={() => undefined}
        tabsLabel={t('applications.review')}
        loading={query.isPending}
        error={query.error}
        onRetry={() => void query.refetch()}
      />
      <ReasonDialog
        open={asking !== null}
        destructive={asking === 'reject'}
        title={t(asking === 'reject' ? 'applications.rejectTitle' : 'applications.approveTitle', {
          name: a?.name ?? '',
        })}
        description={t(
          asking === 'reject' ? 'applications.rejectText' : 'applications.approveText',
        )}
        confirmLabel={t(asking === 'reject' ? 'applications.reject' : 'applications.approve')}
        loading={decide.isPending}
        onConfirm={(reason) => asking && decide.mutate({ kind: asking, reason })}
        onClose={() => setAsking(null)}
      />
    </>
  );
}
