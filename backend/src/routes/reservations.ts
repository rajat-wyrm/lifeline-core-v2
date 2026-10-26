import { FastifyPluginAsync } from 'fastify';
import { reservationRepository } from '../repositories/reservation_repository.js';
import { engineClient } from '../services/engine_client.js';
import { query } from '../db/client.js';
import { eventsHub } from '../services/events_hub.js';

export const reservationRoutes: FastifyPluginAsync = async (app) => {
  // List all reservations
  app.get('/api/v2/reservations', async (request, reply) => {
    const { expiring } = request.query as { expiring?: string };
    if (expiring === 'true') {
      const threshold = Date.now() + 180000; // expiring within 3 minutes
      const res = await query(
        `SELECT r.*, h.name as hospital_name
         FROM reservations r
         JOIN hospitals h ON r.hospital_id = h.id
         WHERE r.state = 'HELD' AND r.expires_at_ms <= $1
         ORDER BY r.expires_at_ms ASC`,
        [threshold]
      );
      return { count: res.rows.length, data: res.rows };
    }

    const list = await reservationRepository.getAllReservations(100);
    return {
      count: list.length,
      data: list
    };
  });

  // Get reservation history (terminal states)
  app.get('/api/v2/reservations/history', async (request, reply) => {
    const res = await query(
      `SELECT r.*, h.name as hospital_name
       FROM reservations r
       JOIN hospitals h ON r.hospital_id = h.id
       WHERE r.state IN ('CONFIRMED', 'RELEASED', 'EXPIRED')
       ORDER BY r.updated_at DESC LIMIT 100`
    );
    return { count: res.rows.length, data: res.rows };
  });

  // Reconciliation & Invariant Check
  app.get('/api/v2/reservations/reconcile', async (request, reply) => {
    // 1. Check for expired holds still marked as HELD
    const now = Date.now();
    const expiredUnclaimed = await query(
      `SELECT id, hospital_id, resource_type, expires_at_ms
       FROM reservations
       WHERE state = 'HELD' AND expires_at_ms <= $1`,
      [now]
    );

    // 2. Check for capacity discrepancies
    const discRes = await query(
      `SELECT hr.hospital_id, hr.resource_type, hr.reserved_capacity,
              COALESCE(COUNT(r.id), 0) as actual_held
       FROM hospital_resources hr
       LEFT JOIN reservations r ON hr.hospital_id = r.hospital_id
                               AND hr.resource_type = r.resource_type
                               AND r.state = 'HELD'
       GROUP BY hr.hospital_id, hr.resource_type, hr.reserved_capacity
       HAVING hr.reserved_capacity != COALESCE(COUNT(r.id), 0)`
    );

    return {
      timestamp: new Date().toISOString(),
      consistent: expiredUnclaimed.rows.length === 0 && discRes.rows.length === 0,
      expired_unclaimed_count: expiredUnclaimed.rows.length,
      expired_holds: expiredUnclaimed.rows,
      capacity_discrepancies: discRes.rows
    };
  });

  // Get single reservation by ID
  app.get('/api/v2/reservations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const res = await query(
      `SELECT r.*, h.name as hospital_name, h.latitude as hospital_lat, h.longitude as hospital_lon,
              er.trauma_score, er.patient_age, er.origin_latitude, er.origin_longitude
       FROM reservations r
       JOIN hospitals h ON r.hospital_id = h.id
       LEFT JOIN emergency_requests er ON r.request_id = er.id
       WHERE r.id = $1`,
      [id]
    );

    if (res.rows.length === 0) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: `Reservation ${id} not found` });
    }

    const events = await query(
      `SELECT * FROM reservation_events WHERE reservation_id = $1 ORDER BY timestamp_ms ASC`,
      [id]
    );

    return {
      reservation: res.rows[0],
      events: events.rows
    };
  });

  // Confirm reservation
  app.post('/api/v2/reservations/:id/confirm', async (request, reply) => {
    const { id } = request.params as { id: string };

    // 1. Confirm in C++ engine
    try {
      await engineClient.confirmReservation(id);
    } catch (err: any) {
      request.log.warn(`Engine confirm notice failed: ${err.message}`);
    }

    // 2. Transition in PostgreSQL
    const success = await reservationRepository.transitionState(
      id,
      'CONFIRMED',
      'Ambulance arrival confirmed at destination'
    );

    if (!success) {
      return reply.status(409).send({
        error: 'STATE_TRANSITION_REJECTED',
        message: `Reservation ${id} could not be transitioned to CONFIRMED. Only HELD holds can be confirmed.`
      });
    }

    eventsHub.broadcast({
      type: 'RESERVATION_STATE_CHANGED',
      timestamp: new Date().toISOString(),
      data: { id, state: 'CONFIRMED' }
    });

    return { reservation_id: id, state: 'CONFIRMED', success: true };
  });

  // Release reservation (voluntary cancellation)
  app.post('/api/v2/reservations/:id/release', async (request, reply) => {
    const { id } = request.params as { id: string };

    // 1. Release in C++ engine
    try {
      await engineClient.releaseReservation(id);
    } catch (err: any) {
      request.log.warn(`Engine release notice failed: ${err.message}`);
    }

    // 2. Transition in PostgreSQL
    const success = await reservationRepository.transitionState(
      id,
      'RELEASED',
      'Ambulance cancelled or diverted before arrival'
    );

    if (!success) {
      return reply.status(409).send({
        error: 'STATE_TRANSITION_REJECTED',
        message: `Reservation ${id} could not be transitioned to RELEASED.`
      });
    }

    eventsHub.broadcast({
      type: 'RESERVATION_STATE_CHANGED',
      timestamp: new Date().toISOString(),
      data: { id, state: 'RELEASED' }
    });

    return { reservation_id: id, state: 'RELEASED', success: true };
  });
};
