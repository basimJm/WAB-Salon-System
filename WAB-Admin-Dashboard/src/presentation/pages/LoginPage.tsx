import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BRAND_MARK } from '@/constants/ui';
import { OTP_LENGTH } from '@/constants/auth';
import { LOGIN_REDIRECT_PARAM, ROUTES } from '@/constants/routes';
import { Button } from '../components/core/Button';
import { Card } from '../components/core/Card';
import { TextField } from '../components/form/TextField';
import { ErrorState } from '../components/feedback/ErrorState';
import { safeRedirect } from '../controllers/loginValidation';
import { useLoginController } from '../controllers/useLoginController';

/** A00 — email + password, then the emailed one-time code. */
export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ctrl = useLoginController();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const fieldError = (key: string | undefined) =>
    key ? t(key, { length: OTP_LENGTH }) : undefined;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (ctrl.step === 'credentials') {
      await ctrl.submitCredentials(email, password);
    } else if (await ctrl.submitCode(code)) {
      void navigate(safeRedirect(params.get(LOGIN_REDIRECT_PARAM), ROUTES.liveOverview), {
        replace: true,
      });
    }
  };

  return (
    <div className="wab-auth">
      <Card className="wab-auth__card">
        <span className="wab-logo">{BRAND_MARK}</span>
        <h1 className="wab-auth__title">
          {t(ctrl.step === 'credentials' ? 'login.title' : 'login.codeTitle')}
        </h1>
        <form className="wab-auth__form" onSubmit={(e) => void onSubmit(e)} noValidate>
          {ctrl.step === 'credentials' ? (
            <>
              <TextField
                label={t('login.email')}
                type="email"
                autoComplete="username"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={fieldError(ctrl.fieldErrors.email)}
              />
              <TextField
                label={t('login.password')}
                type="password"
                autoComplete="current-password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldError(ctrl.fieldErrors.password)}
              />
            </>
          ) : (
            <TextField
              label={t('login.code')}
              hint={t('login.codeHint')}
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              maxLength={OTP_LENGTH}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              error={fieldError(ctrl.fieldErrors.code)}
            />
          )}
          {ctrl.error ? <ErrorState error={ctrl.error} /> : null}
          <Button type="submit" block loading={ctrl.busy}>
            {t(ctrl.step === 'credentials' ? 'login.continue' : 'login.verify')}
          </Button>
          {ctrl.step === 'code' ? (
            <Button variant="ghost" block onClick={ctrl.back}>
              {t('common.back')}
            </Button>
          ) : null}
        </form>
      </Card>
    </div>
  );
}
