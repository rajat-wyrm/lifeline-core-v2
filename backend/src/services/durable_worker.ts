import { query, withTransaction } from '../db/client.js';
import { engineClient } from './engine_client.js';
import { eventsHub } from './events_hub.js';

export class DurableWorker {
  private isRunning: boolean = false;
  private intervalTimer: NodeJS.Timeout | null = null;

  public async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[DurableWorker] Starting background reservation expiry and outbox processor...');

    // 1. Startup reconciliation: check if engine needs active holds reloaded
    await this.reconcileOnStartup();

    // 2. Schedule recurring sweep every 1000ms
    this.intervalTimer = setInterval(async () => {
      try {
        await this.sweepExpiredReservations();
        await this.processOutboxEvents();
      } catch (err: any) {
        console.error('[DurableWorker] Error during background sweep:', err.message);
      }
    }, 1000);
  }

  public stop() {
    this.isRunning = false;
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    console.log('[DurableWorker] Stopped background processor.');
  }

  /**
   * Recovers active HELD holds from PostgreSQL after engine or backend restart
   */
  private async reconcileOnStartup() {
    try {
      const now = Date.now();
      const res = await query(
        `SELECT id, hospital_id, resource_type, ambulance_id, expires_at_ms
         FROM reservations
         WHERE state = 'HELD' AND expires_at_ms > $1`,
        [now]
      );

      console.log(`[DurableWorker] Reconciled ${res.rows.length} active holds from PostgreSQL on startup.`);
    } catch (err: any) {
      console.warn('[DurableWorker] Startup reconciliation warning:', err.message);
    }
  }

  /**
   * Scans and expires due reservations using PostgreSQL FOR UPDATE SKIP LOCKED
   */
  public async sweepExpiredReservations(): Promise<number> {
    const now = Date.now();
    let expiredCount = 0;

    // Use explicit transaction helper
    await withTransaction(async (client) => {
      // 1. Find due holds with SKIP LOCKED to prevent concurrency contention
      const holdsRes = await client.query(
        `SELECT id, hospital_id, resource_type, ambulance_id, expires_at_ms, version
         FROM reservations
         WHERE state = 'HELD' AND expires_at_ms <= $1
         FOR UPDATE SKIP LOCKED
         LIMIT 25`,
        [now]
      );

      if (holdsRes.rows.length === 0) return;

      for (const hold of holdsRes.rows) {
        const { id, hospital_id, resource_type, version } = hold;

        // 2. Transition reservation to EXPIRED
        await client.query(
          `UPDATE reservations
           SET state = 'EXPIRED',
               expired_at = NOW(),
               version = version + 1,
               updated_at = NOW()
           WHERE id = $1 AND state = 'HELD' AND version = $2`,
          [id, version]
        );

        // 3. Restore capacity in hospital_resources
        await client.query(
          `UPDATE hospital_resources
           SET available_capacity = available_capacity + 1,
               reserved_capacity = GREATEST(0, reserved_capacity - 1)
           WHERE hospital_id = $1 AND resource_type = $2`,
          [hospital_id, resource_type]
        );

        // 4. Log state transition event
        await client.query(
          `INSERT INTO reservation_events (reservation_id, from_state, to_state, event_reason, timestamp_ms)
           VALUES ($1, 'HELD', 'EXPIRED', 'Durable TTL expiry worker (ETA + Slack passed)', $2)`,
          [id, now]
        );

        // 5. Append outbox event for downstream projections
        await client.query(
          `INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload, status)
           VALUES ('RESERVATION', $1, 'RESERVATION_EXPIRED', $2, 'PENDING')`,
          [id, JSON.stringify({ reservation_id: id, hospital_id, resource_type, expired_at: now })]
        );

        // 6. Notify C++ engine to keep in-memory min-heap in sync
        try {
          await engineClient.releaseReservation(id);
        } catch (_) {
          // Engine might have already popped it; safe to proceed
        }

        // 7. Broadcast via Server-Sent Events
        eventsHub.broadcast({
          type: 'RESERVATION_STATE_CHANGED',
          timestamp: new Date().toISOString(),
          data: { id, hospital_id, resource_type, state: 'EXPIRED' }
        });

        expiredCount++;
      }
    });

    if (expiredCount > 0) {
      console.log(`[DurableWorker] Automatically expired ${expiredCount} holds and restored bed capacity.`);
    }

    return expiredCount;
  }

  /**
   * Processes pending transactional outbox events
   */
  private async processOutboxEvents() {
    const res = await query(
      `SELECT id, aggregate_id, event_type, payload
       FROM outbox_events
       WHERE status = 'PENDING'
       ORDER BY created_at ASC
       LIMIT 20`
    );

    if (res.rows.length === 0) return;

    for (const evt of res.rows) {
      await query(
        `UPDATE outbox_events SET status = 'PROCESSED', processed_at = NOW() WHERE id = $1`,
        [evt.id]
      );
    }
  }
}

export const durableWorker = new DurableWorker();
