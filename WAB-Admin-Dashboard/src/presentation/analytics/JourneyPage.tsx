import { useState, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { LIST_PARAMS } from '@/constants/ui';
import { Button } from '../components/core/Button';
import { PageHeader } from '../components/core/PageHeader';
import { SectionCard } from '../components/core/SectionCard';
import { EmptyState } from '../components/feedback/EmptyState';
import { TextField } from '../components/form/TextField';
import { useLazyStrings } from '../hooks/useLazyStrings';

const J = 'analyticsOps.journey';

/**
 * Admin PRD A11 · User journey, design `04 Customers` A11: "Find a user" card, then the timeline. The server has
 * no journey endpoint yet (SRV-110 / ADM-077), so a search ends in the design's empty state with a way to open the
 * matching customers instead of an invented timeline.
 */
export default function JourneyPage() {
  useLazyStrings('analytics');
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [searched, setSearched] = useState<string | null>(null);
  const onSubmit = (event: SyntheticEvent) => {
    event.preventDefault();
    const query = text.trim();
    setSearched(query === '' ? null : query);
  };
  const toCustomers = () =>
    void navigate(
      `${ROUTES.customers}?${new URLSearchParams({ [LIST_PARAMS.search]: searched ?? '' }).toString()}`,
    );
  return (
    <div className="wab-page wab-stack">
      <PageHeader title={t('nav.userJourney')} subtitle={t(`${J}.sub`)} />
      <form onSubmit={onSubmit} noValidate>
        <SectionCard
          title={t(`${J}.find`)}
          footer={
            <>
              <span className="wab-section-card__note">{t(`${J}.foot`)}</span>
              <Button type="submit">{t(`${J}.search`)}</Button>
            </>
          }
        >
          <TextField
            label={t(`${J}.field`)}
            placeholder={t(`${J}.placeholder`)}
            dir="auto"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </SectionCard>
      </form>
      {searched === null ? (
        <EmptyState icon="route" title={t(`${J}.emptyTitle`)} description={t(`${J}.emptyText`)} />
      ) : (
        <EmptyState
          icon="route"
          title={t(`${J}.noDataTitle`)}
          description={t(`${J}.noDataText`)}
          action={
            <Button variant="secondary" onClick={toCustomers}>
              {t(`${J}.openCustomers`)}
            </Button>
          }
        />
      )}
    </div>
  );
}
