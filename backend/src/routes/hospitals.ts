import { FastifyPluginAsync } from 'fastify';
import { hospitalRepository } from '../repositories/hospital_repository.js';
import { HospitalFeedUpdateSchema } from '../schemas/index.js';
import { engineClient } from '../services/engine_client.js';

export const hospitalRoutes: FastifyPluginAsync = async (app) => {
  // List all hospitals
  app.get('/api/v2/hospitals', async (request, reply) => {
    const hospitals = await hospitalRepository.getAllHospitals();
    return {
      count: hospitals.length,
      data: hospitals
    };
  });

  // Get hospital by ID
  app.get('/api/v2/hospitals/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const hospital = await hospitalRepository.getHospitalById(id);
    if (!hospital) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: `Hospital ${id} not found`
      });
    }
    return { data: hospital };
  });

  // Update hospital feed (stale report testing and live updates)
  app.post('/api/v2/hospitals/feed', async (request, reply) => {
    const parse = HospitalFeedUpdateSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        details: parse.error.format()
      });
    }

    const { hospital_id, resource_type, reported_free, report_timestamp_ms } = parse.data;

    // 1. Sync to C++ Allocation Engine
    let engineRes: any = { status: 'ENGINE_OFFLINE' };
    try {
      engineRes = await engineClient.applyFeedUpdate({
        hospital_id,
        resource_type,
        reported_free,
        report_timestamp_ms
      });
    } catch (err: any) {
      request.log.warn(`Engine update skipped: ${err.message}`);
    }

    // 2. Update PostgreSQL database
    await hospitalRepository.updateResourceFeed(hospital_id, resource_type, reported_free, report_timestamp_ms);

    return {
      status: 'FEED_PROCESSED',
      hospital_id,
      resource_type,
      reported_free,
      report_timestamp_ms,
      engine_sync: engineRes
    };
  });
};
