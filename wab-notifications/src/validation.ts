import {
  EMAIL_PATTERN,
  HEADER_INJECTION_PATTERN,
  IDEMPOTENCY_KEY_PATTERN,
  PUSH_TOPIC_PATTERN,
  PUSH_APPS,
  PUSH_KINDS,
  PUSH_PRIORITIES,
  PUSH_INTERRUPTION_LEVELS,
  DEFAULT_LIMITS,
} from './constants/defaults';
import { validationError } from './errors';
import type { EmailRequest, PushMessage, PushRequest } from './types';

export interface Limits {
  readonly maxTokens: number;
  readonly maxEmailRecipients: number;
  readonly maxDataEntries: number;
  readonly maxCollapseKeyBytes: number;
}

const RESERVED_DATA_PREFIXES = ['google.', 'gcm.', 'firebase.'] as const;
const RESERVED_DATA_KEYS = ['from', 'message_type', 'collapse_key'] as const;

const fail = (message: string): never => {
  throw validationError(message);
};

const hasText = (value: string | undefined): boolean => value !== undefined && value.trim() !== '';
const oneOf = (list: readonly string[], value: string): boolean => list.includes(value);

export const assertIdempotencyKey = (key: string): void => {
  if (!IDEMPOTENCY_KEY_PATTERN.test(key)) fail('invalid idempotency key');
};

const assertData = (data: PushMessage['data'], limits: Limits): void => {
  if (data === undefined) return;
  const entries = Object.entries(data);
  if (entries.length > limits.maxDataEntries) fail('too many data entries');
  for (const [key, value] of entries) {
    if (key.trim() === '') fail('empty data key');
    if (typeof value !== 'string') fail('data values must be strings');
    if (RESERVED_DATA_PREFIXES.some((prefix) => key.startsWith(prefix))) fail('reserved data key');
    if ((RESERVED_DATA_KEYS as readonly string[]).includes(key)) fail('reserved data key');
  }
};

const assertMessage = (message: PushMessage, limits: Limits): void => {
  if (!oneOf(PUSH_APPS, message.app)) fail('unknown push app');
  if (!oneOf(PUSH_KINDS, message.kind)) fail('unknown push kind');
  if (message.priority !== undefined && !oneOf(PUSH_PRIORITIES, message.priority)) {
    fail('unknown push priority');
  }
  if (
    message.interruption !== undefined &&
    !oneOf(PUSH_INTERRUPTION_LEVELS, message.interruption)
  ) {
    fail('unknown interruption level');
  }
  if (message.kind === 'VISIBLE' && (!hasText(message.title) || !hasText(message.body))) {
    fail('a visible push needs a title and a body');
  }
  if (message.kind === 'DATA_ONLY') {
    if (message.title !== undefined || message.body !== undefined)
      fail('a data-only push has no text');
    if (message.data === undefined || Object.keys(message.data).length === 0) {
      fail('a data-only push needs data');
    }
  }
  if (message.badge !== undefined && (!Number.isSafeInteger(message.badge) || message.badge < 0)) {
    fail('badge must be a whole number from 0');
  }
  for (const [name, value] of [
    ['actionCategory', message.actionCategory],
    ['sound', message.sound],
    ['androidChannelId', message.androidChannelId],
    ['collapseKey', message.collapseKey],
  ] as const) {
    if (value !== undefined && !hasText(value)) fail(`${name} must not be blank`);
  }
  if (
    message.collapseKey !== undefined &&
    Buffer.byteLength(message.collapseKey, 'utf8') > limits.maxCollapseKeyBytes
  ) {
    fail('collapseKey too long');
  }
  assertData(message.data, limits);
};

export const assertPushRequest = (request: PushRequest, limits: Limits): void => {
  assertIdempotencyKey(request.idempotencyKey);
  const { target } = request;
  if ('tokens' in target) {
    if (target.tokens.length === 0) fail('no push tokens');
    if (target.tokens.length > limits.maxTokens) fail('too many push tokens');
    if (target.tokens.some((token) => token.trim() === '')) fail('empty push token');
    if (new Set(target.tokens).size !== target.tokens.length) fail('duplicate push token');
  } else if (!PUSH_TOPIC_PATTERN.test(target.topic)) {
    fail('invalid push topic');
  }
  assertMessage(request.message, limits);
};

export const assertEmailRequest = (request: EmailRequest, limits: Limits): void => {
  assertIdempotencyKey(request.idempotencyKey);
  const { to, subject, text } = request;
  if (to.length === 0 || to.length > limits.maxEmailRecipients) fail('invalid recipient count');
  if (
    to.some((address) => !EMAIL_PATTERN.test(address) || HEADER_INJECTION_PATTERN.test(address))
  ) {
    fail('invalid email address');
  }
  if (new Set(to.map((address) => address.toLowerCase())).size !== to.length) {
    fail('duplicate email address');
  }
  if (!hasText(subject) || !hasText(text)) fail('an email needs a subject and a text');
  if (HEADER_INJECTION_PATTERN.test(subject)) fail('subject must be a single line');
};

export const DEFAULT_VALIDATION_LIMITS: Limits = {
  maxTokens: DEFAULT_LIMITS.maxTokens,
  maxEmailRecipients: DEFAULT_LIMITS.maxEmailRecipients,
  maxDataEntries: DEFAULT_LIMITS.maxDataEntries,
  maxCollapseKeyBytes: DEFAULT_LIMITS.maxCollapseKeyBytes,
};
