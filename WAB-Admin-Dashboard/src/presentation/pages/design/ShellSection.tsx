import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/core/Card';
import { Heading } from '../../components/core/Heading';
import { Text } from '../../components/core/Text';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import { GlobalSearch, type SearchResults } from '../../components/layout/GlobalSearch';

/** Gallery section for the shell pieces that need data later: global search results layout and breadcrumbs. */
export function ShellSection() {
  const { t } = useTranslation();
  const k = (key: string) => t(`designKits.shell.${key}`);
  const [picked, setPicked] = useState('');
  const search = (query: string): Promise<SearchResults> =>
    Promise.resolve(
      query.toLowerCase().includes('x')
        ? {}
        : {
            customers: [{ id: 'c1', label: k('customer'), hint: '+962 79 123 4567', to: '/customers' }],
            salons: [
              { id: 's1', label: k('salon'), hint: k('city'), to: '/salons' },
              { id: 's2', label: k('salon2'), hint: k('city'), to: '/salons' },
            ],
            bookings: [{ id: 'b1', label: 'WAB-7K2M9Q', hint: k('pending'), to: '/bookings' }],
          },
    );
  return (
    <Card className="wab-stack" aria-label={k('title')}>
      <Heading level={2}>{k('title')}</Heading>
      <GlobalSearch search={search} onSelect={(hit) => setPicked(hit.label)} />
      <Text tone="muted">{picked ? t('designKits.shell.picked', { label: picked }) : k('hint')}</Text>
      <Breadcrumbs crumbs={[{ label: k('crumbModule'), to: '#' }, { label: k('crumbPage') }]} />
    </Card>
  );
}
