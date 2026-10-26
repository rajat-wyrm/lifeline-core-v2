import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { FastifyInstance } from 'fastify';
import { pool } from '../src/db/client.js';

let app: FastifyInstance;

before(async () => {
  app = await buildApp();
  await app.ready();
});

after(async () => {
  await app.close();
  await pool.end();
});

test('GET /health returns 200 and UP status', async () => {
  const res = await app.inject({
    method: 'GET',
    url: '/health'
  });
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.payload);
  assert.equal(body.status, 'UP');
  assert.ok(body.uptime_seconds >= 0);
});

test('GET /ready checks PostgreSQL and engine dependencies', async () => {
  const res = await app.inject({
    method: 'GET',
    url: '/ready'
  });
  // Since DB is running on 5433, db should be UP
  assert.ok(res.statusCode === 200 || res.statusCode === 503);
  const body = JSON.parse(res.payload);
  assert.ok(body.dependencies);
  assert.equal(body.dependencies.database.status, 'UP');
});

test('GET /api/v2/hospitals returns 50 seeded Tricity hospitals', async () => {
  const res = await app.inject({
    method: 'GET',
    url: '/api/v2/hospitals'
  });
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.payload);
  assert.equal(body.count, 50);
  assert.equal(body.data[0].id, 'HOSP-101');
  assert.equal(body.data[0].name, 'PGIMER Chandigarh');
});

test('GET /api/v2/hospitals/:id returns specific hospital details', async () => {
  const res = await app.inject({
    method: 'GET',
    url: '/api/v2/hospitals/HOSP-101'
  });
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.payload);
  assert.equal(body.data.id, 'HOSP-101');
  assert.ok(body.data.resources['ICU-BED']);
  assert.equal(body.data.resources['ICU-BED'].total, 77);
});

test('GET /api/v2/hospitals/INVALID returns 404', async () => {
  const res = await app.inject({
    method: 'GET',
    url: '/api/v2/hospitals/HOSP-99999'
  });
  assert.equal(res.statusCode, 404);
});

test('POST /api/v2/requests validates input schema', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/requests',
    payload: {
      patient_age: -5, // Invalid age
      trauma_score: 10 // Invalid trauma score
    }
  });
  assert.equal(res.statusCode, 400);
  const body = JSON.parse(res.payload);
  assert.equal(body.error, 'VALIDATION_ERROR');
});

test('GET /api/v2/simulator/scenarios returns defined scenarios', async () => {
  const res = await app.inject({
    method: 'GET',
    url: '/api/v2/simulator/scenarios'
  });
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.payload);
  assert.equal(body.scenarios.length, 3);
  assert.equal(body.scenarios[0].id, 'normal_day');
  assert.equal(body.scenarios[1].id, 'contention_surge');
  assert.equal(body.scenarios[2].id, 'feed_outage_chaos');
});

test('GET /api/v2/benchmarks returns crossover and lock metrics', async () => {
  const res = await app.inject({
    method: 'GET',
    url: '/api/v2/benchmarks'
  });
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.payload);
  assert.ok(body.segment_tree_crossover);
  assert.ok(body.concurrency_lock_scalability);
  assert.equal(body.segment_tree_crossover.data.length, 4);
});
