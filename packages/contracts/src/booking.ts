import { z } from 'zod';

export const bookingRequestSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  holdToken: z.string().min(1),
  seatIds: z.array(z.number().int().positive()).min(1)
});

export const holdRequestSchema = z.object({
  seatIds: z.array(z.number().int().positive()).min(1)
});

export const bookingFormSchema = z
  .object({
    name: z.string().min(2, 'Name is required.'),
    email: z.string().email('Enter a valid email.'),
    seatIds: z.array(z.number().int())
  })
  .refine((value) => value.seatIds.length > 0, {
    message: 'Select at least one seat to continue.',
    path: ['seatIds']
  });

export type BookingRequest = z.infer<typeof bookingRequestSchema>;
export type HoldRequest = z.infer<typeof holdRequestSchema>;
export type BookingForm = z.infer<typeof bookingFormSchema>;
