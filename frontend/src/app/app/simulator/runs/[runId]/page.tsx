'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  BarChart3, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  Clock, 
  Building2, 
  RefreshCw,
  Layers
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface SimulationRunDetail {
  id: string;
  scenario: string;
  policy: string;
  num_requests: number;
  seed: number;
  bed_miss_rate_pct: number;
  mean_time_min: number;
  p95_time_min: number;
  p99_time_min: number;
  redirect_count: number;
  double_allocation_count: number;
  executed_at: string;
}

export default function SingleSimulationRunPage() {
  const params = useParams();
  const runId = params.runId as string;

  const [run, setRun] = useState<SimulationRunDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi<{ data: SimulationRunDetail }>(`/api/v2/simulator/runs/${runId}`)
      .then(res => setRun(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [runId]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <Link href="/app/simulator/runs" className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Simulation Runs Ledger
        </Link>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Simulation Run Record: {runId}
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Policy: {run?.policy} • Scenario: {run?.scenario}
            </p>
          </div>

          <span className={`text-xs font-mono font-bold px-3 py-1 rounded-lg border ${
            run?.policy === 'LIFELINE_CORE'
              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
              : 'bg-amber-950 text-amber-300 border-amber-800'
          }`}>
            {run?.policy}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 font-mono text-sm">
          Loading simulation run details...
        </div>
      ) : !run ? (
        <div className="p-12 text-center text-slate-500 text-sm">
          Simulation run {runId} not found in database.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Metrics Overview Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Bed-Miss Rate</span>
              <div className={`text-2xl font-bold font-mono mt-1 ${
                run.bed_miss_rate_pct === 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {run.bed_miss_rate_pct?.toFixed(2)}%
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {run.bed_miss_rate_pct === 0 ? 'Zero Arrived-No-Bed Failures' : 'Missed Beds Observed'}
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Mean Transit Time</span>
              <div className="text-2xl font-bold text-sky-400 font-mono mt-1">
                {run.mean_time_min?.toFixed(1)} min
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                P95: {run.p95_time_min?.toFixed(1)} min
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Ambulance Redirects</span>
              <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
                {run.redirect_count}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Secondary hospital diversions
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Double Allocations</span>
              <div className="text-2xl font-bold text-purple-400 font-mono mt-1">
                {run.double_allocation_count}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Contention collision count
              </span>
            </div>
          </div>

          {/* Configuration Parameters */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <Layers className="w-4 h-4 text-sky-400" />
              Run Configuration & Experiment Provenance
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Scenario</span>
                <span className="text-slate-200 font-semibold">{run.scenario}</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Workload Requests</span>
                <span className="text-slate-200 font-semibold">{run.num_requests} dispatches</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Random Seed</span>
                <span className="text-slate-200 font-semibold">{run.seed}</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">P99 Time to Care</span>
                <span className="text-slate-200 font-semibold">{run.p99_time_min?.toFixed(1)} min</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 col-span-2">
                <span className="text-[10px] text-slate-400 uppercase block">Executed At</span>
                <span className="text-slate-200">{new Date(run.executed_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
