'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Activity, 
  ArrowLeft, 
  Building2, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  BarChart3, 
  Cpu,
  FileText
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface AllocationTrace {
  success: boolean;
  hospital_id?: string;
  reservation_id?: string;
  expires_at_ms?: number;
  policy_version?: string;
  weights?: {
    distance_eta?: number;
    availability?: number;
    freshness?: number;
    poisson?: number;
  };
  candidates_evaluated?: Array<{
    hospital_id: string;
    hospital_name?: string;
    distance_km: number;
    eta_min: number;
    available_beds: number;
    freshness_score: number;
    poisson_probability: number;
    composite_score: number;
    selected: boolean;
    exclusion_reason?: string;
  }>;
}

export default function RequestAllocationAnalysisPage() {
  const params = useParams();
  const requestId = params.requestId as string;

  const [trace, setTrace] = useState<AllocationTrace | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi<{ request_id: string; allocation_trace: AllocationTrace }>(`/api/v2/requests/${requestId}/allocation`)
      .then(res => setTrace(res.allocation_trace))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [requestId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Link href={`/app/requests/${requestId}`} className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Request Summary
        </Link>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-red-500" />
              Allocation Decision Trace & Candidate Scoring Matrix
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Request Correlation ID: {requestId}
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
            <Link href={`/app/requests/${requestId}`} className="px-3 py-1.5 rounded text-slate-400 hover:text-white transition">
              Overview
            </Link>
            <Link href={`/app/requests/${requestId}/allocation`} className="px-3 py-1.5 rounded bg-slate-800 text-white font-medium">
              Allocation
            </Link>
            <Link href={`/app/requests/${requestId}/timeline`} className="px-3 py-1.5 rounded text-slate-400 hover:text-white transition">
              Timeline
            </Link>
            <Link href={`/app/requests/${requestId}/audit`} className="px-3 py-1.5 rounded text-slate-400 hover:text-white transition">
              Audit
            </Link>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 font-mono text-sm">
          Loading allocation decision trace...
        </div>
      ) : !trace ? (
        <div className="p-12 text-center text-slate-500 text-sm">
          No allocation decision trace found for this emergency dispatch.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Banner: Decision Outcome */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Engine Outcome:
                </span>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                  trace.success
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : 'bg-rose-950 text-rose-300 border-rose-800'
                }`}>
                  {trace.success ? 'ALLOCATION SUCCEEDED' : 'ALLOCATION REJECTED / EXHAUSTED'}
                </span>
              </div>
              <p className="text-sm font-semibold text-white">
                Assigned Hospital: <span className="text-sky-400 font-mono">{trace.hospital_id || 'None'}</span>
              </p>
              {trace.reservation_id && (
                <p className="text-xs text-slate-400 font-mono">
                  Atomic Reservation Hold: <span className="text-amber-300">{trace.reservation_id}</span>
                </p>
              )}
            </div>

            {trace.reservation_id && (
              <Link
                href="/app/reservations"
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-medium transition"
              >
                Inspect Hold in Ledger
              </Link>
            )}
          </div>

          {/* Scoring Weights Applied */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              Dynamic Utility Weights Applied
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Road Travel ETA</div>
                <div className="text-base font-bold text-sky-400 font-mono mt-0.5">40.0%</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Available Capacity</div>
                <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">30.0%</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Telemetry Freshness</div>
                <div className="text-base font-bold text-amber-400 font-mono mt-0.5">15.0%</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Poisson Survival</div>
                <div className="text-base font-bold text-purple-400 font-mono mt-0.5">15.0%</div>
              </div>
            </div>
          </div>

          {/* Candidate Evaluation Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Candidate Facilities Evaluated</span>
              <span>C++ Ranking Pipeline • Pareto Frontier</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3">Rank / Selection</th>
                    <th className="px-5 py-3">Facility</th>
                    <th className="px-5 py-3">Distance & ETA</th>
                    <th className="px-5 py-3">Free Beds</th>
                    <th className="px-5 py-3">Freshness</th>
                    <th className="px-5 py-3">Poisson Survival</th>
                    <th className="px-5 py-3">Composite Utility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {(trace.candidates_evaluated && trace.candidates_evaluated.length > 0) ? (
                    trace.candidates_evaluated.map((c, idx) => (
                      <tr key={c.hospital_id} className={c.selected ? 'bg-sky-950/20' : 'hover:bg-slate-800/30'}>
                        <td className="px-5 py-3">
                          {c.selected ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                              WINNER (#1)
                            </span>
                          ) : (
                            <span className="font-mono text-slate-500">#{idx + 1}</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <Link href={`/app/hospitals/${c.hospital_id}`} className="font-semibold text-white hover:text-sky-400 transition">
                            {c.hospital_name || c.hospital_id}
                          </Link>
                          <div className="font-mono text-[10px] text-slate-500">{c.hospital_id}</div>
                        </td>
                        <td className="px-5 py-3 font-mono text-slate-300">
                          {c.distance_km?.toFixed(1)} km ({c.eta_min?.toFixed(1)} min)
                        </td>
                        <td className="px-5 py-3 font-mono text-emerald-400">
                          {c.available_beds}
                        </td>
                        <td className="px-5 py-3 font-mono text-amber-400">
                          {((c.freshness_score || 1.0) * 100).toFixed(0)}%
                        </td>
                        <td className="px-5 py-3 font-mono text-purple-400">
                          {((c.poisson_probability || 1.0) * 100).toFixed(0)}%
                        </td>
                        <td className="px-5 py-3 font-mono font-bold text-white">
                          {c.composite_score?.toFixed(2) || 'N/A'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                        Selected facility: {trace.hospital_id || 'Direct reservation'}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
