import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { MIN_NEW_PASSWORD_LENGTH } from '@/constants/auth';
import { passwordProblem, type PasswordProblem } from '@/domain/profile/profile';
import { Button } from '../components/core/Button';
import { Card } from '../components/core/Card';
import { InlineAlert } from '../components/feedback/InlineAlert';
import { TextField } from '../components/form/TextField';
import { useToast } from '../components/overlay/Toast';

const EMPTY = { current: '', next: '', confirm: '' };

/** Current + new password; the server also checks the current one and ends other sessions as it decides. */
export function PasswordCard() {
  const { t } = useTranslation();
  const toast = useToast();
  const { repositories } = useContainer();
  const [v, setV] = useState(EMPTY);
  const [problem, setProblem] = useState<PasswordProblem | null>(null);
  const change = useMutation({
    mutationFn: () => repositories.profile.changePassword(v.current, v.next),
    onSuccess: () => {
      toast.show(t('profile.passwordChanged'), 'success');
      setV(EMPTY);
    },
  });
  const submit = () => {
    const found = passwordProblem(v.current, v.next, v.confirm);
    setProblem(found);
    if (!found) change.mutate();
  };
  const err = (...keys: PasswordProblem[]) =>
    problem && keys.includes(problem)
      ? t(`profile.passwordError.${problem}`, { min: MIN_NEW_PASSWORD_LENGTH })
      : undefined;
  return (
    <Card aria-label={t('profile.password')}>
      <h2 className="app-settings__title">{t('profile.password')}</h2>
      <div className="app-settings__grid">
        <TextField
          label={t('profile.currentPassword')}
          type="password"
          autoComplete="current-password"
          dir="ltr"
          value={v.current}
          error={err('current')}
          onChange={(e) => setV({ ...v, current: e.target.value })}
        />
        <TextField
          label={t('profile.newPassword')}
          type="password"
          autoComplete="new-password"
          dir="ltr"
          hint={t('profile.newPasswordHint', { min: MIN_NEW_PASSWORD_LENGTH })}
          value={v.next}
          error={err('short', 'long', 'same')}
          onChange={(e) => setV({ ...v, next: e.target.value })}
        />
        <TextField
          label={t('profile.confirmPassword')}
          type="password"
          autoComplete="new-password"
          dir="ltr"
          value={v.confirm}
          error={err('mismatch')}
          onChange={(e) => setV({ ...v, confirm: e.target.value })}
        />
      </div>
      {change.error ? <InlineAlert error={change.error} /> : null}
      <Button loading={change.isPending} onClick={submit}>
        {t('profile.changePassword')}
      </Button>
    </Card>
  );
}
