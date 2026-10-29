import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { MAX_ALERT_EMAILS } from '@/constants/auth';
import { parseAlertEmails, type AdminProfile } from '@/domain/profile/profile';
import { Button } from '../components/core/Button';
import { Card } from '../components/core/Card';
import { InlineAlert } from '../components/feedback/InlineAlert';
import { TextArea } from '../components/form/TextArea';
import { useToast } from '../components/overlay/Toast';
import { PROFILE_QUERY_KEY } from './profileQuery';

/** One address per line (commas also work); the server stores the whole list. */
export function AlertEmailsCard({ profile }: { profile: AdminProfile }) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { repositories } = useContainer();
  const [text, setText] = useState(profile.alertEmails.join('\n'));
  const [problem, setProblem] = useState<string | undefined>();
  const save = useMutation({
    mutationFn: (emails: readonly string[]) => repositories.profile.saveAlertEmails(emails),
    onSuccess: async (saved) => {
      toast.show(t('profile.alertsSaved'), 'success');
      setText(saved.alertEmails.join('\n'));
      await queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
  const submit = () => {
    const parsed = parseAlertEmails(text);
    if (parsed.invalid.length > 0) {
      setProblem(t('profile.alertsInvalid', { emails: parsed.invalid.join(', ') }));
    } else if (parsed.tooMany) {
      setProblem(t('profile.alertsTooMany', { max: MAX_ALERT_EMAILS }));
    } else {
      setProblem(undefined);
      save.mutate(parsed.emails);
    }
  };
  return (
    <Card aria-label={t('profile.alerts')}>
      <h2 className="app-settings__title">{t('profile.alerts')}</h2>
      <TextArea
        label={t('profile.alertsLabel')}
        dir="ltr"
        rows={4}
        value={text}
        error={problem}
        onChange={(e) => setText(e.target.value)}
      />
      <p>{t('profile.alertsHint', { max: MAX_ALERT_EMAILS })}</p>
      {save.error ? <InlineAlert error={save.error} /> : null}
      <Button loading={save.isPending} onClick={submit}>
        {t('profile.saveAlerts')}
      </Button>
    </Card>
  );
}
