import type { FastifyInstance } from 'fastify';
import { listSeats } from '../services/seatService';

const seatRoutes = async (app: FastifyInstance) => {
  app.get('/seats', async () => listSeats());
};

export default seatRoutes;
