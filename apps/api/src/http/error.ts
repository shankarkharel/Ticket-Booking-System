import type { FastifyReply } from 'fastify';
import type { ApiErrorCode, ApiErrorResponse } from '@ticket/contracts';

export const sendError = (
  reply: FastifyReply,
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown
) => {
  const payload: ApiErrorResponse = {
    error: {
      code,
      message,
      details
    }
  };

  return reply.code(status).send(payload);
};
