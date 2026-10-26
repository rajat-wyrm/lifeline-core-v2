import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { hospitalRepository } from '../repositories/hospital_repository.js';
import { HospitalFeedUpdateSchema } from '../schemas/index.js';
import { engineClient } from '../services/engine_client.js';
import { query } from '../db/client.js';

const CreateHospitalSchema = z.object({
  id: z.string().min(3),
  name: z.string().min(3),
  latitude: z.number().min(30.0).max(31.5),
  longitude: z.number().min(76.0).max(77.5),
  walk_in_lambda: z.number().min(0.01).max(5.0).default(0.15),
  trauma_level: z.string().default('LEVEL_2'),
  contact_phone: z.string().default('+91-172-2747585'),
  address: z.string().default('Chandigarh Metropolitan Area'),
  resources: z.record(z.object({
    total: z.number().min(0),
    available: z.number().min(0)
  }))
});

export const hospitalRoutes: FastifyPluginAsync = async (app) => {
  // List all hospitals
  app.get('/api/v2/hospitals', async (request, reply) => {
    const hospitals = await hospitalRepository.getAllHospitals();
    return {
      count: hospitals.length,
      data: hospitals
    };
  });

  // Register new hospital
  app.post('/api/v2/hospitals', async (request, reply) => {
    const parse = CreateHospitalSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', details: parse.error.format() });
    }

    const { id, name, latitude, longitude, walk_in_lambda, trauma_level, contact_phone, address, resources } = parse.data;

    await query(
      `INSERT INTO hospitals (id, name, latitude, longitude, walk_in_lambda, trauma_level, contact_phone, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, name, latitude, longitude, walk_in_lambda, trauma_level, contact_phone, address]
    );

    const nowMs = Date.now();
    for (const [resType, cap] of Object.entries(resources)) {
      await query(
        `INSERT INTO hospital_resources (hospital_id, resource_type, total_capacity, available_capacity, reserved_capacity, last_report_timestamp)
         VALUES ($1, $2, $3, $4, 0, $5)`,
        [id, resType, cap.total, cap.available, nowMs]
      );
    }

    await query(
      `INSERT INTO audit_logs (correlation_id, action, payload)
       VALUES ($1, 'HOSPITAL_REGISTERED', $2)`,
      [`HOSP-REG-${Date.now()}`, JSON.stringify({ hospital_id: id, name })]
    );

    return { success: true, hospital_id: id };
  });

  // Get hospital by ID
  app.get('/api/v2/hospitals/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const hospital = await hospitalRepository.getHospitalById(id);
    if (!hospital) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: `Hospital ${id} not found`
      });
    }
    return { data: hospital };
  });

  // Granular resource list for hospital
  app.get('/api/v2/hospitals/:id/resources', async (request, reply) => {
    const { id } = request.params as { id: string };
    const res = await query(
      `SELECT resource_type, total_capacity, available_capacity, reserved_capacity, last_report_timestamp
       FROM hospital_resources
       WHERE hospital_id = $1
       ORDER BY resource_type ASC`,
      [id]
    );

    const activeHolds = await query(
      `SELECT id, resource_type, ambulance_id, state, expires_at_ms
       FROM reservations
       WHERE hospital_id = $1 AND state = 'HELD'
       ORDER BY expires_at_ms ASC`,
      [id]
    );

    return {
      hospital_id: id,
      resources: res.rows,
      active_holds: activeHolds.rows
    };
  });

  // Capability profile for hospital
  app.get('/api/v2/hospitals/:id/capabilities', async (request, reply) => {
    const { id } = request.params as { id: string };
    const res = await query(
      `SELECT * FROM hospital_capability_profiles WHERE hospital_id = $1`,
      [id]
    );

    if (res.rows.length === 0) {
      return {
        hospital_id: id,
        profile: {
          trauma_center_level: 'LEVEL_2',
          has_pediatric_icu: true,
          has_cardiac_cath_lab: true,
          has_burn_unit: false,
          has_helipad: false,
          specialties: ['EMERGENCY', 'CRITICAL_CARE', 'GENERAL_SURGERY'],
          restrictions: []
        }
      };
    }
    return { hospital_id: id, profile: res.rows[0] };
  });

  // Feed health and telemetry stats
  app.get('/api/v2/hospitals/:id/feed-health', async (request, reply) => {
    const { id } = request.params as { id: string };
    const hospRes = await query(`SELECT id, name, updated_at FROM hospitals WHERE id = $1`, [id]);
    if (hospRes.rows.length === 0) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: `Hospital ${id} not found` });
    }

    const logsRes = await query(
      `SELECT id, resource_type, report_timestamp, latency_ms, status, created_at
       FROM hospital_feed_logs
       WHERE hospital_id = $1
       ORDER BY created_at DESC LIMIT 20`,
      [id]
    );

    return {
      hospital_id: id,
      feed_status: 'ONLINE',
      recent_feed_logs: logsRes.rows
    };
  });

  // Hospital status history
  app.get('/api/v2/hospitals/:id/status-history', async (request, reply) => {
    const { id } = request.params as { id: string };
    const historyRes = await query(
      `SELECT * FROM hospital_status_history WHERE hospital_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [id]
    );
    return {
      hospital_id: id,
      count: historyRes.rows.length,
      data: historyRes.rows
    };
  });

  // Hospital-specific audit trail
  app.get('/api/v2/hospitals/:id/audit', async (request, reply) => {
    const { id } = request.params as { id: string };
    const auditRes = await query(
      `SELECT * FROM audit_logs
       WHERE payload::text LIKE $1 OR correlation_id LIKE $1
       ORDER BY created_at DESC LIMIT 50`,
      [`%${id}%`]
    );
    return {
      hospital_id: id,
      count: auditRes.rows.length,
      data: auditRes.rows
    };
  });

  // Update specific resource type directly
  app.post('/api/v2/hospitals/:id/resources/:type', async (request, reply) => {
    const { id, type } = request.params as { id: string; type: string };
    const { total, available } = request.body as { total?: number; available?: number };

    if (available === undefined && total === undefined) {
      return reply.status(400).send({ error: 'MISSING_DATA', message: 'Provide total or available' });
    }

    const now = Date.now();
    await query(
      `UPDATE hospital_resources
       SET available_capacity = COALESCE($1, available_capacity),
           total_capacity = COALESCE($2, total_capacity),
           last_report_timestamp = $3
       WHERE hospital_id = $4 AND resource_type = $5`,
      [available, total, now, id, type]
    );

    // Notify engine
    try {
      await engineClient.applyFeedUpdate({
        hospital_id: id,
        resource_type: type,
        reported_free: available ?? 5,
        report_timestamp_ms: now
      });
    } catch (_) {}

    return { success: true, hospital_id: id, resource_type: type, updated_at: new Date(now).toISOString() };
  });

  // Update hospital feed (stale report testing and live updates)
  app.post('/api/v2/hospitals/feed', async (request, reply) => {
    const parse = HospitalFeedUpdateSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        details: parse.error.format()
      });
    }

    const { hospital_id, resource_type, reported_free, report_timestamp_ms } = parse.data;

    // 1. Sync to C++ Allocation Engine
    let engineRes: any = { status: 'ENGINE_OFFLINE' };
    try {
      engineRes = await engineClient.applyFeedUpdate({
        hospital_id,
        resource_type,
        reported_free,
        report_timestamp_ms
      });
    } catch (err: any) {
      request.log.warn(`Engine update skipped: ${err.message}`);
    }

    // 2. Update PostgreSQL database
    await hospitalRepository.updateResourceFeed(hospital_id, resource_type, reported_free, report_timestamp_ms);

    return {
      status: 'FEED_PROCESSED',
      hospital_id,
      resource_type,
      reported_free,
      report_timestamp_ms,
      engine_sync: engineRes
    };
  });
};
