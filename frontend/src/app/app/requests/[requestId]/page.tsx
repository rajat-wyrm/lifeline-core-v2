'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  Activity, 
  MapPin, 
  Cpu, 
  Layers 
} from 'lucide-react';
import { fetchApi, EmergencyRequest } from '@/lib/api';

export default function RequestDetailPage() {
  const params = useParams();
  const requestId = params.requestId as string;

  const [requestData, setRequestData] = useState<EmergencyRequest | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi<{ data: EmergencyRequest; audit: any[] }>(`/api/v2/requests/${requestId}`)
      .then(res => {
        setRequestData(res.data);
        setAuditLogs(res.audit || []);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [requestId]);

  if (loading) {
    return <div className="text-center py-20 text-slate-500 font-mono text-sm">Loading allocation explanation...</div>;
  }

  if (!requestData) {
    return (
      <div className="text-center py-20 space-y-4">
        <h2 className="text-xl font-bold text-slate-200">Request {requestId} not found</h2>
        <Link href="/app/requests" className="text-sky-400 text-sm underline">Back to Requests</Link>
      </div>
    );
  }

  const latestAudit = auditLogs.length > 0 ? auditLogs[0].payload : null;
  const rankedCandidates = latestAudit?.ranked_candidates || [];

  return (
    <div className="space-y-8">
      {/* Title & Back link */}
      <div className="space-y-2">
        <Link href="/app/requests" className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Requests
        </Link>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 flex items-center gap-3">
              <Clock className="w-7 h-7 text-purple-400" />
              Allocation Decision Explanation
            </h1>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
              <span>Request: {requestData.id}</span>
              <span>•</span>
              <span>Resource: {requestData.required_resource}</span>
              <span>•</span>
              <span>Trauma Score: Level {requestData.trauma_score}</span>
            </div>
          </div>

          <span className={`px-3 py-1 rounded-full text-xs font-mono font-medium ${
            requestData.status === 'ALLOCATED'
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
              : 'bg-red-950 text-red-400 border border-red-800'
          }`}>
            Status: {requestData.status}
          </span>
        </div>
      </div>

      {/* Decision Summary Card */}
      {latestAudit && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs font-mono text-emerald-400 font-semibold uppercase">Winning Destination</span>
              <div className="text-xl font-bold text-slate-100 mt-0.5">
                {latestAudit.chosen_hospital_name} ({latestAudit.chosen_hospital_id})
              </div>
            </div>
            <div className="text-right font-mono text-xs text-slate-400">
              <div>Latency: <span className="text-sky-400 font-bold">{latestAudit.decision_latency_us} &mu;s</span></div>
              <div>Fallback Hops: <span className="text-amber-400 font-bold">{latestAudit.fallback_count}</span></div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase font-mono">Road Travel Time</div>
              <div className="text-lg font-bold text-slate-200 mt-0.5">
                {(latestAudit.eta_seconds / 60).toFixed(1)} mins
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase font-mono">Distance</div>
              <div className="text-lg font-bold text-slate-200 mt-0.5">
                {latestAudit.distance_km?.toFixed(1)} km
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase font-mono">Report Freshness</div>
              <div className="text-lg font-bold text-slate-200 mt-0.5">
                {((latestAudit.freshness_score || 1) * 100).toFixed(0)}%
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase font-mono">P(Free on Arrival)</div>
              <div className="text-lg font-bold text-emerald-400 mt-0.5">
                {((latestAudit.p_free_on_arrival || 1) * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ranked Candidate Explanation Table */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div>
          <h3 className="font-semibold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" />
            Ranked Candidate Hospitals Scoring Breakdown
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Formula: Score = 40&middot;(1/ETA) + 2&middot;(Available) + 15&middot;(Freshness) + 25&middot;P(Free)
          </p>
        </div>

        {rankedCandidates.length === 0 ? (
          <div className="text-xs text-slate-500 py-6 text-center">
            No candidate ranking traces stored for this legacy request.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 font-mono text-slate-400 text-[11px] bg-slate-950/60">
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Hospital</th>
                  <th className="py-2.5 px-3 text-center">Composite Score</th>
                  <th className="py-2.5 px-3 text-center">Road ETA</th>
                  <th className="py-2.5 px-3 text-center">Available</th>
                  <th className="py-2.5 px-3 text-center">Freshness</th>
                  <th className="py-2.5 px-3 text-center">P(Free)</th>
                  <th className="py-2.5 px-3 text-center">Hold Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {rankedCandidates.map((c: any, idx: number) => {
                  const isWinner = c.reservation_succeeded;
                  return (
                    <tr key={c.hospital_id} className={isWinner ? 'bg-sky-950/30' : 'hover:bg-slate-800/30'}>
                      <td className="py-3 px-3 font-mono font-bold text-slate-400">#{idx + 1}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-100">{c.hospital_name}</div>
                        <div className="text-[10px] font-mono text-slate-500">{c.hospital_id} • {c.distance_km?.toFixed(1)} km away</div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-200">
                        {c.score?.toFixed(1)}
                      </td>
                      <td className="py-3 px-3 text-center font-mono">
                        {(c.eta_seconds / 60).toFixed(1)}m
                      </td>
                      <td className="py-3 px-3 text-center font-mono">
                        <span className={c.effective_available > 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {c.effective_available} beds
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-300">
                        {(c.freshness_score * 100).toFixed(0)}%
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-medium text-emerald-400">
                        {(c.p_free_on_arrival * 100).toFixed(0)}%
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isWinner ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" /> SECURED
                          </span>
                        ) : c.reservation_attempted ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-950 text-red-400 border border-red-800">
                            CONTENTION FAILED
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500">FALLBACK BACKUP</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
