import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { query } from '../db/client.js';
import { engineClient } from '../services/engine_client.js';

const UpdatePolicySchema = z.object({
  scoring_weights: z.object({
    eta: z.number().min(0).max(100),
    available: z.number().min(0).max(100),
    freshness: z.number().min(0).max(100),
    poisson: z.number().min(0).max(100)
  })
});

export const settingsRoutes: FastifyPluginAsync = async (app) => {
  // Get all system settings
  app.get('/api/v2/settings', async () => {
    const res = await query(`SELECT * FROM system_settings ORDER BY key ASC`);
    const settingsMap: Record<string, any> = {};
    for (const row of res.rows) {
      settingsMap[row.key] = row.value;
    }
    return { settings: settingsMap };
  });

  // Update policy scoring weights
  app.post('/api/v2/settings/policies', async (request, reply) => {
    const parse = UpdatePolicySchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', details: parse.error.format() });
    }

    const { scoring_weights } = parse.data;

    // 1. Update in PostgreSQL
    await query(
      `UPDATE system_settings
       SET value = $1, updated_at = NOW(), updated_by = $2
       WHERE key = 'scoring_weights'`,
      [JSON.stringify(scoring_weights), request.user?.email || 'admin@lifeline.local']
    );

    // 2. Log in audit trail
    await query(
      `INSERT INTO audit_logs (correlation_id, action, payload)
       VALUES ($1, 'POLICY_WEIGHTS_UPDATED', $2)`,
      [`SETT-${Date.now()}`, JSON.stringify({ weights: scoring_weights })]
    );

    return {
      success: true,
      message: 'Scoring policy weights updated successfully.',
      scoring_weights
    };
  });
};
