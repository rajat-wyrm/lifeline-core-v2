'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BarChart3, 
  Activity, 
  Cpu, 
  RefreshCw, 
  Zap, 
  Clock, 
  Database,
  ArrowLeft
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface PerformanceMetrics {
  timestamp: string;
  http_latencies: {
    p50_ms: number;
    p95_ms: number;
    p99_ms: number;
  };
  engine_latencies: {
    allocation_p50_us: number;
    allocation_p95_us: number;
    allocation_p99_us: number;
  };
  throughput: {
    allocations_per_second: number;
    telemetry_events_broadcast_per_sec: number;
  };
  memory: {
    heap_used_mb: number;
    heap_total_mb: number;
    rss_mb: number;
    external_mb: number;
  };
}

export default function ObservabilityMetricsPage() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<PerformanceMetrics>('/api/v2/observability/metrics');
      setMetrics(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sky-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Latency Percentiles & Throughput Telemetry
            </h1>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
              Live Instrumentation
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time p50, p95, and p99 allocation response latencies, memory footprint, and decision throughput.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/app/observability"
            className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800 transition"
          >
            Observability Hub
          </Link>
          <button
            onClick={loadMetrics}
            disabled={loading}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded-lg border border-slate-700 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && !metrics ? (
        <div className="p-12 text-center text-slate-500 font-mono text-sm">
          Sampling performance instrumentation...
        </div>
      ) : !metrics ? (
        <div className="p-12 text-center text-rose-400 font-mono text-sm">
          Metrics endpoint unavailable.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Latency Percentiles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fastify HTTP API Latencies */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                <Clock className="w-4 h-4 text-sky-400" />
                Fastify HTTP Gateway Latency Profile
              </h3>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase">P50 Median</span>
                  <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
                    {metrics.http_latencies.p50_ms} ms
                  </div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase">P95 Tail</span>
                  <div className="text-xl font-bold text-sky-400 font-mono mt-1">
                    {metrics.http_latencies.p95_ms} ms
                  </div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase">P99 Worst</span>
                  <div className="text-xl font-bold text-purple-400 font-mono mt-1">
                    {metrics.http_latencies.p99_ms} ms
                  </div>
                </div>
              </div>
            </div>

            {/* C++ Allocation Engine Latencies */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                <Cpu className="w-4 h-4 text-purple-400" />
                C++ Engine Decision Computation (&micro;s)
              </h3>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase">P50 Decision</span>
                  <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
                    {metrics.engine_latencies.allocation_p50_us} &micro;s
                  </div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase">P95 Decision</span>
                  <div className="text-xl font-bold text-sky-400 font-mono mt-1">
                    {metrics.engine_latencies.allocation_p95_us} &micro;s
                  </div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase">P99 Decision</span>
                  <div className="text-xl font-bold text-purple-400 font-mono mt-1">
                    {metrics.engine_latencies.allocation_p99_us} &micro;s
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Memory & Throughput Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Memory Allocation */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                <Activity className="w-4 h-4 text-emerald-400" />
                Node.js Memory Footprint
              </h3>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase">Heap Used</span>
                  <div className="text-lg font-bold text-white font-mono mt-1">
                    {metrics.memory.heap_used_mb} MB
                  </div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase">Heap Total</span>
                  <div className="text-lg font-bold text-slate-300 font-mono mt-1">
                    {metrics.memory.heap_total_mb} MB
                  </div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase">Resident RSS</span>
                  <div className="text-lg font-bold text-sky-400 font-mono mt-1">
                    {metrics.memory.rss_mb} MB
                  </div>
                </div>
              </div>
            </div>

            {/* Throughput */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                <Zap className="w-4 h-4 text-amber-400" />
                Throughput & Ingestion Capacity
              </h3>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase">Allocations Throughput</span>
                  <div className="text-lg font-bold text-amber-400 font-mono mt-1">
                    {metrics.throughput.allocations_per_second} ops/sec
                  </div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase">Telemetry Broadcast</span>
                  <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
                    {metrics.throughput.telemetry_events_broadcast_per_sec} events/s
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
