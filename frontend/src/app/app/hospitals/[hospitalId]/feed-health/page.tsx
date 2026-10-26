'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Radio, 
  ArrowLeft, 
  Clock, 
  AlertTriangle, 
  Zap, 
  RefreshCw, 
  CheckCircle2, 
  ShieldAlert,
  Flame,
  Activity
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface FeedHealthData {
  hospital_id: string;
  is_frozen: boolean;
  freshness_score: number;
  feed_logs: Array<{
    id: number;
    resource_type: string;
    report_timestamp: number;
    latency_ms: number;
    status: string;
    created_at: string;
  }>;
}

export default function HospitalFeedHealthPage() {
  const params = useParams();
  const hospitalId = params.hospitalId as string;

  const [data, setData] = useState<FeedHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [freezing, setFreezing] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const loadFeedHealth = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<{ feed_health: FeedHealthData }>(`/api/v2/hospitals/${hospitalId}/feed-health`);
      setData(res.feed_health);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedHealth();
  }, [hospitalId]);

  const handleToggleFreeze = async (freeze: boolean) => {
    try {
      setFreezing(true);
      await fetchApi('/api/v2/hospitals/freeze', {
        method: 'POST',
        body: JSON.stringify({
          hospital_id: hospitalId,
          freeze
        })
      });
      setActionMsg(freeze ? 'Feed frozen! Telemetry outage simulated.' : 'Feed unfrozen! Real-time updates resumed.');
      await loadFeedHealth();
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err: any) {
      alert(`Freeze action failed: ${err.message}`);
    } finally {
      setFreezing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-nav header */}
      <div className="space-y-2">
        <Link href={`/app/hospitals/${hospitalId}`} className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Facility Overview
        </Link>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
              Telemetry Feed Health & Belief Decay
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Facility: {hospitalId}
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
            <Link href={`/app/hospitals/${hospitalId}`} className="px-3 py-1.5 rounded text-slate-400 hover:text-white transition">
              Overview
            </Link>
            <Link href={`/app/hospitals/${hospitalId}/resources`} className="px-3 py-1.5 rounded text-slate-400 hover:text-white transition">
              Resources
            </Link>
            <Link href={`/app/hospitals/${hospitalId}/capabilities`} className="px-3 py-1.5 rounded text-slate-400 hover:text-white transition">
              Capabilities
            </Link>
            <Link href={`/app/hospitals/${hospitalId}/feed-health`} className="px-3 py-1.5 rounded bg-slate-800 text-white font-medium">
              Feed Health
            </Link>
            <Link href={`/app/hospitals/${hospitalId}/status-history`} className="px-3 py-1.5 rounded text-slate-400 hover:text-white transition">
              History
            </Link>
            <Link href={`/app/hospitals/${hospitalId}/audit`} className="px-3 py-1.5 rounded text-slate-400 hover:text-white transition">
              Audit
            </Link>
          </div>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3 rounded-lg bg-sky-950/60 border border-sky-800 text-sky-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-sky-400" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Top Banner: Status & Chaos Testing Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Telemetry Status:
            </span>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
              data?.is_frozen 
                ? 'bg-rose-950 text-rose-300 border-rose-800' 
                : 'bg-emerald-950 text-emerald-300 border-emerald-800'
            }`}>
              {data?.is_frozen ? 'FEED FROZEN (CHAOS SIMULATION)' : 'LIVE TELEMETRY STREAMING'}
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Freshness Belief Score: <span className="font-mono font-bold text-white">{((data?.freshness_score || 1.0) * 100).toFixed(0)}%</span>
            {' • '}
            {data?.is_frozen
              ? 'Telemetry is frozen. The C++ engine belief state will decay this hospital availability over time to avoid bed-miss routing failures.'
              : 'Feed reports are arriving regularly. The hospital receives standard scoring utility.'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {data?.is_frozen ? (
            <button
              onClick={() => handleToggleFreeze(false)}
              disabled={freezing}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              Unfreeze Feed
            </button>
          ) : (
            <button
              onClick={() => handleToggleFreeze(true)}
              disabled={freezing}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium transition cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5" />
              Simulate Feed Outage (Freeze)
            </button>
          )}

          <button
            onClick={loadFeedHealth}
            disabled={loading}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-lg border border-slate-700 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Telemetry Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Recent Telemetry Heartbeats & Observations</span>
          <span>PostgreSQL `hospital_feed_logs`</span>
        </div>

        {loading || !data ? (
          <div className="p-12 text-center text-slate-500 font-mono text-sm">
            Loading feed logs...
          </div>
        ) : data.feed_logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No telemetry logs recorded yet for this facility.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3">Log ID</th>
                  <th className="px-5 py-3">Resource Type</th>
                  <th className="px-5 py-3">Report Timestamp</th>
                  <th className="px-5 py-3">Network Lag</th>
                  <th className="px-5 py-3">Validation Status</th>
                  <th className="px-5 py-3">Ingested At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {data.feed_logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-5 py-3 font-mono text-slate-400">#{log.id}</td>
                    <td className="px-5 py-3 font-semibold text-white font-mono">{log.resource_type}</td>
                    <td className="px-5 py-3 font-mono text-slate-300">
                      {new Date(log.report_timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-5 py-3 font-mono text-sky-400">{log.latency_ms} ms</td>
                    <td className="px-5 py-3">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                        {log.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-500">
                      {new Date(log.created_at).toLocaleString()}
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
