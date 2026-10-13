import { z } from 'zod';
import { refreshTokenSchema } from '../../shared/auth/auth.schemas';

export const refreshSchema = z.object({ refreshToken: refreshTokenSchema });
