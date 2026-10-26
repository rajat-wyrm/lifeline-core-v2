'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BarChart3, 
  ArrowLeft, 
  Play, 
  RefreshCw, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  FlaskConical 
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface SimulationRunRecord {
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

export default function SimulatorRunsLedgerPage() {
  const [runs, setRuns] = useState<SimulationRunRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRuns = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<{ data: SimulationRunRecord[] }>('/api/v2/simulator/runs');
      setRuns(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Simulator Runs Execution Ledger
            </h1>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
              PostgreSQL `simulation_runs`
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Empirical historical record of all executed simulation runs across policies, arrival workloads, and seeds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/app/simulator"
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs px-3.5 py-2 rounded-lg font-medium shadow transition"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Launch Simulation</span>
          </Link>
          <button
            onClick={loadRuns}
            disabled={loading}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-lg border border-slate-700 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Recorded Execution Runs ({runs.length})</span>
          <span>Controlled Monte Carlo Experiment Ledger</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 font-mono text-sm">
            Loading simulation runs...
          </div>
        ) : runs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm space-y-3">
            <p>No historical runs found in PostgreSQL.</p>
            <Link
              href="/app/simulator"
              className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:underline"
            >
              <span>Execute your first simulation run</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3">Run ID</th>
                  <th className="px-5 py-3">Scenario</th>
                  <th className="px-5 py-3">Policy Evaluated</th>
                  <th className="px-5 py-3">Requests / Seed</th>
                  <th className="px-5 py-3">Bed-Miss Rate</th>
                  <th className="px-5 py-3">Mean / P95 Time</th>
                  <th className="px-5 py-3">Redirects</th>
                  <th className="px-5 py-3">Double Allocations</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {runs.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-5 py-3 font-mono font-bold text-amber-300">
                      {r.id}
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-300">
                      {r.scenario}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                        r.policy === 'LIFELINE_CORE'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : r.policy === 'PORTAL_COUNT'
                          ? 'bg-amber-950 text-amber-300 border-amber-800'
                          : 'bg-rose-950 text-rose-300 border-rose-800'
                      }`}>
                        {r.policy}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-400">
                      {r.num_requests} reqs (seed: {r.seed})
                    </td>
                    <td className="px-5 py-3 font-mono font-bold">
                      <span className={r.bed_miss_rate_pct === 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {r.bed_miss_rate_pct?.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-300">
                      {r.mean_time_min?.toFixed(1)}m / {r.p95_time_min?.toFixed(1)}m
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-400">
                      {r.redirect_count}
                    </td>
                    <td className="px-5 py-3 font-mono font-bold text-purple-400">
                      {r.double_allocation_count}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/app/simulator/runs/${r.id}`}
                        className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-medium transition"
                      >
                        <span>Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
