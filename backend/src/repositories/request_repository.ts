import { query } from '../db/client.js';

export interface EmergencyRequestRecord {
  id: string;
  patient_age: number;
  trauma_score: number;
  required_resource: string;
  origin_latitude: number;
  origin_longitude: number;
  status: string;
  created_at: string;
}

export class RequestRepository {
  async createRequest(data: {
    id: string;
    patient_age: number;
    trauma_score: number;
    required_resource: string;
    origin_latitude: number;
    origin_longitude: number;
    status?: string;
  }): Promise<void> {
    const sql = `
      INSERT INTO emergency_requests (id, patient_age, trauma_score, required_resource, origin_latitude, origin_longitude, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING;
    `;
    await query(sql, [
      data.id,
      data.patient_age,
      data.trauma_score,
      data.required_resource,
      data.origin_latitude,
      data.origin_longitude,
      data.status || 'PENDING'
    ]);
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await query('UPDATE emergency_requests SET status = $1 WHERE id = $2', [status, id]);
  }

  async getRecentRequests(limit: number = 50): Promise<EmergencyRequestRecord[]> {
    const res = await query('SELECT * FROM emergency_requests ORDER BY created_at DESC LIMIT $1', [limit]);
    return res.rows;
  }

  async getRequestById(id: string): Promise<EmergencyRequestRecord | null> {
    const res = await query('SELECT * FROM emergency_requests WHERE id = $1', [id]);
    return res.rows.length > 0 ? res.rows[0] : null;
  }
}

export const requestRepository = new RequestRepository();
