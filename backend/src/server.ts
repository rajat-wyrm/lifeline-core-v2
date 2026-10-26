import { buildApp } from './app.js';
import { config } from './config/index.js';
import { pool } from './db/client.js';

async function start() {
  const app = await buildApp();

  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, closing server and database pool...`);
    await app.close();
    await pool.end();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`[Fastify API] Lifeline-Core API running on http://${config.host}:${config.port}`);
    console.log(`[Fastify API] OpenAPI Documentation: http://${config.host}:${config.port}/api/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
