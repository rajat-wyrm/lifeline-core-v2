import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { query } from '../db/client.js';
import { eventsHub } from '../services/events_hub.js';

const ResolveAlertSchema = z.object({
  notes: z.string().min(3)
});

const CreateAlertSchema = z.object({
  hospital_id: z.string().optional(),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL']),
  code: z.string().min(2),
  message: z.string().min(5)
});

export const alertRoutes: FastifyPluginAsync = async (app) => {
  // List alerts
  app.get('/api/v2/alerts', async (request, reply) => {
    const { status, severity } = request.query as { status?: string; severity?: string };

    let sql = `
      SELECT a.*, h.name as hospital_name, u.full_name as acknowledged_by_name
      FROM alerts a
      LEFT JOIN hospitals h ON a.hospital_id = h.id
      LEFT JOIN users u ON a.acknowledged_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status === 'ACTIVE') {
      sql += ` AND a.resolved_at IS NULL AND a.is_acknowledged = FALSE`;
    } else if (status === 'ACKNOWLEDGED') {
      sql += ` AND a.resolved_at IS NULL AND a.is_acknowledged = TRUE`;
    } else if (status === 'RESOLVED') {
      sql += ` AND a.resolved_at IS NOT NULL`;
    }

    if (severity && ['INFO', 'WARNING', 'CRITICAL'].includes(severity)) {
      params.push(severity);
      sql += ` AND a.severity = $${params.length}`;
    }

    sql += ` ORDER BY a.created_at DESC LIMIT 100`;

    const res = await query(sql, params);
    return {
      count: res.rows.length,
      data: res.rows
    };
  });

  // Acknowledge alert
  app.post('/api/v2/alerts/:id/acknowledge', async (request, reply) => {
    const { id } = request.params as { id: string };
    const actorId = request.user?.id || 'USR-DISPATCH-01';

    const res = await query(
      `UPDATE alerts
       SET is_acknowledged = TRUE,
           acknowledged_by = $2,
           acknowledged_at = NOW()
       WHERE id = $1 AND resolved_at IS NULL
       RETURNING *`,
      [id, actorId]
    );

    if (res.rows.length === 0) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: `Alert ${id} not found or already resolved.` });
    }

    const updated = res.rows[0];
    eventsHub.broadcast({
      type: 'ALERT_RAISED',
      timestamp: new Date().toISOString(),
      data: updated
    });

    return { success: true, alert: updated };
  });

  // Resolve alert
  app.post('/api/v2/alerts/:id/resolve', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parse = ResolveAlertSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', details: parse.error.format() });
    }

    const res = await query(
      `UPDATE alerts
       SET resolved_at = NOW(),
           resolution_notes = $2
       WHERE id = $1
       RETURNING *`,
      [id, parse.data.notes]
    );

    if (res.rows.length === 0) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: `Alert ${id} not found.` });
    }

    const updated = res.rows[0];
    eventsHub.broadcast({
      type: 'ALERT_RESOLVED',
      timestamp: new Date().toISOString(),
      data: updated
    });

    return { success: true, alert: updated };
  });

  // Create alert
  app.post('/api/v2/alerts', async (request, reply) => {
    const parse = CreateAlertSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', details: parse.error.format() });
    }

    const { hospital_id, severity, code, message } = parse.data;
    const alertId = `ALT-${Date.now()}`;

    const res = await query(
      `INSERT INTO alerts (id, hospital_id, severity, code, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [alertId, hospital_id || null, severity, code, message]
    );

    const created = res.rows[0];
    eventsHub.broadcast({
      type: 'ALERT_RAISED',
      timestamp: new Date().toISOString(),
      data: created
    });

    return { success: true, alert: created };
  });
};
