'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  FlaskConical, 
  RotateCcw, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  ShieldAlert,
  BarChart2
} from 'lucide-react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';

export default function ExperimentDetailPage() {
  const params = useParams();
  const runId = params.runId as string;
  const [run, setRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) return;
    fetchApi<{ data: any }>(`/api/v2/experiments/${runId}`)
      .then((res) => setRun(res.data))
      .catch((err) => setError(err.message || 'Failed to fetch experiment run'))
      .finally(() => setLoading(false));
  }, [runId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link 
          href="/app/experiments" 
          className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Experiment Run:</span>
            <span className="font-mono text-sky-400">{runId}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Monte Carlo trial record from database</p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          <RotateCcw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
          Loading experiment run...
        </div>
      ) : error ? (
        <div className="p-8 text-center text-rose-400 text-sm bg-rose-950/20 border border-rose-900/50 rounded-xl">
          <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
          {error}
        </div>
      ) : run ? (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 font-sans">Scenario</span>
                <div className="text-white font-bold text-sm mt-1">{run.scenario}</div>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 font-sans">Policy</span>
                <div className="text-emerald-400 font-bold text-sm mt-1">{run.policy}</div>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 font-sans">Total Requests</span>
                <div className="text-white font-bold text-sm mt-1">{run.num_requests}</div>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 font-sans">PRNG Seed</span>
                <div className="text-white font-bold text-sm mt-1">{run.seed}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-xl border bg-slate-950/60 border-slate-800">
                <div className="text-xs text-slate-400">Bed Miss Rate</div>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                  {Number(run.bed_miss_rate_pct).toFixed(2)}%
                </div>
              </div>
              <div className="p-4 rounded-xl border bg-slate-950/60 border-slate-800">
                <div className="text-xs text-slate-400">Mean Transit Time</div>
                <div className="text-2xl font-bold font-mono text-white mt-1">
                  {Number(run.mean_time_min).toFixed(1)}m
                </div>
              </div>
              <div className="p-4 rounded-xl border bg-slate-950/60 border-slate-800">
                <div className="text-xs text-slate-400">P95 Transit Time</div>
                <div className="text-2xl font-bold font-mono text-white mt-1">
                  {Number(run.p95_time_min).toFixed(1)}m
                </div>
              </div>
              <div className="p-4 rounded-xl border bg-slate-950/60 border-slate-800">
                <div className="text-xs text-slate-400">Redirect Count</div>
                <div className="text-2xl font-bold font-mono text-white mt-1">
                  {run.redirect_count}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
