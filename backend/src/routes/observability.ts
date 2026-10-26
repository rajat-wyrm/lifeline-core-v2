import { FastifyPluginAsync } from 'fastify';
import { query } from '../db/client.js';

export const observabilityRoutes: FastifyPluginAsync = async (app) => {
  // Recent audit logs
  app.get('/api/v2/observability/events', async (request, reply) => {
    const res = await query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50');
    return { count: res.rows.length, data: res.rows };
  });

  // System stats summary
  app.get('/api/v2/observability/stats', async () => {
    const hospRes = await query('SELECT COUNT(*) as total FROM hospitals');
    const reqRes = await query('SELECT COUNT(*) as total FROM emergency_requests');
    const resRes = await query('SELECT COUNT(*) as total FROM reservations');
    const heldRes = await query("SELECT COUNT(*) as total FROM reservations WHERE state = 'HELD'");
    const confRes = await query("SELECT COUNT(*) as total FROM reservations WHERE state = 'CONFIRMED'");
    const expRes = await query("SELECT COUNT(*) as total FROM reservations WHERE state = 'EXPIRED'");

    return {
      hospitals_total: parseInt(hospRes.rows[0].total, 10),
      requests_total: parseInt(reqRes.rows[0].total, 10),
      reservations_total: parseInt(resRes.rows[0].total, 10),
      reservations_held: parseInt(heldRes.rows[0].total, 10),
      reservations_confirmed: parseInt(confRes.rows[0].total, 10),
      reservations_expired: parseInt(expRes.rows[0].total, 10),
      uptime_seconds: process.uptime()
    };
  });
};
