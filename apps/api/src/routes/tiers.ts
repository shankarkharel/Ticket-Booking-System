import { FastifyInstance } from 'fastify';
import prisma from '../db';

const tierRoutes = async (app: FastifyInstance) => {
  app.get('/tiers', async () => {
    return prisma.ticketTier.findMany({ orderBy: { id: 'asc' } });
  });
};

export default tierRoutes;
