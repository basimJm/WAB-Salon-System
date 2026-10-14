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
const tokensSchema = z.object({
  accessToken: z.string(),
  accessTokenExpiresAt: z.iso.datetime({ offset: true }),
  refreshToken: z.string(),
  refreshTokenExpiresAt: z.iso.datetime({ offset: true }),
  admin: z.object({ id: z.string(), email: z.string() }),
});

/** Maps the server's token answer (verify-otp and refresh share it) to the in-memory session. */
export const sessionFromTokens = (data: z.infer<typeof tokensSchema>): Session => ({
  accessToken: data.accessToken,
  admin: { id: data.admin.id, email: data.admin.email, name: data.admin.email },
  accessExpiresAt: Date.parse(data.accessTokenExpiresAt),
  refreshToken: data.refreshToken,
  refreshExpiresAt: Date.parse(data.refreshTokenExpiresAt),
});

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

  async refresh(refreshToken: string): Promise<Session> {
    const res = await this.http.post(ENDPOINTS.refresh, {
      schema: tokensSchema,
      body: { refreshToken },
      noRefresh: true,
    });
    return sessionFromTokens(res.data);
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    await this.http.post(ENDPOINTS.logout, {
      schema: emptySchema,
      body: { refreshToken },
      noRefresh: true,
    });
  }
}
