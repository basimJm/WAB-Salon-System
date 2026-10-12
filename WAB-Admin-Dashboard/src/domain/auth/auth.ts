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
}

/** Domain contract. Remote and mock implementations live in `data/`; the UI only sees this. */
export interface AuthRepository {
  login(email: string, password: string): Promise<LoginChallenge>;
  verifyOtp(challengeId: string, code: string): Promise<Session>;
  resendOtp(challengeId: string): Promise<void>;
  logout(): Promise<void>;
}
