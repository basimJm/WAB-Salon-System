import {
  EMAIL_CODE_PATTERN,
  EMAIL_PATTERN,
  MAX_ALERT_EMAILS,
  MAX_EMAIL_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_NEW_PASSWORD_LENGTH,
} from '@/constants/auth';

export interface AdminProfile {
  readonly id: string;
  readonly email: string;
  readonly alertEmails: readonly string[];
  readonly lastLoginAt: string | null;
}

/** Step 1 of an email change: a code was sent to the new address. */
export interface EmailChangeChallenge {
  readonly expiresAt: string;
  readonly resendAfterSeconds: number;
}

export interface ProfileRepository {
  get(): Promise<AdminProfile>;
  /** Replaces the whole recipient list. */
  saveAlertEmails(emails: readonly string[]): Promise<AdminProfile>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  requestEmailChange(newEmail: string, password: string): Promise<EmailChangeChallenge>;
  verifyEmailChange(code: string): Promise<AdminProfile>;
}

export const isEmail = (value: string): boolean =>
  value.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(value);

export const isEmailCode = (value: string): boolean => EMAIL_CODE_PATTERN.test(value);

export interface ParsedRecipients {
  readonly emails: readonly string[];
  readonly invalid: readonly string[];
  readonly tooMany: boolean;
}

/** Splits free text (lines, commas, semicolons, spaces), trims, lowercases and de-duplicates. */
export function parseAlertEmails(text: string): ParsedRecipients {
  const seen = new Set<string>();
  const invalid: string[] = [];
  for (const raw of text.split(/[\s,;]+/)) {
    const email = raw.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    if (!isEmail(email)) invalid.push(email);
  }
  const emails = [...seen].filter(isEmail);
  return { emails, invalid, tooMany: emails.length > MAX_ALERT_EMAILS };
}

export type PasswordProblem = 'current' | 'short' | 'long' | 'same' | 'mismatch';

/** The first problem with a password change form, or null when it can be sent. */
export function passwordProblem(
  current: string,
  next: string,
  confirm: string,
): PasswordProblem | null {
  if (!current) return 'current';
  if (next.length < MIN_NEW_PASSWORD_LENGTH) return 'short';
  if (next.length > MAX_PASSWORD_LENGTH) return 'long';
  if (next === current) return 'same';
  if (next !== confirm) return 'mismatch';
  return null;
}
