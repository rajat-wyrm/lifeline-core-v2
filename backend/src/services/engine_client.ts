import { config } from '../config/index.js';

export interface AllocationEngineResponse {
  success: boolean;
  request_id: string;
  allocation_id?: string;
  chosen_hospital_id?: string;
  chosen_hospital_name?: string;
  resource_type: string;
  eta_seconds: number;
  distance_km: number;
  freshness_score: number;
  p_free_on_arrival: number;
  expires_at_ms?: number;
  fallback_count: number;
  decision_latency_us: number;
  policy: string;
  ranked_candidates?: Array<{
    hospital_id: string;
    hospital_name: string;
    score: number;
    eta_seconds: number;
    distance_km: number;
    freshness_score: number;
    effective_available: number;
    p_free_on_arrival: number;
    explanation: string;
    reservation_attempted: boolean;
    reservation_succeeded: boolean;
  }>;
}

export class EngineClient {
  private baseUrl: string;

  constructor(baseUrl: string = config.engineUrl) {
    this.baseUrl = baseUrl;
  }

  async checkHealth(): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(2000) });
      const latencyMs = Date.now() - start;
      if (res.ok) {
        return { healthy: true, latencyMs };
      }
      return { healthy: false, latencyMs, error: `HTTP ${res.status}` };
    } catch (err: any) {
      return { healthy: false, latencyMs: Date.now() - start, error: err.message };
    }
  }

  async allocate(payload: {
    request_id: string;
    patient_age: number;
    trauma_score: number;
    required_resource: string;
    origin_lat: number;
    origin_lon: number;
    ambulance_id: string;
    ttl_ms: number;
  }): Promise<AllocationEngineResponse> {
    const res = await fetch(`${this.baseUrl}/allocate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Engine allocation failed (${res.status}): ${errorText}`);
    }

    return (await res.json()) as AllocationEngineResponse;
  }

  async confirmReservation(reservationId: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/reservations/${reservationId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.ok;
  }

  async releaseReservation(reservationId: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/reservations/${reservationId}/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.ok;
  }

  async applyFeedUpdate(payload: {
    hospital_id: string;
    resource_type: string;
    reported_free: number;
    report_timestamp_ms: number;
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/hospitals/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  }

  async getTriageQueue(): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/triage`);
    if (!res.ok) return [];
    return (await res.json()) as any[];
  }
}

export const engineClient = new EngineClient();
