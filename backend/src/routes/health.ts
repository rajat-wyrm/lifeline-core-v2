import { FastifyPluginAsync } from 'fastify';
import { checkDbHealth } from '../db/client.js';
import { engineClient } from '../services/engine_client.js';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  // Liveness probe
  const handleHealth = async () => {
    return {
      status: 'UP',
      uptime_seconds: process.uptime(),
      timestamp: new Date().toISOString()
    };
  };

  app.get('/health', handleHealth);
  app.get('/api/health', handleHealth);

  // Readiness probe: checks PostgreSQL and C++ Engine
  const handleReady = async (request: any, reply: any) => {
    const dbHealth = await checkDbHealth();
    const engineHealth = await engineClient.checkHealth();

    const isReady = dbHealth.healthy && engineHealth.healthy;
    const statusCode = isReady ? 200 : 503;

    return reply.status(statusCode).send({
      status: isReady ? 'READY' : 'DEGRADED',
      dependencies: {
        database: {
          status: dbHealth.healthy ? 'UP' : 'DOWN',
          latency_ms: dbHealth.latencyMs,
          error: dbHealth.error
        },
        engine: {
          status: engineHealth.healthy ? 'UP' : 'DOWN',
          latency_ms: engineHealth.latencyMs,
          error: engineHealth.error
        }
      },
      timestamp: new Date().toISOString()
    });
  };

  app.get('/ready', handleReady);
  app.get('/api/ready', handleReady);
};
