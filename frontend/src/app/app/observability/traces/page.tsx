'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  GitCommit, 
  ArrowLeft, 
  Search, 
  RefreshCw, 
  Clock, 
  Cpu, 
  Database, 
  CheckCircle2, 
  ChevronRight 
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface TraceSpan {
  trace_id: string;
  span_id: string;
  action: string;
  duration_ms: string;
  status_code: number;
  timestamp: string;
  service: string;
}

export default function ObservabilityTracesPage() {
  const [traces, setTraces] = useState<TraceSpan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadTraces = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<{ count: number; traces: TraceSpan[] }>('/api/v2/observability/traces');
      setTraces(res.traces);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTraces();
  }, []);

  const filtered = traces.filter((t) => {
    const searchLower = search.toLowerCase();
    return (
      !search ||
      t.trace_id.toLowerCase().includes(searchLower) ||
      t.action.toLowerCase().includes(searchLower) ||
      t.service.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <GitCommit className="w-5 h-5 text-purple-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Distributed Request Tracing & Correlation Spans
            </h1>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
              W3C TraceContext
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            End-to-end request tracing spanning Next.js UI, Fastify API gateway, C++ allocation daemon, and PostgreSQL worker.
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
            onClick={loadTraces}
            disabled={loading}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded-lg border border-slate-700 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by Trace Correlation ID, Operation, or Service..."
          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500 transition"
        />
      </div>

      {/* Traces Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filtered.length} Sampled Tracing Spans</span>
          <span>Zero-Drop Sampling</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 font-mono text-sm">
            Sampling distributed traces...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No trace spans found matching this query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3">Trace Correlation ID</th>
                  <th className="px-5 py-3">Service</th>
                  <th className="px-5 py-3">Operation / Span</th>
                  <th className="px-5 py-3">Duration</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filtered.map((span) => (
                  <tr key={span.span_id} className="hover:bg-slate-800/30 transition">
                    <td className="px-5 py-3 font-mono font-bold text-sky-300">
                      {span.trace_id}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        span.service.includes('cpp')
                          ? 'bg-purple-950 text-purple-300 border-purple-800'
                          : 'bg-sky-950 text-sky-300 border-sky-800'
                      }`}>
                        {span.service}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-semibold text-white">
                      {span.action}
                    </td>
                    <td className="px-5 py-3 font-mono text-amber-300">
                      {span.duration_ms} ms
                    </td>
                    <td className="px-5 py-3 font-mono text-emerald-400">
                      {span.status_code} OK
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-500">
                      {new Date(span.timestamp).toLocaleTimeString()}
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
