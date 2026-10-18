import { z } from 'zod';
import { EVENT_RULES } from './constants/defaults';
import { ERROR_CODES } from './constants/codes';
import { AnalyticsError } from './errors';
import { redact } from './logger';
import type { ActorRef, IdentityLink, ServerEventInput, StoredEvent } from './types';

export interface Patterns {
  readonly idPattern: RegExp;
  readonly installationPattern: RegExp;
}

const eventSchema = (patterns: Patterns): z.ZodType<ServerEventInput> => {
  const id = z.string().regex(patterns.idPattern);
  return z
    .object({
      name: z.string().max(EVENT_RULES.nameMaxLength).regex(EVENT_RULES.namePattern),
      actorType: z.string().regex(EVENT_RULES.typePattern),
      actorId: id.optional(),
      salonId: id.optional(),
      bookingId: id.optional(),
      params: z.record(z.string(), z.unknown()).optional(),
      platform: z.string().regex(EVENT_RULES.platformPattern).optional(),
      appVersion: z.string().min(1).max(EVENT_RULES.appVersionMaxLength).optional(),
    })
    .strict() as z.ZodType<ServerEventInput>;
};

const invalid = (message: string, paths: string[]): AnalyticsError =>
  new AnalyticsError(ERROR_CODES.ANALYTICS_EVENT_INVALID, message, { details: { paths } });

/** Validates an event and returns it with secrets redacted and the time stamped. */
export const buildEvent = (input: unknown, patterns: Patterns, now: Date): StoredEvent => {
  const parsed = eventSchema(patterns).safeParse(input);
  if (!parsed.success) {
    throw invalid(
      'invalid event',
      parsed.error.issues.map((issue) => issue.path.join('.')),
    );
  }
  const { params = {}, ...rest } = parsed.data;
  const safeParams = redact(params) as Record<string, unknown>;
  if (JSON.stringify(safeParams).length > EVENT_RULES.maxParamsBytes) {
    throw invalid('event params are too large', ['params']);
  }
  return { ...rest, params: safeParams, ts: now };
};

/** Validates an actor or identity link (throws `VALIDATION_FAILED`-style event error). */
export const assertActor = (actor: ActorRef, patterns: Patterns): void => {
  const ok =
    EVENT_RULES.typePattern.test(actor.actorType) && patterns.idPattern.test(actor.actorId);
  if (!ok) throw invalid('invalid actor', ['actorType', 'actorId']);
};

export const assertLink = (link: IdentityLink, patterns: Patterns): void => {
  assertActor(link, patterns);
  if (!patterns.installationPattern.test(link.installationId)) {
    throw invalid('invalid installation id', ['installationId']);
  }
};
