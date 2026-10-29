import { MOCK_EMAIL_CODE, MOCK_OTP_TTL_MS, RESEND_SECONDS } from '@/constants/auth';
import { defineEndpoint } from '../api/endpoint';
import * as dto from '../contract/generated/dto';
import { OPERATIONS } from '../contract/generated/operations';
import { mockRoute } from './mockRoute';
import type { MockRoute } from './mockTransport';

const O = OPERATIONS;

export function profileRoutes(): readonly MockRoute[] {
  const profile = {
    id: '64a000000000000000000001',
    email: 'admin@example.test',
    alertEmails: ['ops@example.test'] as string[],
    lastLoginAt: '2026-10-18T07:30:00.000Z' as string | null,
  };
  let pendingEmail: string | null = null;
  const view = () => ({ ...profile, alertEmails: [...profile.alertEmails] });
  return [
    mockRoute(defineEndpoint(O.getProfile, { data: dto.getProfileDataSchema }), () => ({
      data: view(),
    })),
    mockRoute(
      defineEndpoint(O.patchProfile, {
        data: dto.patchProfileDataSchema,
        body: dto.patchProfileBodySchema,
      }),
      ({ body }) => {
        profile.alertEmails = [...(body as { alertEmails: string[] }).alertEmails];
        return { data: view() };
      },
    ),
    mockRoute(
      defineEndpoint(O.postProfilePassword, {
        data: dto.postProfilePasswordDataSchema,
        body: dto.postProfilePasswordBodySchema,
      }),
      () => ({ data: null }),
    ),
    mockRoute(
      defineEndpoint(O.postProfileEmailRequest, {
        data: dto.postProfileEmailRequestDataSchema,
        body: dto.postProfileEmailRequestBodySchema,
      }),
      ({ body }) => {
        pendingEmail = (body as { newEmail: string }).newEmail;
        return {
          data: {
            expiresAt: new Date(Date.now() + MOCK_OTP_TTL_MS).toISOString(),
            resendAfterSeconds: RESEND_SECONDS,
          },
        };
      },
    ),
    mockRoute(
      defineEndpoint(O.postProfileEmailVerify, {
        data: dto.postProfileEmailVerifyDataSchema,
        body: dto.postProfileEmailVerifyBodySchema,
      }),
      ({ body }) => {
        if (!pendingEmail || (body as { code: string }).code !== MOCK_EMAIL_CODE) {
          throw new Error('wrong code');
        }
        profile.email = pendingEmail;
        pendingEmail = null;
        return { data: view() };
      },
    ),
  ];
}
