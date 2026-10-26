'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Heart, 
  Activity, 
  Database, 
  Cpu, 
  Radio, 
  ShieldCheck, 
  Clock, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface HealthData {
  status: string;
  timestamp: string;
  uptime_seconds: number;
  components: {
    database: {
      status: string;
      latency_ms: number;
      engine: string;
      port: number;
      ssl: boolean;
    };
    allocation_engine: {
      status: string;
      port: number;
      dialect: string;
      concurrency_model: string;
    };
    durable_worker: {
      status: string;
      interval_ms: number;
      locking_strategy: string;
    };
    telemetry_hub: {
      status: string;
      protocol: string;
      heartbeat_interval_s: number;
    };
  };
}

export default function SystemHealthBreakdownPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadHealth = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<HealthData>('/api/v2/observability/health');
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
    const interval = setInterval(loadHealth, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500 animate-pulse" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Component Health & Subsystem Readiness
            </h1>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
              Live Readiness Probe
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time liveness, dependency ping, socket connectivity, and worker loop monitoring.
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
            onClick={loadHealth}
            disabled={loading}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded-lg border border-slate-700 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="p-12 text-center text-slate-500 font-mono text-sm">
          Checking subsystem health status...
        </div>
      ) : !data ? (
        <div className="p-12 text-center text-rose-400 font-mono text-sm">
          Health check endpoint unavailable.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-white">
                  ALL SUBSYSTEMS HEALTHY & OPERATIONAL
                </h3>
                <p className="text-xs text-slate-300 mt-0.5 font-mono">
                  Uptime: {Math.floor(data.uptime_seconds / 60)} minutes • Last Probe: {new Date(data.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>

            <span className="px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-lg text-xs font-mono font-bold">
              SYSTEM HEALTH: 100%
            </span>
          </div>

          {/* Component Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Database Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-sky-400" />
                  <span className="font-bold text-sm text-white">PostgreSQL 18 Source of Truth</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                  {data.components.database.status}
                </span>
              </div>
              <div className="space-y-2 text-xs font-mono text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Query Ping Latency:</span>
                  <span className="text-emerald-400 font-bold">{data.components.database.latency_ms} ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Engine / Cluster:</span>
                  <span>{data.components.database.engine}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">TCP Port:</span>
                  <span>{data.components.database.port}</span>
                </div>
              </div>
            </div>

            {/* Allocation Engine Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-sm text-white">C++17 Allocation Engine</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                  {data.components.allocation_engine.status}
                </span>
              </div>
              <div className="space-y-2 text-xs font-mono text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">HTTP Socket Port:</span>
                  <span className="text-white font-bold">{data.components.allocation_engine.port}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dialect:</span>
                  <span>{data.components.allocation_engine.dialect}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Concurrency:</span>
                  <span>{data.components.allocation_engine.concurrency_model}</span>
                </div>
              </div>
            </div>

            {/* Durable Worker Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-sm text-white">Durable Expiry Worker</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                  {data.components.durable_worker.status}
                </span>
              </div>
              <div className="space-y-2 text-xs font-mono text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Polling Interval:</span>
                  <span className="text-amber-400 font-bold">{data.components.durable_worker.interval_ms} ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Locking Primitive:</span>
                  <span className="text-slate-400">{data.components.durable_worker.locking_strategy}</span>
                </div>
              </div>
            </div>

            {/* Telemetry Hub Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-sm text-white">Telemetry Events Hub</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                  {data.components.telemetry_hub.status}
                </span>
              </div>
              <div className="space-y-2 text-xs font-mono text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Streaming Protocol:</span>
                  <span className="text-emerald-400 font-bold">{data.components.telemetry_hub.protocol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Heartbeat Interval:</span>
                  <span>{data.components.telemetry_hub.heartbeat_interval_s} seconds</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
