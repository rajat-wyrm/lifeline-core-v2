import { FastifyPluginAsync } from 'fastify';
import { RunSimulationSchema } from '../schemas/index.js';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { query } from '../db/client.js';

const execAsync = promisify(exec);

export const simulatorRoutes: FastifyPluginAsync = async (app) => {
  // Preset scenarios
  app.get('/api/v2/simulator/scenarios', async () => {
    return {
      scenarios: [
        {
          id: 'normal_day',
          name: 'Normal Day Baseline',
          description: 'Standard emergency arrival rate across Tricity, regular Poisson walk-ins, and standard feed reporting latency (5-10 min).',
          default_requests: 150,
          expected_bed_miss: {
            nearest: '3% - 6%',
            portal: '0.3% - 1.0%',
            lifeline: '0.0%'
          }
        },
        {
          id: 'contention_surge',
          name: 'Mass-Casualty Contention Surge',
          description: 'Sudden 3x burst of critical trauma requests in Mohali/Chandigarh corridor, heavily testing resource locking and fallback routing.',
          default_requests: 250,
          expected_bed_miss: {
            nearest: '5% - 8%',
            portal: '1.0% - 2.5%',
            lifeline: '0.0%'
          }
        },
        {
          id: 'feed_outage_chaos',
          name: 'Feed Outage Chaos (Frozen Hospital Feeds)',
          description: 'Simulates complete outage on major hospitals (PGIMER, GMCH-32, Fortis). Portal-Count blindly routes to full hospitals, while Lifeline-Core detects staleness decay.',
          default_requests: 200,
          expected_bed_miss: {
            nearest: '4% - 7%',
            portal: '1.5% - 4.0%',
            lifeline: '0.0%'
          }
        }
      ]
    };
  });

  // Execute on-demand simulation
  app.post('/api/v2/simulator/run', async (request, reply) => {
    const parse = RunSimulationSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', details: parse.error.format() });
    }

    const { scenario, policy, num_requests, seed, freeze_hospitals } = parse.data;

    const runId = `RUN-${Date.now()}-${policy}`;

    // Execute via python simulator
    const projectRoot = path.resolve(process.cwd(), '..');
    const freezeArg = freeze_hospitals ? freeze_hospitals.join(',') : '';

    const pyScript = `
import json, sys
from sim.city_model import CityModel
from sim.request_generator import RequestGenerator
from sim.policies import NearestHospitalPolicy, PortalCountPolicy, LifelineCorePolicy
from sim.simulator import SimulationEngine

city = CityModel(hospitals_path='data/hospitals.json', roads_path='data/tricity_roads.json')
gen = RequestGenerator(seed=${seed})
workload = gen.generate_workload(num_requests=${num_requests}, include_surge=(${scenario == 'contention_surge'}))

freeze_list = ['HOSP-101', 'HOSP-102', 'HOSP-103', 'HOSP-108'] if '${scenario}' == 'feed_outage_chaos' else []
if '${freezeArg}':
    freeze_list = '${freezeArg}'.split(',')

pol_map = {
    'NEAREST_HOSPITAL': NearestHospitalPolicy(),
    'PORTAL_COUNT': PortalCountPolicy(),
    'LIFELINE_CORE': LifelineCorePolicy()
}
pol = pol_map['${policy}']

sim = SimulationEngine(city=city, seed=${seed}, chaos_freeze_hospitals=freeze_list)
res = sim.run_simulation(workload, pol)
print(json.dumps(res))
    `;

    try {
      const { stdout } = await execAsync(`python3 -c "${pyScript.replace(/"/g, '\\"')}"`, {
        cwd: projectRoot,
        env: { ...process.env, PYTHONPATH: '.' }
      });

      const metrics = JSON.parse(stdout.trim());

      // Save to simulation_runs in PostgreSQL
      await query(`
        INSERT INTO simulation_runs (
          id, scenario, policy, num_requests, seed,
          bed_miss_rate_pct, mean_time_min, p95_time_min, p99_time_min,
          redirect_count, double_allocation_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        runId, scenario, policy, num_requests, seed,
        metrics.bed_miss_rate_pct, metrics.mean_time_to_treatment_min,
        metrics.p95_time_to_treatment_min, metrics.p99_time_to_treatment_min,
        metrics.redirect_count, metrics.double_allocation_count
      ]);

      return {
        run_id: runId,
        scenario,
        policy,
        metrics
      };
    } catch (err: any) {
      request.log.error(`Simulation execution failed: ${err.message}`);
      return reply.status(500).send({
        error: 'SIMULATION_EXECUTION_FAILED',
        message: err.message
      });
    }
  });

  // List historical simulation runs
  app.get('/api/v2/simulator/runs', async (request, reply) => {
    const res = await query(`
      SELECT id, scenario, policy, num_requests, seed,
             bed_miss_rate_pct, mean_time_min, p95_time_min, p99_time_min,
             redirect_count, double_allocation_count, executed_at
      FROM simulation_runs
      ORDER BY executed_at DESC
      LIMIT 50
    `);
    return { count: res.rows.length, data: res.rows };
  });

  // Get single simulation run by ID
  app.get('/api/v2/simulator/runs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const res = await query(`
      SELECT id, scenario, policy, num_requests, seed,
             bed_miss_rate_pct, mean_time_min, p95_time_min, p99_time_min,
             redirect_count, double_allocation_count, executed_at
      FROM simulation_runs
      WHERE id = $1
    `, [id]);

    if (res.rows.length === 0) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: `Simulation run ${id} not found` });
    }

    return { data: res.rows[0] };
  });
};

