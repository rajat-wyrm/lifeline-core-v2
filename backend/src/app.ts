import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { randomUUID } from 'node:crypto';

import { config } from './config/index.js';
import { healthRoutes } from './routes/health.js';
import { hospitalRoutes } from './routes/hospitals.js';
import { requestRoutes } from './routes/requests.js';
import { reservationRoutes } from './routes/reservations.js';
import { triageRoutes } from './routes/triage.js';
import { simulatorRoutes } from './routes/simulator.js';
import { experimentRoutes } from './routes/experiments.js';
import { benchmarkRoutes } from './routes/benchmarks.js';
import { observabilityRoutes } from './routes/observability.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: {
      level: config.nodeEnv === 'development' ? 'info' : 'warn'
    },
    genReqId: () => randomUUID(),
    requestIdHeader: 'x-correlation-id'
  });

  // CORS
  await app.register(cors, {
    origin: config.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  });

  // OpenAPI Swagger Documentation
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Lifeline-Core v2 REST API',
        description: 'Production API specification for Lifeline-Core emergency resource allocation engine',
        version: '2.0.0'
      },
      servers: [
        { url: `http://localhost:${config.port}`, description: 'Local Development Server' }
      ]
    }
  });

  await app.register(swaggerUi, {
    routePrefix: '/api/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    }
  });

  // Global Error Handler: consistent, safe error contract
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    const err = error as any;
    const statusCode = err.statusCode || 500;
    return reply.status(statusCode).send({
      error: err.name || 'INTERNAL_ERROR',
      message: statusCode === 500 ? 'An internal server error occurred.' : err.message,
      correlation_id: request.id,
      timestamp: new Date().toISOString()
    });
  });

  // Register Routes
  await app.register(healthRoutes);
  await app.register(hospitalRoutes);
  await app.register(requestRoutes);
  await app.register(reservationRoutes);
  await app.register(triageRoutes);
  await app.register(simulatorRoutes);
  await app.register(experimentRoutes);
  await app.register(benchmarkRoutes);
  await app.register(observabilityRoutes);

  return app;
}
