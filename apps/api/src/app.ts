import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import prisma from './db';
import { config } from './config';
import healthRoutes from './routes/health';
import tierRoutes from './routes/tiers';
import seatRoutes from './routes/seats';
import holdRoutes from './routes/holds';
import bookingRoutes from './routes/bookings';

const buildApp = () => {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });
  app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW
  });
  app.register(healthRoutes);
  app.register(tierRoutes);
  app.register(seatRoutes);
  app.register(holdRoutes);
  app.register(bookingRoutes);

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  return app;
};

export default buildApp;
