'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  ArrowLeft, 
  Search, 
  RefreshCw, 
  FileCode2, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  ShieldCheck 
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface AuditEvent {
  id: number;
  correlation_id: string;
  action: string;
  payload: any;
  created_at: string;
}

export default function ObservabilityEventsPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<{ count: number; data: AuditEvent[] }>('/api/v2/observability/events');
      setEvents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const filtered = events.filter((e) => {
    const matchesFilter = filterAction === 'ALL' || e.action.includes(filterAction);
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      !search ||
      e.action.toLowerCase().includes(searchLower) ||
      (e.correlation_id && e.correlation_id.toLowerCase().includes(searchLower)) ||
      JSON.stringify(e.payload || {}).toLowerCase().includes(searchLower);

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Audit Event Explorer & Payload Inspector
            </h1>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
              PostgreSQL `audit_logs`
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tamper-evident audit records capturing every allocation, reservation transition, and administrative modification.
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
            onClick={loadEvents}
            disabled={loading}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded-lg border border-slate-700 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Correlation ID, Action Name, or Payload Content..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'ALLOCATED', 'RESERVATION', 'CAPACITY', 'ALERT'].map((act) => (
            <button
              key={act}
              onClick={() => setFilterAction(act)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                filterAction === act
                  ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {act}
            </button>
          ))}
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filtered.length} Audit Events</span>
          <span>Structured PostgreSQL Audit Archive</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 font-mono text-sm">
            Loading audit events...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No audit records match the selected filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filtered.map((ev) => {
              const isExpanded = expandedId === ev.id;
              return (
                <div key={ev.id} className="p-4 hover:bg-slate-800/30 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white">
                          {ev.action}
                        </span>
                        <span className="text-[10px] font-mono bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                          #{ev.id}
                        </span>
                        {ev.correlation_id && (
                          <span className="text-[10px] font-mono text-sky-400">
                            CID: {ev.correlation_id}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-1">
                        {new Date(ev.created_at).toLocaleString()}
                      </p>
                    </div>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 transition cursor-pointer"
                    >
                      <FileCode2 className="w-3 h-3 text-emerald-400" />
                      <span>{isExpanded ? 'Hide Payload' : 'Inspect JSON'}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto max-h-64">
                      <pre>{JSON.stringify(ev.payload, null, 2)}</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
