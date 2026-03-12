import Fastify from 'fastify';
import cors from '@fastify/cors';
import prisma from './db';
import healthRoutes from './routes/health';
import tierRoutes from './routes/tiers';
import bookingRoutes from './routes/bookings';

const buildApp = () => {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });
  app.register(healthRoutes);
  app.register(tierRoutes);
  app.register(bookingRoutes);

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  return app;
};

export default buildApp;
