import { z } from 'zod';

export const ResourceTypeEnum = z.enum(['ICU-BED', 'VENTILATOR', 'OXYGEN-BED', 'GENERAL-BED']);
export type ResourceType = z.infer<typeof ResourceTypeEnum>;

export const ReservationStateEnum = z.enum(['HELD', 'CONFIRMED', 'RELEASED', 'EXPIRED']);
export type ReservationState = z.infer<typeof ReservationStateEnum>;

export const PolicyEnum = z.enum(['NEAREST_HOSPITAL', 'PORTAL_COUNT', 'LIFELINE_CORE']);
export type Policy = z.infer<typeof PolicyEnum>;

export const CreateEmergencyRequestSchema = z.object({
  patient_age: z.number().int().min(1).max(125).default(45),
  trauma_score: z.number().int().min(1).max(5).default(3),
  required_resource: ResourceTypeEnum.default('ICU-BED'),
  origin_latitude: z.number().min(30.0).max(31.5),
  origin_longitude: z.number().min(76.0).max(77.5),
  ambulance_id: z.string().default('AMB-101'),
  ttl_ms: z.number().int().min(60000).max(3600000).default(900000), // 1 to 60 mins
  policy: PolicyEnum.default('LIFELINE_CORE')
});

export type CreateEmergencyRequestInput = z.infer<typeof CreateEmergencyRequestSchema>;

export const HospitalFeedUpdateSchema = z.object({
  hospital_id: z.string().min(1),
  resource_type: ResourceTypeEnum,
  reported_free: z.number().int().min(0),
  report_timestamp_ms: z.number().int().default(() => Date.now())
});

export type HospitalFeedUpdateInput = z.infer<typeof HospitalFeedUpdateSchema>;

export const RunSimulationSchema = z.object({
  scenario: z.enum(['normal_day', 'contention_surge', 'feed_outage_chaos']).default('normal_day'),
  policy: PolicyEnum.default('LIFELINE_CORE'),
  num_requests: z.number().int().min(10).max(1000).default(100),
  seed: z.number().int().default(42),
  freeze_hospitals: z.array(z.string()).optional()
});

export type RunSimulationInput = z.infer<typeof RunSimulationSchema>;
