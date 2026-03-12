import prisma from '../db';
import { releaseExpiredHolds } from './seatService';

export const listTiers = async () =>
  prisma.$transaction(async (tx) => {
    await releaseExpiredHolds(tx);
    return tx.ticketTier.findMany({ orderBy: { id: 'asc' } });
  });
