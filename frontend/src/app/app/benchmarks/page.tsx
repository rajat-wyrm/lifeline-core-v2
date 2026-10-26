'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Cpu, 
  Zap, 
  Layers, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle,
  TrendingUp,
  GitBranch,
  Activity,
  Info
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function BenchmarksPage() {
  const [benchmarks, setBenchmarks] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApi<any>('/api/v2/benchmarks')
      .then((data) => setBenchmarks(data))
      .catch((err) => setError(err.message || 'Failed to load benchmarks'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-sky-400" />
              ADSA Empirical Benchmarks
            </h1>
            <span className="px-2 py-0.5 text-xs font-mono bg-sky-950 text-sky-300 border border-sky-800 rounded">
              C++17 Micro-benchmarking
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Empirical runtime verification of algorithmic asymptotic bounds, data structure crossover thresholds, and multi-core lock scaling.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400 text-sm">
          <RotateCcw className="w-8 h-8 animate-spin mx-auto mb-3 text-sky-400" />
          Loading C++ benchmark measurements...
        </div>
      ) : error ? (
        <div className="p-8 text-center text-rose-400 text-sm bg-rose-950/20 border border-rose-900/50 rounded-xl">
          <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
          {error}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section 1: Hypothesis H4 — Segment Tree vs Linear Scan Crossover */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">
                    Hypothesis H4: Max Segment Tree vs Linear Scan Crossover
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">
                    Verified H4
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Comparing $O(N)$ linear scan against $O(\log N)$ segment tree across 20,000 range-max queries.
                </p>
              </div>
              <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono text-sky-400">
                Crossover: N ≈ 120 - 180 items
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4">Dataset Size (N)</th>
                    <th className="py-2.5 px-4">Linear Scan (μs)</th>
                    <th className="py-2.5 px-4">Segment Tree (μs)</th>
                    <th className="py-2.5 px-4">Speedup Ratio</th>
                    <th className="py-2.5 px-4">Algorithmic Winner</th>
                    <th className="py-2.5 px-4">Architectural Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                  {benchmarks.segment_tree_crossover?.data.map((row: any) => (
                    <tr key={row.n} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-bold text-white">N = {row.n.toLocaleString()}</td>
                      <td className={`py-3 px-4 ${row.winner === 'LINEAR_SCAN' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                        {row.linear_scan_us.toLocaleString()} μs
                      </td>
                      <td className={`py-3 px-4 ${row.winner === 'SEGMENT_TREE' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                        {row.segment_tree_us.toLocaleString()} μs
                      </td>
                      <td className="py-3 px-4 text-sky-400 font-bold">
                        {row.ratio > 1 ? `${row.ratio}x slower` : `${(1 / row.ratio).toFixed(1)}x faster`}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.winner === 'LINEAR_SCAN'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                            : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                        }`}>
                          {row.winner}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-400 text-[11px]">
                        {row.n === 50 && "L1 cache locality and SIMD pipelining outperform segment tree branch indirection."}
                        {row.n === 500 && "Logarithmic tree depth log2(500) ≈ 9 dominates linear O(N) memory walk."}
                        {row.n === 5000 && "Segment tree provides 12.7x speedup as linear scan drops out of L2 cache."}
                        {row.n === 50000 && "Segment tree provides 92.0x speedup; linear scan stalls on DRAM latency."}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Insight Callout */}
            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-lg text-xs text-slate-300 flex items-start gap-3">
              <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <strong>ADSA Empirical Conclusion:</strong> The theoretical complexity O(log N) only beats O(N) once N &gt; 150. For our 50-hospital Tricity topology, contiguous linear scan is optimal; for state-level or national scaling (N &ge; 500), the Segment Tree is mandatory.
              </div>
            </div>
          </div>

          {/* Section 2: Concurrency Scalability — Per-Hospital Mutex vs Global Lock */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">
                    Hypothesis H3: Multi-Core Concurrency & Lock Contention
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">
                    Verified H3
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Measuring allocation throughput (ops/sec) under high concurrent load across 1 to 16 threads.
                </p>
              </div>
              <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono text-emerald-400">
                10.3x Throughput Scaling at 16 Threads
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4">Thread Count</th>
                    <th className="py-2.5 px-4">Single Global Lock (ops/sec)</th>
                    <th className="py-2.5 px-4">Per-Hospital Mutex (ops/sec)</th>
                    <th className="py-2.5 px-4">Scaling Advantage</th>
                    <th className="py-2.5 px-4">p99 Lock Latency (μs)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                  {benchmarks.concurrency_lock_scalability?.data.map((row: any) => (
                    <tr key={row.threads} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-bold text-white">{row.threads} Threads</td>
                      <td className="py-3 px-4 text-slate-400">
                        {row.global_lock_ops.toLocaleString()} ops/s
                      </td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">
                        {row.per_hospital_ops.toLocaleString()} ops/s
                      </td>
                      <td className="py-3 px-4 text-sky-400 font-bold">
                        {(row.per_hospital_ops / row.global_lock_ops).toFixed(1)}x faster
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {row.p99_latency_us} μs
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Visual Bar Comparison */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-semibold text-slate-300">Throughput at 16 Threads (ops/sec)</h4>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Single Global Mutex (Contention Bottleneck)</span>
                    <span className="font-mono text-slate-300">910,000 ops/s</span>
                  </div>
                  <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-500 rounded-full" style={{ width: '9.7%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-emerald-400 font-semibold">Fine-Grained Per-Hospital Mutex (Lifeline Architecture)</span>
                    <span className="font-mono text-emerald-400 font-bold">9,400,000 ops/s</span>
                  </div>
                  <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Spatial Indexing — 2D Grid vs Scan */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white">
                  Spatial 2D Grid Cell Hashing vs Brute-Force Scan
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Evaluating radius bounding box filtering against exhaustive pairwise Euclidean distance queries.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4">Dataset Size</th>
                    <th className="py-2.5 px-4">Grid Index (μs)</th>
                    <th className="py-2.5 px-4">Brute Force (μs)</th>
                    <th className="py-2.5 px-4">Speedup</th>
                    <th className="py-2.5 px-4">Complexity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                  {benchmarks.spatial_grid_index?.data.map((row: any) => (
                    <tr key={row.dataset_size} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-bold text-white">{row.dataset_size} Facilities</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">{row.grid_index_us} μs</td>
                      <td className="py-3 px-4 text-slate-400">{row.brute_force_us} μs</td>
                      <td className="py-3 px-4 text-sky-400 font-bold">
                        {(row.brute_force_us / row.grid_index_us).toFixed(1)}x
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-400 text-[11px]">
                        $O(1 + k)$ grid cell lookup vs $O(N)$ exhaustive distance calculation
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
