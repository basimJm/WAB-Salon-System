import type { ResolvedConfig } from '../../config/options';

/** The few vendor shapes the adapter relies on (tests inject fakes for all of them). */
export interface S3Command {
  readonly input: Record<string, unknown>;
}
export interface S3Output {
  readonly ContentLength?: number;
  readonly ContentType?: string;
  readonly Body?: { transformToByteArray(): Promise<Uint8Array> };
  readonly Errors?: readonly { readonly Key?: string; readonly Code?: string }[];
}
export type CommandClass = new (input: Record<string, unknown>) => S3Command;

export interface S3Deps {
  send(command: S3Command, signal: AbortSignal): Promise<S3Output>;
  presign(
    command: S3Command,
    options: { expiresIn: number; signableHeaders?: Set<string> },
  ): Promise<string>;
  readonly commands: {
    readonly Put: CommandClass;
    readonly Head: CommandClass;
    readonly Get: CommandClass;
    readonly DeleteObjects: CommandClass;
    readonly HeadBucket: CommandClass;
    readonly CreateBucket: CommandClass;
  };
}

type S3Config = NonNullable<ResolvedConfig['s3']>;

/** Loads the AWS SDK lazily (only when the first S3 call happens) and reuses one client. */
export const createAwsDeps = async (config: S3Config, timeoutMs: number): Promise<S3Deps> => {
  const [sdk, presigner] = await Promise.all([
    import('@aws-sdk/client-s3'),
    import('@aws-sdk/s3-request-presigner'),
  ]);
  const client = new sdk.S3Client({
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    maxAttempts: 1,
    requestHandler: { requestTimeout: timeoutMs, connectionTimeout: timeoutMs },
    ...(config.endpoint === undefined ? {} : { endpoint: config.endpoint }),
    ...(config.credentials === undefined
      ? {}
      : {
          credentials: {
            accessKeyId: config.credentials.accessKeyId,
            secretAccessKey: config.credentials.secretAccessKey,
            ...(config.credentials.sessionToken === undefined
              ? {}
              : { sessionToken: config.credentials.sessionToken }),
          },
        }),
  });
  return {
    send: (command, signal) =>
      client.send(command as never, { abortSignal: signal }) as Promise<S3Output>,
    presign: (command, options) => presigner.getSignedUrl(client, command as never, options),
    commands: {
      Put: sdk.PutObjectCommand as unknown as CommandClass,
      Head: sdk.HeadObjectCommand as unknown as CommandClass,
      Get: sdk.GetObjectCommand as unknown as CommandClass,
      DeleteObjects: sdk.DeleteObjectsCommand as unknown as CommandClass,
      HeadBucket: sdk.HeadBucketCommand as unknown as CommandClass,
      CreateBucket: sdk.CreateBucketCommand as unknown as CommandClass,
    },
  };
};
