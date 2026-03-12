import { z } from 'zod';

export const bookingItemSchema = z.object({
  tierId: z.number().int().positive(),
  quantity: z.number().int().min(1)
});

export const bookingRequestSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  items: z.array(bookingItemSchema).min(1)
});

export const bookingFormSchema = z
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

export type BookingRequest = z.infer<typeof bookingRequestSchema>;
export type BookingForm = z.infer<typeof bookingFormSchema>;
export type BookingItemInput = z.infer<typeof bookingItemSchema>;
