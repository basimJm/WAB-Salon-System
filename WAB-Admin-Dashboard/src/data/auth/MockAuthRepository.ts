import {
  MOCK_ACCESS_TTL_MS,
  MOCK_ADMIN,
  MOCK_LATENCY_MS,
  MOCK_OTP_CODE,
  MOCK_OTP_TTL_MS,
  RESEND_SECONDS,
  MOCK_REFRESH_PREFIX,
  MOCK_REFRESH_TTL_MS,
  MOCK_TOKEN,
} from '@/constants/auth';
import type { AuthRepository, LoginChallenge, Session } from '@/domain/auth/auth';
import { AppError } from '@/infrastructure/errors/AppError';

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Contract-shaped fake used while the server auth task is unfinished (dev builds only). */
export class MockAuthRepository implements AuthRepository {
  private readonly pending = new Set<string>();
  /** Live refresh tokens -> admin email. A token works once: refresh rotates it, logout revokes it. */
  private readonly refreshTokens = new Map<string, string>();
  private issued = 0;
  private readonly latencyMs: number;

  constructor(latencyMs: number = MOCK_LATENCY_MS) {
    this.latencyMs = latencyMs;
  }

  async login(email: string): Promise<LoginChallenge> {
    await wait(this.latencyMs);
    this.pending.add(email);
    return {
      otpRequired: true,
      expiresAt: Date.now() + MOCK_OTP_TTL_MS,
      resendAfterSeconds: RESEND_SECONDS,
    };
  }

  async verifyOtp(email: string, code: string): Promise<Session> {
    await wait(this.latencyMs);
    if (!this.pending.has(email)) throw new AppError({ kind: 'unauthorized', status: 401 });
    if (code !== MOCK_OTP_CODE) throw new AppError({ kind: 'validation', status: 400 });
    return this.issue(email);
  }

  private issue(email: string): Session {
    this.issued += 1;
    const refreshToken = `${MOCK_REFRESH_PREFIX}${String(this.issued)}`;
    this.refreshTokens.set(refreshToken, email);
    const now = Date.now();
    return {
      accessToken: `${MOCK_TOKEN}-${String(this.issued)}`,
      admin: { ...MOCK_ADMIN, email },
      accessExpiresAt: now + MOCK_ACCESS_TTL_MS,
      refreshToken,
      refreshExpiresAt: now + MOCK_REFRESH_TTL_MS,
    };
  }

  async refresh(refreshToken: string): Promise<Session> {
    await wait(this.latencyMs);
    const email = this.refreshTokens.get(refreshToken);
    if (email === undefined) throw new AppError({ kind: 'unauthorized', status: 401 });
    this.refreshTokens.delete(refreshToken);
    return this.issue(email);
  }

  async logout(refreshToken?: string): Promise<void> {
    await wait(this.latencyMs);
    if (refreshToken) this.refreshTokens.delete(refreshToken);
  }
}
