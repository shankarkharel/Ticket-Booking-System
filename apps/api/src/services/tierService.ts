import prisma from '../db';

export const listTiers = async () => prisma.ticketTier.findMany({ orderBy: { id: 'asc' } });
