import { Prisma, PrismaClient, SeatStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { SeatUnavailableError } from '../errors';
import prisma from '../db';

type Tx = PrismaClient | Prisma.TransactionClient;

export const releaseExpiredHolds = async (tx: Tx) => {
  const now = new Date();
  const released = await tx.$queryRaw<{ id: number; tier_id: number }[]>`
    UPDATE ticket_seats
    SET status = ${SeatStatus.AVAILABLE},
        booking_id = NULL,
        hold_token = NULL,
        hold_expires_at = NULL
    WHERE status = ${SeatStatus.HELD}
      AND booking_id IS NULL
      AND hold_expires_at IS NOT NULL
      AND hold_expires_at < ${now}
    RETURNING id, tier_id
  `;

  if (released.length === 0) {
    return [];
  }

  const counts = released.reduce<Record<number, number>>((acc, seat) => {
    acc[seat.tier_id] = (acc[seat.tier_id] || 0) + 1;
    return acc;
  }, {});

  for (const [tierId, count] of Object.entries(counts)) {
    await tx.$executeRaw`
      UPDATE ticket_tiers
      SET remaining_quantity = remaining_quantity + ${count}
      WHERE id = ${Number(tierId)}
    `;
  }

  return released;
};

export const listSeats = async () =>
  prisma.$transaction(async (tx) => {
    await releaseExpiredHolds(tx);
    return tx.ticketSeat.findMany({
      orderBy: [{ tierId: 'asc' }, { row: 'asc' }, { number: 'asc' }],
      select: {
        id: true,
        tierId: true,
        row: true,
        number: true,
        label: true,
        status: true
      }
    });
  });

export const holdSeats = async (seatIds: number[]) => {
  const holdToken = randomUUID();
  const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
  const uniqueSeatIds = Array.from(new Set(seatIds)).sort((a, b) => a - b);

  const result = await prisma.$transaction(async (tx) => {
    await releaseExpiredHolds(tx);

    const updated = await tx.$queryRaw<{ id: number; tier_id: number }[]>`
      UPDATE ticket_seats
      SET status = ${SeatStatus.HELD},
          hold_token = ${holdToken},
          hold_expires_at = ${expiresAt},
          booking_id = NULL
      WHERE id IN (${Prisma.join(uniqueSeatIds)})
        AND status = ${SeatStatus.AVAILABLE}
      RETURNING id, tier_id
    `;

    if (updated.length !== uniqueSeatIds.length) {
      const updatedIds = new Set(updated.map((seat) => seat.id));
      const missing = uniqueSeatIds.filter((id) => !updatedIds.has(id));
      throw new SeatUnavailableError(missing);
    }

    const tierCounts = updated.reduce<Record<number, number>>((acc, seat) => {
      acc[seat.tier_id] = (acc[seat.tier_id] || 0) + 1;
      return acc;
    }, {});

    for (const [tierId, count] of Object.entries(tierCounts)) {
      const updatedTier = await tx.$queryRaw<{ id: number }[]>`
        UPDATE ticket_tiers
        SET remaining_quantity = remaining_quantity - ${count}
        WHERE id = ${Number(tierId)}
          AND remaining_quantity >= ${count}
        RETURNING id
      `;
      if (updatedTier.length === 0) {
        throw new SeatUnavailableError(uniqueSeatIds);
      }
    }

    return {
      holdToken,
      expiresAt,
      seatIds: uniqueSeatIds
    };
  });

  return result;
};

export const releaseHold = async (holdToken: string) =>
  prisma.$transaction(async (tx) => {
    await releaseExpiredHolds(tx);

    const released = await tx.$queryRaw<{ id: number; tier_id: number }[]>`
      UPDATE ticket_seats
      SET status = ${SeatStatus.AVAILABLE},
          hold_token = NULL,
          hold_expires_at = NULL,
          booking_id = NULL
      WHERE hold_token = ${holdToken}
        AND status = ${SeatStatus.HELD}
        AND booking_id IS NULL
      RETURNING id, tier_id
    `;

    if (released.length === 0) {
      return { seatIds: [] as number[] };
    }

    const tierCounts = released.reduce<Record<number, number>>((acc, seat) => {
      acc[seat.tier_id] = (acc[seat.tier_id] || 0) + 1;
      return acc;
    }, {});

    for (const [tierId, count] of Object.entries(tierCounts)) {
      await tx.$executeRaw`
        UPDATE ticket_tiers
        SET remaining_quantity = remaining_quantity + ${count}
        WHERE id = ${Number(tierId)}
      `;
    }

    return { seatIds: released.map((seat) => seat.id) };
  });
