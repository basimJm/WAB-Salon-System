import type { Request, Response } from 'express';
import type { OtpGate } from '../../../domain/otp/otpGate.service';
import { sendSuccess } from '../../../utils/response/successResponse';

const phoneOf = (req: Request): string => (req.validated as { body: { phone: string } }).body.phone;

const iso = (date: Date | undefined): string | undefined => date?.toISOString();

/** Thin handlers: validated body in, one gate call, base success envelope out. */
export const createOtpController = (
  gate: OtpGate,
): {
  request: (req: Request, res: Response) => Promise<void>;
  wrongAttempt: (req: Request, res: Response) => Promise<void>;
} => ({
  async request(req: Request, res: Response): Promise<void> {
    const decision = await gate.request(phoneOf(req));
    sendSuccess(req, res, {
      data: {
        allowed: decision.allowed,
        otpLength: decision.otpLength,
        resendAfterSeconds: decision.resendAfterSeconds,
        ...(decision.blockedUntil === undefined
          ? {}
          : { blockedUntil: iso(decision.blockedUntil) }),
      },
    });
  },

  async wrongAttempt(req: Request, res: Response): Promise<void> {
    const result = await gate.reportWrongAttempt(phoneOf(req));
    sendSuccess(req, res, {
      data: {
        blocked: result.blocked,
        attemptsRemaining: result.attemptsRemaining,
        ...(result.blockedUntil === undefined ? {} : { blockedUntil: iso(result.blockedUntil) }),
      },
    });
  },
});
