import { FastifyPluginAsync } from 'fastify';
import { CreateEmergencyRequestSchema } from '../schemas/index.js';
import { requestRepository } from '../repositories/request_repository.js';
import { reservationRepository } from '../repositories/reservation_repository.js';
import { engineClient } from '../services/engine_client.js';
import { query } from '../db/client.js';
import { eventsHub } from '../services/events_hub.js';

export const requestRoutes: FastifyPluginAsync = async (app) => {
  // Create and allocate emergency request (with Idempotency support)
  app.post('/api/v2/requests', async (request, reply) => {
    // Check Idempotency-Key
    const idempotencyKey = request.headers['idempotency-key'] as string | undefined;
    if (idempotencyKey) {
      const existing = await query(
        `SELECT response_status, response_body FROM idempotency_keys WHERE key = $1 AND expires_at > NOW()`,
        [idempotencyKey]
      );
      if (existing.rows.length > 0) {
        return reply.status(existing.rows[0].response_status).send(existing.rows[0].response_body);
      }
    }

    const parse = CreateEmergencyRequestSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        details: parse.error.format()
      });
    }

    const input = parse.data;
    const requestId = `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 1. Record emergency request in PostgreSQL
    await requestRepository.createRequest({
      id: requestId,
      patient_age: input.patient_age,
      trauma_score: input.trauma_score,
      required_resource: input.required_resource,
      origin_latitude: input.origin_latitude,
      origin_longitude: input.origin_longitude,
      status: 'PENDING'
    });

    // 2. Delegate authoritative allocation to C++ Engine
    let engineAlloc;
    try {
      engineAlloc = await engineClient.allocate({
        request_id: requestId,
        patient_age: input.patient_age,
        trauma_score: input.trauma_score,
        required_resource: input.required_resource,
        origin_lat: input.origin_latitude,
        origin_lon: input.origin_longitude,
        ambulance_id: input.ambulance_id,
        ttl_ms: input.ttl_ms
      });
    } catch (err: any) {
      request.log.error(`Engine allocation failed: ${err.message}`);
      await requestRepository.updateStatus(requestId, 'FAILED');
      return reply.status(503).send({
        error: 'ALLOCATION_ENGINE_UNAVAILABLE',
        message: 'The authoritative C++ allocation engine is currently unavailable.',
        request_id: requestId
      });
    }

    // 3. If reservation succeeded, record in PostgreSQL
    if (engineAlloc.success && engineAlloc.allocation_id && engineAlloc.chosen_hospital_id) {
      await reservationRepository.createReservation({
        id: engineAlloc.allocation_id,
        hospital_id: engineAlloc.chosen_hospital_id,
        resource_type: input.required_resource,
        request_id: requestId,
        ambulance_id: input.ambulance_id,
        state: 'HELD',
        created_at_ms: Date.now(),
        expires_at_ms: engineAlloc.expires_at_ms || (Date.now() + input.ttl_ms)
      });

      // Insert line item
      await query(
        `INSERT INTO reservation_lines (reservation_id, resource_type, quantity)
         VALUES ($1, $2, 1) ON CONFLICT DO NOTHING`,
        [engineAlloc.allocation_id, input.required_resource]
      );

      await requestRepository.updateStatus(requestId, 'ALLOCATED');

      // Broadcast event
      eventsHub.broadcast({
        type: 'RESERVATION_CREATED',
        timestamp: new Date().toISOString(),
        data: {
          reservation_id: engineAlloc.allocation_id,
          hospital_id: engineAlloc.chosen_hospital_id,
          request_id: requestId,
          resource_type: input.required_resource
        }
      });
    } else {
      await requestRepository.updateStatus(requestId, 'FAILED');
    }

    // 4. Record audit log
    await query(`
      INSERT INTO audit_logs (correlation_id, action, payload)
      VALUES ($1, 'EMERGENCY_REQUEST_ALLOCATED', $2);
    `, [requestId, JSON.stringify(engineAlloc)]);

    const responsePayload = {
      request_id: requestId,
      allocation: engineAlloc
    };
    const statusCode = engineAlloc.success ? 200 : 409;

    // Save Idempotency Key if provided
    if (idempotencyKey) {
      await query(
        `INSERT INTO idempotency_keys (key, route, request_hash, response_status, response_body, expires_at)
         VALUES ($1, '/api/v2/requests', $2, $3, $4, NOW() + INTERVAL '24 hours')
         ON CONFLICT (key) DO NOTHING`,
        [idempotencyKey, requestId, statusCode, JSON.stringify(responsePayload)]
      );
    }

    return reply.status(statusCode).send(responsePayload);
  });

  // List recent requests
  app.get('/api/v2/requests', async (request, reply) => {
    const list = await requestRepository.getRecentRequests(50);
    return { data: list };
  });

  // Get request details
  app.get('/api/v2/requests/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const reqRecord = await requestRepository.getRequestById(id);
    if (!reqRecord) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: `Request ${id} not found` });
    }

    // Fetch linked reservation
    const resRes = await query('SELECT * FROM reservations WHERE request_id = $1', [id]);
    const auditRes = await query('SELECT * FROM audit_logs WHERE correlation_id = $1', [id]);

    return {
      data: reqRecord,
      reservation: resRes.rows[0] || null,
      audit: auditRes.rows
    };
  });

  // Candidate allocation analysis breakdown
  app.get('/api/v2/requests/:id/allocation', async (request, reply) => {
    const { id } = request.params as { id: string };
    const auditRes = await query(
      `SELECT payload FROM audit_logs WHERE correlation_id = $1 AND action = 'EMERGENCY_REQUEST_ALLOCATED'`,
      [id]
    );

    if (auditRes.rows.length === 0) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: `Allocation trace for request ${id} not found` });
    }

    return {
      request_id: id,
      allocation_trace: auditRes.rows[0].payload
    };
  });

  // Chronological timeline for request
  app.get('/api/v2/requests/:id/timeline', async (request, reply) => {
    const { id } = request.params as { id: string };
    const reqRecord = await requestRepository.getRequestById(id);
    if (!reqRecord) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: `Request ${id} not found` });
    }

    const eventsRes = await query(
      `SELECT re.*, r.hospital_id
       FROM reservation_events re
       JOIN reservations r ON re.reservation_id = r.id
       WHERE r.request_id = $1
       ORDER BY re.timestamp_ms ASC`,
      [id]
    );

    const auditRes = await query(
      `SELECT action, payload, created_at FROM audit_logs WHERE correlation_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    return {
      request_id: id,
      events: eventsRes.rows,
      audit: auditRes.rows
    };
  });

  // Global allocations list
  app.get('/api/v2/allocations', async (request, reply) => {
    const res = await query(
      `SELECT r.id as reservation_id, r.hospital_id, h.name as hospital_name, r.resource_type,
              r.request_id, r.state, r.created_at_ms, r.expires_at_ms, er.trauma_score, er.patient_age
       FROM reservations r
       JOIN hospitals h ON r.hospital_id = h.id
       LEFT JOIN emergency_requests er ON r.request_id = er.id
       ORDER BY r.created_at_ms DESC LIMIT 100`
    );
    return { count: res.rows.length, data: res.rows };
  });

  // Single allocation decision record
  app.get('/api/v2/allocations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const res = await query(
      `SELECT r.*, h.name as hospital_name, h.latitude, h.longitude,
              er.trauma_score, er.patient_age, er.origin_latitude, er.origin_longitude
       FROM reservations r
       JOIN hospitals h ON r.hospital_id = h.id
       LEFT JOIN emergency_requests er ON r.request_id = er.id
       WHERE r.id = $1`,
      [id]
    );

    if (res.rows.length === 0) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: `Allocation ${id} not found` });
    }

    const auditRes = await query(
      `SELECT payload FROM audit_logs WHERE correlation_id = $1`,
      [res.rows[0].request_id]
    );

    return {
      allocation: res.rows[0],
      decision_trace: auditRes.rows[0]?.payload || null
    };
  });
};
