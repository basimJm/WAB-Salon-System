import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { OTP_LENGTH, OTP_VALID_MINUTES, RESEND_SECONDS } from '@/constants/auth';
import { Button } from '../../components/core/Button';
import { TextField } from '../../components/form/TextField';
import { maskEmail } from '../../controllers/maskEmail';
import { formatClock, useCountdown } from '../../hooks/useCountdown';

export interface OtpStepProps {
  email: string;
  code: string;
  error: string | undefined;
  busy: boolean;
  onCode: (value: string) => void;
  onResend: () => Promise<boolean>;
}

/** Second login step. Mounted only on this step, so the resend timer starts when the code was sent. */
export function OtpStep({ email, code, error, busy, onCode, onResend }: OtpStepProps) {
  const { t } = useTranslation();
  const { remaining, restart } = useCountdown(RESEND_SECONDS);
  const inputRef = useRef<HTMLInputElement>(null);
  // The user just pressed Continue: move focus to the code field.
  useEffect(() => inputRef.current?.focus(), []);
  const resend = async () => {
    if (await onResend()) restart();
  };
  return (
    <>
      <p className="wab-login__lead">
        {t('login.codeSubtitle', { length: OTP_LENGTH, minutes: OTP_VALID_MINUTES })}{' '}
        <bdi className="wab-login__email">{maskEmail(email)}</bdi>
      </p>
      <TextField
        label={t('login.code')}
        inputMode="numeric"
        autoComplete="one-time-code"
        dir="ltr"
        maxLength={OTP_LENGTH}
        value={code}
        onChange={(e) => onCode(e.target.value.replace(/\D/g, ''))}
        error={error}
        ref={inputRef}
      />
      <div className="wab-login__resend">
        <span>{t('login.noCode')}</span>
        {remaining > 0 ? (
          <span aria-live="polite" dir="ltr">
            {t('login.resendIn', { time: formatClock(remaining) })}
          </span>
        ) : (
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => void resend()}>
            {t('login.resend')}
          </Button>
        )}
      </div>
    </>
  );
}
