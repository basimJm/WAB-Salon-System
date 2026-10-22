import { ERROR_CODES, type ErrorCode } from '../../constants/codes';
import { StorageError, isStorageError } from '../../errors';

interface VendorFailure {
  readonly name?: string;
  readonly Code?: string;
  readonly code?: string;
  readonly message?: string;
  readonly $metadata?: { readonly httpStatusCode?: number; readonly requestId?: string };
}

const STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  REQUEST_TIMEOUT: 408,
  PAYLOAD_TOO_LARGE: 413,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR: 500,
  GATEWAY_TIMEOUT: 504,
} as const;

const NOT_FOUND_NAMES = ['NotFound', 'NoSuchKey', 'NoSuchVersion'];
const AUTH_NAMES = [
  'InvalidAccessKeyId',
  'SignatureDoesNotMatch',
  'ExpiredToken',
  'InvalidToken',
  'TokenRefreshRequired',
  'CredentialsProviderError',
  'InvalidClientTokenId',
  'MissingAuthenticationToken',
];
const DENIED_NAMES = ['AccessDenied', 'AllAccessDisabled', 'AccountProblem', 'Forbidden'];
const THROTTLE_NAMES = [
  'SlowDown',
  'ThrottlingException',
  'RequestLimitExceeded',
  'TooManyRequests',
];
const TIMEOUT_NAMES = ['RequestTimeout', 'RequestTimeoutException', 'TimeoutError', 'AbortError'];
const TIMEOUT_CODES = ['ETIMEDOUT', 'ESOCKETTIMEDOUT', 'ECONNABORTED'];
const NETWORK_CODES = [
  'ECONNRESET',
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPIPE',
  'EHOSTUNREACH',
  'ENETUNREACH',
];
const SOCKET_HANGUP = /socket hang up/i;
const NETWORK_NAMES = ['NetworkingError'];
const UNAVAILABLE_NAMES = ['InternalError', 'ServiceUnavailable', 'ServiceUnavailableException'];
const CONFIG_NAMES = [
  'NoSuchBucket',
  'InvalidBucketName',
  'PermanentRedirect',
  'AuthorizationHeaderMalformed',
];
const INVALID_NAMES = [
  'InvalidRequest',
  'InvalidArgument',
  'MalformedXML',
  'KeyTooLongError',
  'EntityTooLarge',
  'MalformedPOSTRequest',
  'InvalidDigest',
  'BadDigest',
];

/** Some runtimes (e.g. Jest) make the SDK wrap socket errors, keeping the code only in the text. */
const codeFromMessage = (message: string): string =>
  [...TIMEOUT_CODES, ...NETWORK_CODES].find((code) => message.includes(code)) ??
  (SOCKET_HANGUP.test(message) ? 'ECONNRESET' : '');

const failureOf = (error: unknown): VendorFailure =>
  typeof error === 'object' && error !== null ? error : {};

const statusOf = (failure: VendorFailure): number | undefined => failure.$metadata?.httpStatusCode;
const nameOf = (failure: VendorFailure): string =>
  failure.name ?? failure.Code ?? failure.code ?? '';

/** Is this "the object does not exist" (HEAD answers a bare 404 with name `NotFound`)? */
export const isNotFound = (error: unknown): boolean => {
  const failure = failureOf(error);
  const name = nameOf(failure);
  if (CONFIG_NAMES.includes(name)) return false;
  return NOT_FOUND_NAMES.includes(name) || statusOf(failure) === STATUS.NOT_FOUND;
};

interface Mapping {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly message: string;
}

const classify = (failure: VendorFailure): Mapping | undefined => {
  const name = nameOf(failure);
  const code = failure.code ?? codeFromMessage(failure.message ?? '');
  const status = statusOf(failure);
  const is = (names: readonly string[]): boolean => names.includes(name);
  const rules: [boolean, Mapping][] = [
    [
      is(AUTH_NAMES) || status === STATUS.UNAUTHORIZED,
      {
        code: ERROR_CODES.AUTH_FAILED,
        retryable: false,
        message: 'Storage credentials were rejected',
      },
    ],
    [
      is(DENIED_NAMES) || status === STATUS.FORBIDDEN,
      { code: ERROR_CODES.ACCESS_DENIED, retryable: false, message: 'Storage access denied' },
    ],
    [
      is(THROTTLE_NAMES) || status === STATUS.TOO_MANY_REQUESTS,
      { code: ERROR_CODES.RATE_LIMITED, retryable: true, message: 'Storage rate limit reached' },
    ],
    [
      is(TIMEOUT_NAMES) ||
        TIMEOUT_CODES.includes(code) ||
        status === STATUS.REQUEST_TIMEOUT ||
        status === STATUS.GATEWAY_TIMEOUT,
      { code: ERROR_CODES.TIMEOUT, retryable: true, message: 'Storage request timed out' },
    ],
    [
      is(NETWORK_NAMES) || NETWORK_CODES.includes(code),
      { code: ERROR_CODES.NETWORK_ERROR, retryable: true, message: 'Storage is unreachable' },
    ],
    [
      is(CONFIG_NAMES),
      {
        code: ERROR_CODES.CONFIG_INVALID,
        retryable: false,
        message: 'Storage bucket or region is misconfigured',
      },
    ],
    [
      is(INVALID_NAMES) || status === STATUS.BAD_REQUEST || status === STATUS.PAYLOAD_TOO_LARGE,
      {
        code: ERROR_CODES.VALIDATION_FAILED,
        retryable: false,
        message: 'Storage rejected the request',
      },
    ],
    [
      is(UNAVAILABLE_NAMES) || (status !== undefined && status >= STATUS.SERVER_ERROR),
      {
        code: ERROR_CODES.UNAVAILABLE,
        retryable: true,
        message: 'Storage is temporarily unavailable',
      },
    ],
    [
      status !== undefined && status > STATUS.BAD_REQUEST && status < STATUS.SERVER_ERROR,
      { code: ERROR_CODES.VENDOR_ERROR, retryable: false, message: 'Storage refused the request' },
    ],
  ];
  return rules.find(([matches]) => matches)?.[1];
};

/** Every vendor failure becomes a typed `StorageError`; nothing unknown is ever treated as success. */
export const mapS3Error = (error: unknown): StorageError => {
  if (isStorageError(error)) return error;
  const failure = failureOf(error);
  const mapping = classify(failure);
  const details = {
    vendorName: nameOf(failure),
    ...(statusOf(failure) === undefined ? {} : { status: statusOf(failure) }),
    ...(failure.$metadata?.requestId === undefined
      ? {}
      : { requestId: failure.$metadata.requestId }),
  };
  return new StorageError(
    mapping?.code ?? ERROR_CODES.UNKNOWN,
    mapping?.message ?? 'Unknown storage failure',
    {
      retryable: mapping?.retryable ?? false,
      cause: error,
      details,
    },
  );
};
