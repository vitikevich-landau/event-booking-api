import { z } from 'zod';

export const createBookingSchema = z.object({
  event_id: z.number().int().positive('Event ID must be a positive integer'),
  user_id: z.string().min(1, 'User ID cannot be empty').max(255, 'User ID is too long'),
});

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().int().positive()).default('3000'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type EnvConfig = z.infer<typeof envSchema>;
