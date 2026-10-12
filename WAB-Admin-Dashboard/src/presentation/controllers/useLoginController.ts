import { useState } from 'react';
import { useContainer } from '@/app/ContainerContext';
import { normalizeError } from '@/infrastructure/errors/normalize';
import type { AppError } from '@/infrastructure/errors/AppError';
import { validateCode, validateCredentials, type FieldErrors } from './loginValidation';

export type LoginStep = 'credentials' | 'code';

export interface LoginController {
  step: LoginStep;
  busy: boolean;
  fieldErrors: FieldErrors;
  error: AppError | null;
  submitCredentials: (email: string, password: string) => Promise<void>;
  submitCode: (code: string) => Promise<boolean>;
  back: () => void;
}

/** Controller for the two-step admin login (email+password, then email OTP). */
export function useLoginController(): LoginController {
  const { repositories, session, logger } = useContainer();
  const [step, setStep] = useState<LoginStep>('credentials');
  const [challengeId, setChallengeId] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<AppError | null>(null);

  const run = async <T>(work: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    setError(null);
    try {
      return await work();
    } catch (e) {
      const appError = normalizeError(e);
      logger.warn('login.failed', { kind: appError.kind, traceId: appError.traceId });
      setError(appError);
      return undefined;
    } finally {
      setBusy(false);
    }
  };

  return {
    step,
    busy,
    fieldErrors,
    error,
    async submitCredentials(emailInput, password) {
      const errors = validateCredentials(emailInput, password);
      setFieldErrors(errors);
      if (Object.keys(errors).length > 0) return;
      const challenge = await run(() => repositories.auth.login(emailInput.trim(), password));
      if (!challenge) return;
      setEmail(emailInput.trim());
      setChallengeId(challenge.challengeId);
      setStep('code');
    },
    async submitCode(code) {
      const errors = validateCode(code);
      setFieldErrors(errors);
      if (Object.keys(errors).length > 0) return false;
      const result = await run(() => repositories.auth.verifyOtp(challengeId, code));
      if (!result) return false;
      session.set({ ...result, admin: { ...result.admin, email: result.admin.email || email } });
      return true;
    },
    back() {
      setStep('credentials');
      setFieldErrors({});
      setError(null);
    },
  };
}
