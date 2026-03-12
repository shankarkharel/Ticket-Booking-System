import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  RATE_LIMIT_MAX: z.coerce.number().default(120),
  RATE_LIMIT_WINDOW: z.string().default('1 minute')
});

export const config = envSchema.parse(process.env);
