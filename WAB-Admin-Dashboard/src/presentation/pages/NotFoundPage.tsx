import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { EmptyState } from '../components/feedback/EmptyState';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <EmptyState
      title={t('notFound.title')}
      description={t('notFound.text')}
      icon="alert"
      action={
        <Link className="wab-link" to={ROUTES.root}>
          {t('notFound.home')}
        </Link>
      }
    />
  );
}
