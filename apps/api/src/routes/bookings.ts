import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../db';
import { bookingRequestSchema } from '../schemas/booking';
import { InsufficientInventoryError } from '../errors';
import { simulatePayment } from '../services/paymentService';
import {
  reserveBooking,
  confirmBooking,
  failBooking,
  toBookingResponse,
  BookingWithItems
} from '../services/bookingService';

const bookingRoutes = async (app: FastifyInstance) => {
  app.post('/bookings', async (request, reply) => {
    const idempotencyKeyHeader = request.headers['idempotency-key'];
    const idempotencyKey = typeof idempotencyKeyHeader === 'string' ? idempotencyKeyHeader : undefined;

    if (!idempotencyKey) {
      return reply.code(400).send({ error: 'Missing Idempotency-Key header.' });
    }

    let parsedBody: z.infer<typeof bookingRequestSchema>;
    try {
      parsedBody = bookingRequestSchema.parse(request.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid request body.', issues: error.issues });
      }
      return reply.code(400).send({ error: 'Invalid request body.' });
    }

    let booking: BookingWithItems | null = null;
    let created = false;

    try {
      const transactionResult = await reserveBooking(
        prisma,
        parsedBody.items,
        idempotencyKey,
        parsedBody.name,
        parsedBody.email
      );
      booking = transactionResult.booking;
      created = transactionResult.created;
    } catch (error) {
      if (error instanceof InsufficientInventoryError) {
        return reply
          .code(409)
          .send({ error: 'Not enough inventory for requested tier.', tierId: error.tierId });
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await prisma.booking.findUnique({
          where: { idempotencyKey },
          include: { items: true }
        });

        if (existing) {
          return reply.send(toBookingResponse(existing, true));
        }
      }

      request.log.error(error, 'Booking failed');
      return reply.code(500).send({ error: 'Booking failed.' });
    }

    if (!booking) {
      return reply.code(500).send({ error: 'Booking failed.' });
    }

    if (!created) {
      return reply.send(toBookingResponse(booking, true));
    }

    const shouldFailPayment = request.headers['x-fail-payment'] === '1';
    const paymentResult = await simulatePayment(shouldFailPayment);

    if (paymentResult.success) {
      const confirmed = await confirmBooking(prisma, booking.id);
      return reply.send(toBookingResponse(confirmed, false));
    }

    const failed = await failBooking(prisma, booking);
    const responseBooking = failed ?? booking;

    return reply.code(402).send(toBookingResponse(responseBooking, false));
  });
};

export default bookingRoutes;
