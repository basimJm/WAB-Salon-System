import {
  ARQAM_DELIVERY_STATES,
  ARQAM_MODES,
  type ArqamMode,
  type DeliveryState,
} from '../../constants/arqam';
import { asRecord } from '../http';

/** `GET /sms/account`, normalized. Unknown modes are `UNKNOWN` (never assumed live or test). */
export interface ArqamAccount {
  readonly mode: ArqamMode;
  /** Credits left, when ARQAM says. */
  readonly balance: number | undefined;
  /** ARQAM's account status text (`active`…), when present. */
  readonly status: string | undefined;
}

export interface DeliveryEvent {
  readonly state: DeliveryState;
  readonly timestamp: string | undefined;
  readonly errorCode: string | undefined;
  readonly errorMessage: string | undefined;
}

/** `GET /messages/{messageId}/history`, normalized. */
export interface DeliveryStatus {
  readonly messageId: string;
  readonly state: DeliveryState;
  readonly history: readonly DeliveryEvent[];
}

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

const amount = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)))
    return Number(value);
  return undefined;
};

/** Lower-cased vendor value → our enum, `fallback` when unknown. */
const lookup = <T extends string>(
  table: Readonly<Record<string, T>>,
  value: unknown,
  fallback: T,
): T => {
  const key = typeof value === 'string' ? value.toLowerCase() : '';
  return Object.hasOwn(table, key) ? (table[key] ?? fallback) : fallback;
};

/** The account fields may sit at the top level or under `account` / `data`. */
const accountFields = (body: unknown): Readonly<Record<string, unknown>> | null => {
  const root = asRecord(body);
  if (root === null) return null;
  return asRecord(root['account']) ?? asRecord(root['data']) ?? root;
};

/** `null` when the answer is not an object (malformed). */
export const readAccount = (body: unknown): ArqamAccount | null => {
  const fields = accountFields(body);
  if (fields === null) return null;
  return {
    mode: lookup<ArqamMode>(ARQAM_MODES, fields['mode'], 'UNKNOWN'),
    balance: amount(fields['balance'] ?? fields['credits']),
    status: text(fields['status']),
  };
};

const readEvent = (value: unknown): DeliveryEvent | null => {
  const fields = asRecord(value);
  if (fields === null) return null;
  return {
    state: lookup<DeliveryState>(ARQAM_DELIVERY_STATES, fields['status'], 'UNKNOWN'),
    timestamp: text(fields['timestamp']),
    errorCode: text(fields['errorCode']),
    errorMessage: text(fields['errorMessage']),
  };
};

/** `null` when the answer has no message id (malformed). */
export const readDeliveryStatus = (body: unknown): DeliveryStatus | null => {
  const fields = asRecord(body);
  const messageId = fields === null ? undefined : text(fields['messageId']);
  if (fields === null || messageId === undefined) return null;
  const history = Array.isArray(fields['history']) ? (fields['history'] as unknown[]) : [];
  return {
    messageId,
    state: lookup<DeliveryState>(ARQAM_DELIVERY_STATES, fields['currentStatus'], 'UNKNOWN'),
    history: history.map(readEvent).filter((event): event is DeliveryEvent => event !== null),
  };
};
