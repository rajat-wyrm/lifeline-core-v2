const API_BASE = typeof window === 'undefined' ? 'http://127.0.0.1:3001' : '';

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    },
    cache: 'no-store'
  });

  if (!res.ok) {
    let errorMsg = `API Error ${res.status}`;
    try {
      const errJson = await res.json();
      errorMsg = errJson.message || errJson.error || errorMsg;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  return res.json() as Promise<T>;
}

export interface Hospital {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  walk_in_lambda: number;
  resources: Record<string, {
    total: number;
    available: number;
    reserved: number;
    last_report_timestamp: number;
  }>;
}

export interface Reservation {
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

export interface EmergencyRequest {
  id: string;
  patient_age: number;
  trauma_score: number;
  required_resource: string;
  origin_latitude: number;
  origin_longitude: number;
  status: string;
  created_at: string;
}
