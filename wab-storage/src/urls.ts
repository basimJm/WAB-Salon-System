import { createSign } from 'node:crypto';
import { assertKey, encodeKey } from './validation';

const MS_PER_SECOND = 1_000;

export interface CloudFrontSigning {
  readonly baseUrl: string;
  readonly keyPairId: string;
  /** PEM private key of the CloudFront key pair. */
  readonly privateKey: string;
}

/** CloudFront base64 flavour: `+`, `=`, `/` become `-`, `_`, `~`. */
const cloudFrontBase64 = (value: Buffer): string =>
  value.toString('base64').replace(/\+/g, '-').replace(/=/g, '_').replace(/\//g, '~');

export const publicUrlOf = (baseUrl: string, key: string): string => {
  assertKey(key);
  return `${baseUrl}/${encodeKey(key)}`;
};

/** CloudFront signed URL with a canned policy (RSA-SHA1, as the service requires). */
export const createCloudFrontSigner = (
  options: CloudFrontSigning,
  now: () => Date = () => new Date(),
): ((key: string, expiresInSec: number) => string) => {
  const base = options.baseUrl.replace(/\/+$/, '');
  return (key, expiresInSec) => {
    const resource = publicUrlOf(base, key);
    const expires = Math.floor(now().getTime() / MS_PER_SECOND) + expiresInSec;
    const policy = JSON.stringify({
      Statement: [
        { Resource: resource, Condition: { DateLessThan: { 'AWS:EpochTime': expires } } },
      ],
    });
    const signature = createSign('RSA-SHA1').update(policy).sign(options.privateKey);
    return `${resource}?Expires=${String(expires)}&Signature=${cloudFrontBase64(signature)}&Key-Pair-Id=${options.keyPairId}`;
  };
};
