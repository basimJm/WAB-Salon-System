import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContainer } from '@/app/ContainerContext';
import { isEmail, isEmailCode } from '@/domain/profile/profile';
import { Button } from '../components/core/Button';
import { Card } from '../components/core/Card';
import { InlineAlert } from '../components/feedback/InlineAlert';
import { TextField } from '../components/form/TextField';
import { useToast } from '../components/overlay/Toast';
import { PROFILE_QUERY_KEY } from './profileQuery';

/** Two steps: the password and the new address send a code to that address; the code confirms the change. */
export function EmailChangeCard() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { repositories } = useContainer();
  const [v, setV] = useState({ email: '', password: '', code: '' });
  const [sent, setSent] = useState(false);
  const [bad, setBad] = useState<'email' | 'password' | 'code' | null>(null);
  const request = useMutation({
    mutationFn: () => repositories.profile.requestEmailChange(v.email.trim(), v.password),
    onSuccess: () => {
      setSent(true);
      toast.show(t('profile.codeSent', { email: v.email.trim() }), 'success');
    },
  });
  const verify = useMutation({
    mutationFn: () => repositories.profile.verifyEmailChange(v.code),
    onSuccess: async () => {
      toast.show(t('profile.emailChanged'), 'success');
      setSent(false);
      setV({ email: '', password: '', code: '' });
      await queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
  const send = () => {
    const found = !isEmail(v.email.trim()) ? 'email' : !v.password ? 'password' : null;
    setBad(found);
    if (!found) request.mutate();
  };
  const confirm = () => {
    const found = isEmailCode(v.code) ? null : 'code';
    setBad(found);
    if (!found) verify.mutate();
  };
  const err = (k: 'email' | 'password' | 'code') =>
    bad === k ? t(`profile.emailError.${k}`) : undefined;
  return (
    <Card aria-label={t('profile.changeEmail')}>
      <h2 className="wab-settings__title">{t('profile.changeEmail')}</h2>
      <div className="wab-settings__grid">
        <TextField
          label={t('profile.newEmail')}
          type="email"
          autoComplete="email"
          dir="ltr"
          disabled={sent}
          value={v.email}
          error={err('email')}
          onChange={(e) => setV({ ...v, email: e.target.value })}
        />
        <TextField
          label={t('profile.currentPassword')}
          type="password"
          autoComplete="current-password"
          dir="ltr"
          disabled={sent}
          value={v.password}
          error={err('password')}
          onChange={(e) => setV({ ...v, password: e.target.value })}
        />
        {sent ? (
          <TextField
            label={t('profile.code')}
            inputMode="numeric"
            autoComplete="one-time-code"
            dir="ltr"
            hint={t('profile.codeHint', { email: v.email.trim() })}
            value={v.code}
            error={err('code')}
            onChange={(e) => setV({ ...v, code: e.target.value.trim() })}
          />
        ) : null}
      </div>
      {request.error ? <InlineAlert error={request.error} /> : null}
      {verify.error ? <InlineAlert error={verify.error} /> : null}
      {sent ? (
        <Button loading={verify.isPending} onClick={confirm}>
          {t('profile.confirmEmail')}
        </Button>
      ) : (
        <Button loading={request.isPending} onClick={send}>
          {t('profile.sendCode')}
        </Button>
      )}
    </Card>
  );
}
