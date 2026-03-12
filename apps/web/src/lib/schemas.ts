import { z } from 'zod';

export const bookingSchema = z
  .object({
    name: z.string().min(2, 'Name is required.'),
    email: z.string().email('Enter a valid email.'),
    items: z.array(
      z.object({
        tierId: z.number(),
        quantity: z.number().int().min(0)
      })
    )
  })
  .refine((value) => value.items.some((item) => item.quantity > 0), {
    message: 'Select at least one ticket to continue.',
    path: ['items']
  });

export type BookingForm = z.infer<typeof bookingSchema>;
