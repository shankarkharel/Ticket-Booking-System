import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Prisma, PrismaClient, BookingStatus } from '@prisma/client';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const app = Fastify({ logger: true });

const bookingRequestSchema = z.object({
  items: z
    .array(
      z.object({
        tierId: z.number().int().positive(),
        quantity: z.number().int().min(1)
      })
    )
    .min(1)
});

class InsufficientInventoryError extends Error {
  tierId: number;

  constructor(tierId: number) {
    super('INSUFFICIENT_INVENTORY');
    this.tierId = tierId;
  }
}

const simulatePayment = async (shouldFail: boolean) => {
  await new Promise((resolve) => setTimeout(resolve, 120));
  return { success: !shouldFail };
};

const computeTotal = (items: { quantity: number; unitPrice: number }[]) =>
  items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

app.register(cors, { origin: true });

app.get('/health', async () => ({ status: 'ok' }));

app.get('/tiers', async () => {
  return prisma.ticketTier.findMany({ orderBy: { id: 'asc' } });
});

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

  const items = [...parsedBody.items].sort((a, b) => a.tierId - b.tierId);

  let booking:
    | (Prisma.BookingGetPayload<{ include: { items: true } }>)
    | null = null;
  let created = false;

  try {
    const transactionResult = await prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findUnique({
        where: { idempotencyKey },
        include: { items: true }
      });

      if (existing) {
        return { booking: existing, created: false };
      }

      const bookingItems: { tierId: number; quantity: number; unitPrice: number }[] = [];

      // Concurrency control: conditional UPDATE inside a transaction ensures no oversell.
      for (const item of items) {
        const updated = await tx.$queryRaw<
          { id: number; price: number; remaining_quantity: number }[]
        >`UPDATE ticket_tiers
           SET remaining_quantity = remaining_quantity - ${item.quantity}
           WHERE id = ${item.tierId}
             AND remaining_quantity >= ${item.quantity}
           RETURNING id, price, remaining_quantity`;

        if (updated.length === 0) {
          throw new InsufficientInventoryError(item.tierId);
        }

        bookingItems.push({
          tierId: updated[0].id,
          quantity: item.quantity,
          unitPrice: updated[0].price
        });
      }

      const bookingReference = `BK-${new Date().toISOString().replace(/[-:.TZ]/g, '')}-${randomUUID()}`;

      const createdBooking = await tx.booking.create({
        data: {
          bookingReference,
          status: BookingStatus.PENDING,
          idempotencyKey,
          items: {
            create: bookingItems.map((item) => ({
              tierId: item.tierId,
              quantity: item.quantity,
              unitPrice: item.unitPrice
            }))
          }
        },
        include: { items: true }
      });

      return { booking: createdBooking, created: true };
    });

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
        const totalAmount = computeTotal(existing.items);
        return reply.send({
          id: existing.id,
          bookingReference: existing.bookingReference,
          status: existing.status,
          items: existing.items,
          totalAmount,
          idempotent: true
        });
      }
    }

    request.log.error(error, 'Booking failed');
    return reply.code(500).send({ error: 'Booking failed.' });
  }

  if (!booking) {
    return reply.code(500).send({ error: 'Booking failed.' });
  }

  if (!created) {
    const totalAmount = computeTotal(booking.items);
    return reply.send({
      id: booking.id,
      bookingReference: booking.bookingReference,
      status: booking.status,
      items: booking.items,
      totalAmount,
      idempotent: true
    });
  }

  const shouldFailPayment = request.headers['x-fail-payment'] === '1';
  const paymentResult = await simulatePayment(shouldFailPayment);

  if (paymentResult.success) {
    const confirmed = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.CONFIRMED },
      include: { items: true }
    });

    return reply.send({
      id: confirmed.id,
      bookingReference: confirmed.bookingReference,
      status: confirmed.status,
      items: confirmed.items,
      totalAmount: computeTotal(confirmed.items),
      idempotent: false
    });
  }

  await prisma.$transaction(async (tx) => {
    const restoreItems = [...booking.items].sort((a, b) => a.tierId - b.tierId);

    for (const item of restoreItems) {
      await tx.$executeRaw`
        UPDATE ticket_tiers
        SET remaining_quantity = remaining_quantity + ${item.quantity}
        WHERE id = ${item.tierId}`;
    }

    await tx.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.FAILED }
    });
  });

  const failed = await prisma.booking.findUnique({
    where: { id: booking.id },
    include: { items: true }
  });

  return reply.code(402).send({
    id: failed?.id ?? booking.id,
    bookingReference: failed?.bookingReference ?? booking.bookingReference,
    status: failed?.status ?? BookingStatus.FAILED,
    items: failed?.items ?? booking.items,
    totalAmount: computeTotal(failed?.items ?? booking.items),
    idempotent: false
  });
});

const start = async () => {
  try {
    await app.listen({ port: Number(process.env.PORT) || 4000, host: '0.0.0.0' });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

app.addHook('onClose', async () => {
  await prisma.$disconnect();
});

start();
