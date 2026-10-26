import { FastifyPluginAsync } from 'fastify';
import fs from 'node:fs/promises';
import path from 'node:path';
import { query } from '../db/client.js';

export const experimentRoutes: FastifyPluginAsync = async (app) => {
  // Retrieve three-policy comparison summary
  app.get('/api/v2/experiments', async (request, reply) => {
    try {
      const resultsPath = path.resolve(process.cwd(), '../sim/results/three_policy_comparison.json');
      const data = await fs.readFile(resultsPath, 'utf-8');
      return JSON.parse(data);
    } catch (err: any) {
      // If file not read, query from database
      const dbRuns = await query('SELECT * FROM simulation_runs ORDER BY created_at DESC LIMIT 50');
      return {
        source: 'database',
        runs: dbRuns.rows
      };
    }
  });

  // Get specific run from database
  app.get('/api/v2/experiments/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const res = await query('SELECT * FROM simulation_runs WHERE id = $1', [id]);
    if (res.rows.length === 0) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: `Experiment run ${id} not found` });
    }
    return { data: res.rows[0] };
  });
};
