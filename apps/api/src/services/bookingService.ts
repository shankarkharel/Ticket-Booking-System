import { BookingStatus, Prisma, PrismaClient, SeatStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { IdempotencyConflictError, InvalidHoldTokenError, SeatUnavailableError } from '../errors';
import computeTotal from '../utils/computeTotal';
import { BookingStatus as ContractBookingStatus, type BookingResponse } from '@ticket/contracts';
import { releaseExpiredHolds } from './seatService';

export type BookingWithItems = Prisma.BookingGetPayload<{
  include: { items: true; seats: true };
}>;

export const reserveBooking = async (
  prisma: PrismaClient,
  seatIds: number[],
  holdToken: string,
  idempotencyKey: string,
  customerName: string,
  customerEmail: string
) => {
  const uniqueSeatIds = Array.from(new Set(seatIds)).sort((a, b) => a - b);

  const transactionResult = await prisma.$transaction(async (tx) => {
    await releaseExpiredHolds(tx);

    const existing = await tx.booking.findUnique({
      where: { idempotencyKey },
      include: { items: true, seats: true }
    });

    if (existing) {
      const existingSeatIds = existing.seats.map((seat) => seat.id).sort((a, b) => a - b);
      const sameSeats =
        existingSeatIds.length === uniqueSeatIds.length &&
        existingSeatIds.every((value, index) => value === uniqueSeatIds[index]);

      if (existing.holdToken !== holdToken || !sameSeats) {
        throw new IdempotencyConflictError();
      }

      return { booking: existing, created: false };
    }

    const bookingReference = `BK-${new Date().toISOString().replace(/[-:.TZ]/g, '')}-${randomUUID()}`;

    const booking = await tx.booking.create({
      data: {
        bookingReference,
        customerName,
        customerEmail,
        status: BookingStatus.PENDING,
        holdToken,
        idempotencyKey
      }
    });

    const now = new Date();
    const updatedSeats = await tx.$queryRaw<{ id: number; tier_id: number }[]>`
      UPDATE ticket_seats
      SET booking_id = ${booking.id}
      WHERE id IN (${Prisma.join(uniqueSeatIds)})
        AND status = ${SeatStatus.HELD}
        AND hold_token = ${holdToken}
        AND hold_expires_at IS NOT NULL
        AND hold_expires_at > ${now}
        AND booking_id IS NULL
      RETURNING id, tier_id
    `;

    if (updatedSeats.length !== uniqueSeatIds.length) {
      const updatedIds = new Set(updatedSeats.map((seat) => seat.id));
      const missing = uniqueSeatIds.filter((id) => !updatedIds.has(id));
      throw new SeatUnavailableError(missing);
    }

    const tierCounts = updatedSeats.reduce<Record<number, number>>((acc, seat) => {
      acc[seat.tier_id] = (acc[seat.tier_id] || 0) + 1;
      return acc;
    }, {});

    const tiers = await tx.ticketTier.findMany({
      where: { id: { in: Object.keys(tierCounts).map(Number) } }
    });

    const bookingItems = tiers.map((tier) => ({
      bookingId: booking.id,
      tierId: tier.id,
      quantity: tierCounts[tier.id] ?? 0,
      unitPrice: tier.price
    }));

    if (bookingItems.length > 0) {
      await tx.bookingItem.createMany({
        data: bookingItems
      });
    }

    const createdBooking = await tx.booking.findUnique({
      where: { id: booking.id },
      include: { items: true, seats: true }
    });

    if (!createdBooking) {
      throw new Error('BOOKING_CREATE_FAILED');
    }

    return { booking: createdBooking, created: true };
  });

  return transactionResult;
};

export const confirmBooking = async (prisma: PrismaClient, bookingId: number) => {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { items: true, seats: true }
    });

    if (!booking) {
      throw new InvalidHoldTokenError();
    }

    if (booking.status !== BookingStatus.PENDING) {
      return booking;
    }

    if (!booking.holdToken) {
      throw new InvalidHoldTokenError();
    }

    const seats = await tx.ticketSeat.findMany({
      where: { bookingId, status: SeatStatus.HELD },
      select: { id: true, holdExpiresAt: true, holdToken: true }
    });

    if (seats.length === 0) {
      throw new SeatUnavailableError([]);
    }

    const invalidHold = seats.filter((seat) => seat.holdToken !== booking.holdToken);
    if (invalidHold.length > 0) {
      throw new InvalidHoldTokenError();
    }

    const now = new Date();
    const expired = seats.filter((seat) => !seat.holdExpiresAt || seat.holdExpiresAt <= now);
    if (expired.length > 0) {
      throw new SeatUnavailableError(expired.map((seat) => seat.id));
    }

    const updated = await tx.ticketSeat.updateMany({
      where: {
        bookingId,
        status: SeatStatus.HELD,
        holdToken: booking.holdToken,
        holdExpiresAt: { gt: now }
      },
      data: { status: SeatStatus.BOOKED, holdToken: null, holdExpiresAt: null }
    });

    if (updated.count !== seats.length) {
      throw new SeatUnavailableError(seats.map((seat) => seat.id));
    }

    return tx.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CONFIRMED },
      include: { items: true, seats: true }
    });
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

    await tx.ticketSeat.updateMany({
      where: { bookingId: booking.id, status: SeatStatus.HELD },
      data: {
        status: SeatStatus.AVAILABLE,
        bookingId: null,
        holdToken: null,
        holdExpiresAt: null
      }
    });

    await tx.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.FAILED }
    });
  });

  return prisma.booking.findUnique({
    where: { id: booking.id },
    include: { items: true, seats: true }
  });
};

export const toBookingResponse = (
  booking: BookingWithItems,
  idempotent: boolean
): BookingResponse => ({
  id: booking.id,
  bookingReference: booking.bookingReference,
  status: booking.status as ContractBookingStatus,
  items: booking.items,
  seatIds: booking.seats.map((seat) => seat.id),
  totalAmount: computeTotal(booking.items),
  idempotent
});
