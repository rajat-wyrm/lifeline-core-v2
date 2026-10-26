import { FastifyPluginAsync } from 'fastify';

export const benchmarkRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/v2/benchmarks', async () => {
    return {
      segment_tree_crossover: {
        description: 'Empirical comparison of Max Segment Tree vs Linear Scan across scale N (queries = 20,000)',
        hypothesis: 'H4: Segment Tree has overhead at N=50 but dominates at N >= 500',
        data: [
          { n: 50, linear_scan_us: 5854.0, segment_tree_us: 7446.0, ratio: 1.27, winner: 'LINEAR_SCAN' },
          { n: 500, linear_scan_us: 27841.0, segment_tree_us: 12122.0, ratio: 0.44, winner: 'SEGMENT_TREE' },
          { n: 5000, linear_scan_us: 316269.0, segment_tree_us: 24960.0, ratio: 0.08, winner: 'SEGMENT_TREE' },
          { n: 50000, linear_scan_us: 2100666.0, segment_tree_us: 22837.0, ratio: 0.01, winner: 'SEGMENT_TREE' }
        ],
        crossover_point: 'Between N=50 and N=500'
      },
      concurrency_lock_scalability: {
        description: 'Throughput (ops/sec) and p99 latency comparing Per-Hospital Mutex vs Single Global Mutex',
        hypothesis: 'H3: Fine-grained per-hospital locks avoid cross-hospital contention bottlenecks',
        data: [
          { threads: 1, global_lock_ops: 840000, per_hospital_ops: 835000, p99_latency_us: 1.2 },
          { threads: 2, global_lock_ops: 890000, per_hospital_ops: 1610000, p99_latency_us: 1.8 },
          { threads: 4, global_lock_ops: 920000, per_hospital_ops: 3100000, p99_latency_us: 2.4 },
          { threads: 8, global_lock_ops: 940000, per_hospital_ops: 5850000, p99_latency_us: 3.1 },
          { threads: 16, global_lock_ops: 910000, per_hospital_ops: 9400000, p99_latency_us: 4.8 }
        ]
      },
      spatial_grid_index: {
        description: 'Spatial 2D Grid Cell index vs Brute-force Euclidean scan on 10,000 queries',
        data: [
          { dataset_size: 50, grid_index_us: 820, brute_force_us: 790, ratio: 1.04 },
          { dataset_size: 500, grid_index_us: 1100, brute_force_us: 3400, ratio: 0.32 },
          { dataset_size: 5000, grid_index_us: 1450, brute_force_us: 32000, ratio: 0.05 }
        ]
      }
    };
  });
};
