import { FastifyPluginAsync } from 'fastify';
import { engineClient } from '../services/engine_client.js';

export const triageRoutes: FastifyPluginAsync = async (app) => {
  // Get active triage priority queue with aging calculations
  app.get('/api/v2/triage', async (request, reply) => {
    try {
      const queue = await engineClient.getTriageQueue();
      return {
        count: queue.length,
        aging_policy: '0.5 points per second waited',
        data: queue
      };
    } catch (err: any) {
      return reply.status(503).send({
        error: 'ENGINE_OFFLINE',
        message: 'Could not fetch triage queue from C++ engine'
      });
    }
  });
};
