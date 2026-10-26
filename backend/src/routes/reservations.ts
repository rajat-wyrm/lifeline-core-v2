import { FastifyPluginAsync } from 'fastify';
import { reservationRepository } from '../repositories/reservation_repository.js';
import { engineClient } from '../services/engine_client.js';

export const reservationRoutes: FastifyPluginAsync = async (app) => {
  // List all reservations
  app.get('/api/v2/reservations', async (request, reply) => {
    const list = await reservationRepository.getAllReservations(100);
    return {
      count: list.length,
      data: list
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

    return { reservation_id: id, state: 'RELEASED', success: true };
  });
};
