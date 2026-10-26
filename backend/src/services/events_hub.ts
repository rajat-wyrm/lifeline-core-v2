import { FastifyReply } from 'fastify';

export interface OperationalEvent {
  type: 'RESERVATION_CREATED' | 'RESERVATION_STATE_CHANGED' | 'CAPACITY_UPDATED' | 'ALERT_RAISED' | 'ALERT_RESOLVED' | 'HEARTBEAT';
  timestamp: string;
  data: any;
}

class EventsHub {
  private clients: Set<FastifyReply> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.broadcast({
        type: 'HEARTBEAT',
        timestamp: new Date().toISOString(),
        data: { status: 'OK', connected_clients: this.clients.size }
      });
    }, 15000);
    if (this.heartbeatInterval.unref) {
      this.heartbeatInterval.unref();
    }
  }

  public close() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  public registerClient(reply: FastifyReply) {
    this.clients.add(reply);

    // Initial connection message
    reply.raw.write(`event: connected\ndata: ${JSON.stringify({ message: 'Connected to Lifeline-Core v3 Telemetry Stream', timestamp: new Date().toISOString() })}\n\n`);

    reply.raw.on('close', () => {
      this.clients.delete(reply);
    });
  }

  public broadcast(event: OperationalEvent) {
    const payload = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
    for (const client of this.clients) {
      try {
        client.raw.write(payload);
      } catch (_) {
        this.clients.delete(client);
      }
    }
  }

  public getSubscriberCount(): number {
    return this.clients.size;
  }
}

export const eventsHub = new EventsHub();
