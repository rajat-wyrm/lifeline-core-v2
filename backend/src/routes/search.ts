import { FastifyPluginAsync } from 'fastify';
import { query } from '../db/client.js';

export const searchRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/v2/search', async (request, reply) => {
    const { q } = request.query as { q?: string };
    if (!q || q.trim().length === 0) {
      return {
        query: '',
        total_matches: 0,
        results: { hospitals: [], requests: [], reservations: [], playbooks: [] }
      };
    }

    const term = `%${q.trim().toLowerCase()}%`;

    // 1. Search Hospitals
    const hospRes = await query(
      `SELECT id, name, latitude, longitude, trauma_level, operational_status
       FROM hospitals
       WHERE LOWER(id) LIKE $1 OR LOWER(name) LIKE $1 OR LOWER(address) LIKE $1
       LIMIT 10`,
      [term]
    );

    // 2. Search Requests
    const reqRes = await query(
      `SELECT id, patient_age, trauma_score, required_resource, status, created_at
       FROM emergency_requests
       WHERE LOWER(id) LIKE $1 OR LOWER(required_resource) LIKE $1
       LIMIT 10`,
      [term]
    );

    // 3. Search Reservations
    const resRes = await query(
      `SELECT id, hospital_id, resource_type, ambulance_id, state, expires_at_ms
       FROM reservations
       WHERE LOWER(id) LIKE $1 OR LOWER(hospital_id) LIKE $1 OR LOWER(ambulance_id) LIKE $1
       LIMIT 10`,
      [term]
    );

    // 4. Search Operational Playbooks
    const pbkRes = await query(
      `SELECT id, title, category, tags
       FROM operational_playbooks
       WHERE LOWER(id) LIKE $1 OR LOWER(title) LIKE $1 OR LOWER(content) LIKE $1 OR LOWER(tags) LIKE $1
       LIMIT 5`,
      [term]
    );

    const total = hospRes.rows.length + reqRes.rows.length + resRes.rows.length + pbkRes.rows.length;

    return {
      query: q,
      total_matches: total,
      results: {
        hospitals: hospRes.rows,
        requests: reqRes.rows,
        reservations: resRes.rows,
        playbooks: pbkRes.rows
      }
    };
  });
};
