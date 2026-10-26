import { query, withTransaction } from '../db/client.js';

export interface ReservationRecord {
  id: string;
  hospital_id: string;
  resource_type: string;
  request_id: string;
  ambulance_id: string;
  state: 'HELD' | 'CONFIRMED' | 'RELEASED' | 'EXPIRED';
  created_at_ms: number;
  expires_at_ms: number;
  updated_at: string;
}

export class ReservationRepository {
  async createReservation(data: {
    id: string;
    hospital_id: string;
    resource_type: string;
    request_id: string;
    ambulance_id: string;
    state: string;
    created_at_ms: number;
    expires_at_ms: number;
  }): Promise<void> {
    await withTransaction(async (client) => {
      const sql = `
        INSERT INTO reservations (id, hospital_id, resource_type, request_id, ambulance_id, state, created_at_ms, expires_at_ms)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
      `;
      await client.query(sql, [
        data.id,
        data.hospital_id,
        data.resource_type,
        data.request_id,
        data.ambulance_id,
        data.state,
        data.created_at_ms,
        data.expires_at_ms
      ]);

      // Record event
      await client.query(`
        INSERT INTO reservation_events (reservation_id, from_state, to_state, event_reason, timestamp_ms)
        VALUES ($1, NULL, $2, 'Initial atomic reservation hold created', $3);
      `, [data.id, data.state, data.created_at_ms]);
    });
  }

  async transitionState(
    reservationId: string,
    targetState: 'CONFIRMED' | 'RELEASED' | 'EXPIRED',
    reason: string
  ): Promise<boolean> {
    return await withTransaction(async (client) => {
      // Check current state under row-level lock
      const checkRes = await client.query(
        'SELECT state, hospital_id, resource_type FROM reservations WHERE id = $1 FOR UPDATE',
        [reservationId]
      );
      if (checkRes.rows.length === 0) return false;

      const current = checkRes.rows[0];
      if (current.state !== 'HELD') {
        // Can only transition from HELD
        return false;
      }

      const now = Date.now();
      await client.query(
        'UPDATE reservations SET state = $1, updated_at = NOW() WHERE id = $2',
        [targetState, reservationId]
      );

      await client.query(`
        INSERT INTO reservation_events (reservation_id, from_state, to_state, event_reason, timestamp_ms)
        VALUES ($1, $2, $3, $4, $5);
      `, [reservationId, current.state, targetState, reason, now]);

      return true;
    });
  }

  async getAllReservations(limit: number = 100): Promise<ReservationRecord[]> {
    const res = await query(
      'SELECT * FROM reservations ORDER BY created_at_ms DESC LIMIT $1',
      [limit]
    );
    return res.rows.map(r => ({
      ...r,
      created_at_ms: Number(r.created_at_ms),
      expires_at_ms: Number(r.expires_at_ms)
    }));
  }

  async getReservationById(id: string): Promise<ReservationRecord | null> {
    const res = await query('SELECT * FROM reservations WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      ...r,
      created_at_ms: Number(r.created_at_ms),
      expires_at_ms: Number(r.expires_at_ms)
    };
  }
}

export const reservationRepository = new ReservationRepository();
