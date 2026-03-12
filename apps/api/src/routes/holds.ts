import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { holdRequestSchema } from '../schemas/booking';
import { SeatUnavailableError } from '../errors';
import { holdSeats, releaseHold } from '../services/seatService';
import { sendError } from '../http/error';

const holdRoutes = async (app: FastifyInstance) => {
  app.post('/holds', async (request, reply) => {
    let parsedBody: { seatIds: number[] };
    try {
      parsedBody = holdRequestSchema.parse(request.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request body.', error.issues);
      }
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request body.');
    }

    try {
      const result = await holdSeats(parsedBody.seatIds);
      return reply.send({
        holdToken: result.holdToken,
        expiresAt: result.expiresAt.toISOString(),
        seatIds: result.seatIds
      });
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

      request.log.error(error, 'Hold failed');
      return sendError(reply, 500, 'INTERNAL_ERROR', 'Unable to hold seats.');
    }
  });

  app.post('/holds/release', async (request, reply) => {
    const bodySchema = z.object({
      holdToken: z.string().min(1)
    });

    let parsedBody: { holdToken: string };
    try {
      parsedBody = bodySchema.parse(request.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request body.', error.issues);
      }
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request body.');
    }

    const result = await releaseHold(parsedBody.holdToken);
    return reply.send(result);
  });
};

export default holdRoutes;
