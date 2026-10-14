export interface AdminProfile {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

export interface LoginChallenge {
  readonly challengeId: string;
}

export interface Session {
  readonly accessToken: string;
  readonly admin: AdminProfile;
  /** Epoch ms when the access token stops working; missing = unknown (the lifecycle then relies on 401). */
  readonly accessExpiresAt?: number;
  /** Rotates on every refresh and is revoked on logout. Kept in memory only. */
  readonly refreshToken?: string;
  readonly refreshExpiresAt?: number;
}

/** Domain contract. Remote and mock implementations live in `data/`; the UI only sees this. */
export interface AuthRepository {
  login(email: string, password: string): Promise<LoginChallenge>;
  verifyOtp(challengeId: string, code: string): Promise<Session>;
  resendOtp(challengeId: string): Promise<void>;
  /** Exchanges the refresh token for a new session (the old refresh token stops working). */
  refresh(refreshToken: string): Promise<Session>;
  /** Revokes the refresh token on the server. */
  logout(refreshToken?: string): Promise<void>;
}
