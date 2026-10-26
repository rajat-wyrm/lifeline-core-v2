import { FastifyPluginAsync } from 'fastify';
import { CreateEmergencyRequestSchema } from '../schemas/index.js';
import { requestRepository } from '../repositories/request_repository.js';
import { reservationRepository } from '../repositories/reservation_repository.js';
import { engineClient } from '../services/engine_client.js';
import { query } from '../db/client.js';

export const requestRoutes: FastifyPluginAsync = async (app) => {
  // Create and allocate emergency request
  app.post('/api/v2/requests', async (request, reply) => {
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
      await requestRepository.updateStatus(requestId, 'ALLOCATED');
    } else {
      await requestRepository.updateStatus(requestId, 'FAILED');
    }

    // 4. Record audit log
    await query(`
      INSERT INTO audit_logs (correlation_id, action, payload)
      VALUES ($1, 'EMERGENCY_REQUEST_ALLOCATED', $2);
    `, [requestId, JSON.stringify(engineAlloc)]);

    return reply.status(engineAlloc.success ? 200 : 409).send({
      request_id: requestId,
      allocation: engineAlloc
    });
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

    // Fetch associated audit logs
    const auditRes = await query('SELECT * FROM audit_logs WHERE correlation_id = $1', [id]);

    return {
      data: reqRecord,
      audit: auditRes.rows
    };
  });
};
