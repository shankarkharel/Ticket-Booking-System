import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../db';
import { bookingRequestSchema, type BookingRequest } from '../schemas/booking';
import {
  IdempotencyConflictError,
  InsufficientInventoryError,
  InvalidHoldTokenError,
  SeatUnavailableError
} from '../errors';
import { simulatePayment } from '../services/paymentService';
import {
  reserveBooking,
  confirmBooking,
  failBooking,
  toBookingResponse,
  BookingWithItems
} from '../services/bookingService';
import { sendError } from '../http/error';

const bookingRoutes = async (app: FastifyInstance) => {
  app.post('/bookings', async (request, reply) => {
    const idempotencyKeyHeader = request.headers['idempotency-key'];
    const idempotencyKey =
      typeof idempotencyKeyHeader === 'string' ? idempotencyKeyHeader : undefined;

    if (!idempotencyKey) {
      return sendError(reply, 400, 'MISSING_IDEMPOTENCY_KEY', 'Missing Idempotency-Key header.');
    }

    let parsedBody: BookingRequest;
    try {
      parsedBody = bookingRequestSchema.parse(request.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request body.', error.issues);
      }
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request body.');
    }

    let booking: BookingWithItems | null = null;
    let created = false;

    try {
      const transactionResult = await reserveBooking(
        prisma,
        parsedBody.seatIds,
        parsedBody.holdToken,
        idempotencyKey,
        parsedBody.name,
        parsedBody.email
      );
      booking = transactionResult.booking;
      created = transactionResult.created;
    } catch (error) {
      if (error instanceof SeatUnavailableError) {
        return sendError(
          reply,
          409,
          'SEAT_UNAVAILABLE',
          'One or more selected seats are no longer available.',
          { seatIds: error.seatIds }
        );
      }

      if (error instanceof InvalidHoldTokenError) {
        return sendError(
          reply,
          409,
          'INVALID_HOLD_TOKEN',
          'The hold token is invalid or has expired. Please select seats again.'
        );
      }

      if (error instanceof IdempotencyConflictError) {
        return sendError(
          reply,
          409,
          'IDEMPOTENCY_KEY_REUSE',
          'This Idempotency-Key was already used with different booking data.'
        );
      }

      if (error instanceof InsufficientInventoryError) {
        return sendError(
          reply,
          409,
          'INSUFFICIENT_INVENTORY',
          'Not enough inventory for requested tier.',
          { tierId: error.tierId }
        );
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await prisma.booking.findUnique({
          where: { idempotencyKey },
          include: { items: true, seats: true }
        });

        if (existing) {
          return reply.send(toBookingResponse(existing, true));
        }
      }

      request.log.error(error, 'Booking failed');
      return sendError(reply, 500, 'INTERNAL_ERROR', 'Booking failed.');
    }

    if (!booking) {
      return sendError(reply, 500, 'INTERNAL_ERROR', 'Booking failed.');
    }

    if (!created) {
      return reply.send(toBookingResponse(booking, true));
    }

    const shouldFailPayment = request.headers['x-fail-payment'] === '1';
    const paymentResult = await simulatePayment(shouldFailPayment);

    if (paymentResult.success) {
      try {
        const confirmed = await confirmBooking(prisma, booking.id);
        return reply.send(toBookingResponse(confirmed, false));
      } catch (error) {
        const failed = await failBooking(prisma, booking);
        const responseBooking = failed ?? booking;

        if (error instanceof SeatUnavailableError) {
          return sendError(
            reply,
            409,
            'SEAT_UNAVAILABLE',
            'Hold expired before payment confirmation. Please select seats again.',
            { seatIds: error.seatIds }
          );
        }

        if (error instanceof InvalidHoldTokenError) {
          return sendError(
            reply,
            409,
            'INVALID_HOLD_TOKEN',
            'Hold verification failed during payment confirmation.'
          );
        }

        request.log.error(error, 'Payment confirmation failed');
        return reply.code(402).send(toBookingResponse(responseBooking, false));
      }
    }

    const failed = await failBooking(prisma, booking);
    const responseBooking = failed ?? booking;

    return reply.code(402).send(toBookingResponse(responseBooking, false));
  });
};

export default bookingRoutes;
