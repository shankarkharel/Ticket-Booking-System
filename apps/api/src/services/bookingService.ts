import { BookingStatus, Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { InsufficientInventoryError } from '../errors';
import computeTotal from '../utils/computeTotal';

export type BookingWithItems = Prisma.BookingGetPayload<{ include: { items: true } }>;

export type BookingResponse = {
  id: number;
  bookingReference: string;
  status: BookingStatus;
  items: BookingWithItems['items'];
  totalAmount: number;
  idempotent: boolean;
};

export const reserveBooking = async (
  prisma: PrismaClient,
  items: { tierId: number; quantity: number }[],
  idempotencyKey: string,
  customerName: string,
  customerEmail: string
) => {
  const sortedItems = [...items].sort((a, b) => a.tierId - b.tierId);

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
    for (const item of sortedItems) {
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
        customerName,
        customerEmail,
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

  return transactionResult;
};

export const confirmBooking = async (prisma: PrismaClient, bookingId: number) => {
  return prisma.booking.update({
    where: { id: bookingId },
    data: { status: BookingStatus.CONFIRMED },
    include: { items: true }
  });
};

export const failBooking = async (prisma: PrismaClient, booking: BookingWithItems) => {
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

  return prisma.booking.findUnique({
    where: { id: booking.id },
    include: { items: true }
  });
};

export const toBookingResponse = (booking: BookingWithItems, idempotent: boolean): BookingResponse => ({
  id: booking.id,
  bookingReference: booking.bookingReference,
  status: booking.status,
  items: booking.items,
  totalAmount: computeTotal(booking.items),
  idempotent
});
