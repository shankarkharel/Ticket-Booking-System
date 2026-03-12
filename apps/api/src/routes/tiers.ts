import { FastifyInstance } from 'fastify';
import { listTiers } from '../services/tierService';

const tierRoutes = async (app: FastifyInstance) => {
  app.get('/tiers', async () => {
    return listTiers();
  });
};

export default tierRoutes;
