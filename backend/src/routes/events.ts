import { FastifyPluginAsync } from 'fastify';
import { eventsHub } from '../services/events_hub.js';

export const eventRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/v2/events/stream', async (request, reply) => {
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');

    // Register with events hub
    eventsHub.registerClient(reply);

    // Keep connection open
    await new Promise(() => {});
  });
};
