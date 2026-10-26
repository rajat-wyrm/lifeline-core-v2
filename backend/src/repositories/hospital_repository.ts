import { query } from '../db/client.js';

export interface HospitalRecord {
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

export class HospitalRepository {
  async getAllHospitals(): Promise<HospitalRecord[]> {
    const sql = `
      SELECT 
        h.id, h.name, h.latitude, h.longitude, h.walk_in_lambda,
        hr.resource_type, hr.total_capacity, hr.available_capacity, hr.reserved_capacity, hr.last_report_timestamp
      FROM hospitals h
      LEFT JOIN hospital_resources hr ON h.id = hr.hospital_id
      ORDER BY h.id ASC;
    `;
    const res = await query(sql);

    const map = new Map<string, HospitalRecord>();
    for (const row of res.rows) {
      if (!map.has(row.id)) {
        map.set(row.id, {
          id: row.id,
          name: row.name,
          latitude: row.latitude,
          longitude: row.longitude,
          walk_in_lambda: row.walk_in_lambda,
          resources: {}
        });
      }
      if (row.resource_type) {
        map.get(row.id)!.resources[row.resource_type] = {
          total: row.total_capacity,
          available: row.available_capacity,
          reserved: row.reserved_capacity,
          last_report_timestamp: Number(row.last_report_timestamp)
        };
      }
    }
    return Array.from(map.values());
  }

  async getHospitalById(id: string): Promise<HospitalRecord | null> {
    const sql = `
      SELECT 
        h.id, h.name, h.latitude, h.longitude, h.walk_in_lambda,
        hr.resource_type, hr.total_capacity, hr.available_capacity, hr.reserved_capacity, hr.last_report_timestamp
      FROM hospitals h
      LEFT JOIN hospital_resources hr ON h.id = hr.hospital_id
      WHERE h.id = $1;
    `;
    const res = await query(sql, [id]);
    if (res.rows.length === 0) return null;

    const first = res.rows[0];
    const record: HospitalRecord = {
      id: first.id,
      name: first.name,
      latitude: first.latitude,
      longitude: first.longitude,
      walk_in_lambda: first.walk_in_lambda,
      resources: {}
    };

    for (const row of res.rows) {
      if (row.resource_type) {
        record.resources[row.resource_type] = {
          total: row.total_capacity,
          available: row.available_capacity,
          reserved: row.reserved_capacity,
          last_report_timestamp: Number(row.last_report_timestamp)
        };
      }
    }
    return record;
  }

  async updateResourceFeed(
    hospitalId: string,
    resourceType: string,
    reportedFree: number,
    reportTimestamp: number
  ): Promise<void> {
    const sql = `
      UPDATE hospital_resources
      SET available_capacity = $1, last_report_timestamp = $2
      WHERE hospital_id = $3 AND resource_type = $4;
    `;
    await query(sql, [reportedFree, reportTimestamp, hospitalId, resourceType]);
  }
}

export const hospitalRepository = new HospitalRepository();
