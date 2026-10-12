import { MOCK_ADMIN, MOCK_LATENCY_MS, MOCK_OTP_CODE, MOCK_TOKEN } from '@/constants/auth';
import type { AuthRepository, LoginChallenge, Session } from '@/domain/auth/auth';
import { AppError } from '@/infrastructure/errors/AppError';

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Contract-shaped fake used while the server auth task is unfinished (dev builds only). */
export class MockAuthRepository implements AuthRepository {
  private readonly emails = new Map<string, string>();
  private readonly latencyMs: number;

  constructor(latencyMs: number = MOCK_LATENCY_MS) {
    this.latencyMs = latencyMs;
  }

  async login(email: string): Promise<LoginChallenge> {
    await wait(this.latencyMs);
    const challengeId = `challenge-${this.emails.size + 1}`;
    this.emails.set(challengeId, email);
    return { challengeId };
  }

  async verifyOtp(challengeId: string, code: string): Promise<Session> {
    await wait(this.latencyMs);
    const email = this.emails.get(challengeId);
    if (email === undefined) throw new AppError({ kind: 'unauthorized', status: 401 });
    if (code !== MOCK_OTP_CODE) throw new AppError({ kind: 'validation', status: 400 });
    return { accessToken: MOCK_TOKEN, admin: { ...MOCK_ADMIN, email } };
  }

  async logout(): Promise<void> {
    await wait(this.latencyMs);
  }
}
