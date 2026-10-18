import { LIMIT_KEY_PREFIX, MS_PER_SECOND } from '../constants/defaults';
import type { LimitStore } from '../ports';

export interface LimitsConfig {
  readonly requestMax: number;
  readonly requestWindowSec: number;
  readonly wrongMax: number;
  readonly blockSec: number;
  readonly resendAfterSec: number;
}

export interface RequestDecision {
  readonly allowed: boolean;
  readonly resendAfterSeconds: number;
  readonly retryAfterMs: number;
  readonly blocked: boolean;
}

export interface WrongDecision {
  readonly blocked: boolean;
  readonly retryAfterMs: number;
  readonly attemptsRemaining: number;
}

export interface BlockStatus {
  readonly blocked: boolean;
  readonly retryAfterMs: number;
}

export interface Limits {
  /** An OTP is about to be requested: platform limits and resend cooldown. */
  request(phone: string): Promise<RequestDecision>;
  /** The user typed a wrong code: counts toward the wrong-attempt block. */
  wrongAttempt(phone: string): Promise<WrongDecision>;
  /** Looks without counting (EXPIRED / PROVIDER_ERROR reports and verification). */
  status(phone: string): Promise<BlockStatus & { attemptsRemaining: number }>;
  /** Clears counters, block and cooldown (successful verification, admin unblock). */
  reset(phone: string): Promise<void>;
}

const toSeconds = (ms: number): number => Math.ceil(ms / MS_PER_SECOND);

/**
 * Request and wrong-code limits over a `LimitStore`. The request that reaches a limit is allowed
 * and starts the block; later ones are denied without being counted. Requests and wrong codes
 * share one block per phone (same semantics as the WAB-Server gate).
 */
export const createLimits = (store: LimitStore, config: LimitsConfig, prefix: string): Limits => {
  const blockMs = config.blockSec * MS_PER_SECOND;
  const keys = (phone: string): { req: string; wrong: string; block: string; resend: string } => ({
    req: `${prefix}${LIMIT_KEY_PREFIX.requests}:${phone}`,
    wrong: `${prefix}${LIMIT_KEY_PREFIX.wrong}:${phone}`,
    block: `${prefix}${LIMIT_KEY_PREFIX.block}:${phone}`,
    resend: `${prefix}${LIMIT_KEY_PREFIX.resend}:${phone}`,
  });

  return {
    async request(phone) {
      const k = keys(phone);
      const blockLeft = await store.blockTtlMs(k.block);
      if (blockLeft > 0)
        return { allowed: false, blocked: true, resendAfterSeconds: 0, retryAfterMs: blockLeft };
      const cooldown = await store.startCooldown(k.resend, config.resendAfterSec * MS_PER_SECOND);
      if (!cooldown.started)
        return {
          allowed: false,
          blocked: false,
          resendAfterSeconds: toSeconds(cooldown.retryAfterMs),
          retryAfterMs: cooldown.retryAfterMs,
        };
      const hit = await store.hit({
        counterKey: k.req,
        blockKey: k.block,
        limit: config.requestMax,
        windowMs: config.requestWindowSec * MS_PER_SECOND,
        blockMs,
      });
      if (!hit.allowed)
        return {
          allowed: false,
          blocked: true,
          resendAfterSeconds: 0,
          retryAfterMs: hit.retryAfterMs,
        };
      return {
        allowed: true,
        blocked: false,
        resendAfterSeconds: config.resendAfterSec,
        retryAfterMs: 0,
      };
    },

    async wrongAttempt(phone) {
      const k = keys(phone);
      // The wrong-code counter lives as long as a block (BUSINESS_DOMAIN §3.1).
      const hit = await store.hit({
        counterKey: k.wrong,
        blockKey: k.block,
        limit: config.wrongMax,
        windowMs: blockMs,
        blockMs,
      });
      return {
        blocked: hit.blocked,
        retryAfterMs: hit.blocked ? hit.retryAfterMs : 0,
        attemptsRemaining: hit.blocked ? 0 : Math.max(0, config.wrongMax - hit.count),
      };
    },

    async status(phone) {
      const k = keys(phone);
      const [retryAfterMs, count] = await Promise.all([
        store.blockTtlMs(k.block),
        store.countOf(k.wrong),
      ]);
      return {
        blocked: retryAfterMs > 0,
        retryAfterMs,
        attemptsRemaining: retryAfterMs > 0 ? 0 : Math.max(0, config.wrongMax - count),
      };
    },

    async reset(phone) {
      const k = keys(phone);
      await store.reset([k.req, k.wrong, k.block, k.resend]);
    },
  };
};
