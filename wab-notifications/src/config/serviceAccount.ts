import { z } from 'zod';
import { configError } from '../errors';

const serviceAccountSchema = z.object({
  type: z.literal('service_account'),
  project_id: z.string().min(1),
  client_email: z.email(),
  private_key: z.string().min(1),
});

export type ServiceAccount = z.infer<typeof serviceAccountSchema> & Record<string, unknown>;

/**
 * Validates a Firebase service-account key (JSON text or object). Errors name the missing fields
 * only: key material is never echoed.
 */
export const parseServiceAccount = (input: string | object): ServiceAccount => {
  let value: unknown = input;
  if (typeof input === 'string') {
    try {
      value = JSON.parse(input);
    } catch {
      throw configError('service account is not valid JSON');
    }
  }
  const parsed = serviceAccountSchema.safeParse(value);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.') || 'value');
    throw configError('service account is invalid', { fields });
  }
  return value as ServiceAccount;
};
