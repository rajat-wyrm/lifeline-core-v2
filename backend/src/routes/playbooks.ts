import { FastifyPluginAsync } from 'fastify';
import { query } from '../db/client.js';

export const playbookRoutes: FastifyPluginAsync = async (app) => {
  // List all playbooks
  app.get('/api/v2/playbooks', async () => {
    const res = await query(`SELECT id, title, category, content, tags, updated_at FROM operational_playbooks ORDER BY id ASC`);
    return {
      count: res.rows.length,
      data: res.rows
    };
  });

  // Search playbooks
  app.get('/api/v2/playbooks/search', async (request, reply) => {
    const { q, category } = request.query as { q?: string; category?: string };

    let sql = `SELECT id, title, category, content, tags, updated_at FROM operational_playbooks WHERE 1=1`;
    const params: any[] = [];

    if (category) {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }

    if (q && q.trim().length > 0) {
      params.push(`%${q.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(title) LIKE $${params.length} OR LOWER(content) LIKE $${params.length} OR LOWER(tags) LIKE $${params.length})`;
    }

    sql += ` ORDER BY updated_at DESC LIMIT 20`;

    const res = await query(sql, params);
    return {
      count: res.rows.length,
      data: res.rows
    };
  });

  // Get single playbook detail
  app.get('/api/v2/playbooks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const res = await query(`SELECT * FROM operational_playbooks WHERE id = $1`, [id]);
    if (res.rows.length === 0) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: `Playbook ${id} not found.` });
    }
    return { playbook: res.rows[0] };
  });
};
