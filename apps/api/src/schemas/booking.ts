import { z } from 'zod';

export const bookingRequestSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  items: z
    .array(
      z.object({
        tierId: z.number().int().positive(),
        quantity: z.number().int().min(1)
      })
    )
    .min(1)
});

export type BookingRequest = z.infer<typeof bookingRequestSchema>;
