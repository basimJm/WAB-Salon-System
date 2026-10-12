import { z } from 'zod';
import { ENDPOINTS } from '@/constants/endpoints';
import type { AuthRepository, LoginChallenge, Session } from '@/domain/auth/auth';
import type { HttpClient } from '@/infrastructure/http/HttpClient';

const challengeSchema = z.object({ challengeId: z.string() });
const sessionSchema = z.object({
  accessToken: z.string(),
  admin: z.object({ id: z.string(), name: z.string(), email: z.string() }),
});
const emptySchema = z.null();

export class RemoteAuthRepository implements AuthRepository {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  async login(email: string, password: string): Promise<LoginChallenge> {
    const res = await this.http.post(ENDPOINTS.login, {
      schema: challengeSchema,
      body: { email, password },
    });
    return res.data;
  }

  async verifyOtp(challengeId: string, code: string): Promise<Session> {
    const res = await this.http.post(ENDPOINTS.verifyOtp, {
      schema: sessionSchema,
      body: { challengeId, code },
    });
    return res.data;
  }

  async resendOtp(challengeId: string): Promise<void> {
    await this.http.post(ENDPOINTS.resendOtp, { schema: emptySchema, body: { challengeId } });
  }

  async logout(): Promise<void> {
    await this.http.post(ENDPOINTS.logout, { schema: emptySchema });
  }
}
