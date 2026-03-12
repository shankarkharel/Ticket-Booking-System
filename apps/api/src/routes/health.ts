import { FastifyInstance } from 'fastify';

const healthRoutes = async (app: FastifyInstance) => {
  app.get('/health', async () => ({ status: 'ok' }));
};

export default healthRoutes;
