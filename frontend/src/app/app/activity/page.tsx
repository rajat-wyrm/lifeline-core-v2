'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Activity, 
  Search, 
  Filter, 
  RefreshCw, 
  Radio, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Database, 
  ChevronDown, 
  ChevronUp,
  FileCode2
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface OperationalEvent {
  id: number;
  correlation_id: string;
  action: string;
  payload: any;
  created_at: string;
}

export default function ActivityStreamPage() {
  const [events, setEvents] = useState<OperationalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [liveStreaming, setLiveStreaming] = useState(true);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<{ data: OperationalEvent[] }>('/api/v2/observability/events');
      setEvents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    const interval = setInterval(() => {
      if (liveStreaming) {
        fetchApi<{ data: OperationalEvent[] }>('/api/v2/observability/events')
          .then(res => setEvents(res.data))
          .catch(() => {});
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [liveStreaming]);

  const filtered = events.filter((ev) => {
    const matchesFilter = selectedFilter === 'ALL' || ev.action.includes(selectedFilter);
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      !search ||
      ev.action.toLowerCase().includes(searchLower) ||
      (ev.correlation_id && ev.correlation_id.toLowerCase().includes(searchLower)) ||
      JSON.stringify(ev.payload || {}).toLowerCase().includes(searchLower);

    return matchesFilter && matchesSearch;
  });

  const getActionBadge = (action: string) => {
    if (action.includes('ALLOCATED')) {
      return { bg: 'bg-emerald-950/60 text-emerald-400 border-emerald-800', icon: CheckCircle2 };
    }
    if (action.includes('RESERVATION')) {
      return { bg: 'bg-sky-950/60 text-sky-400 border-sky-800', icon: Clock };
    }
    if (action.includes('ALERT')) {
      return { bg: 'bg-amber-950/60 text-amber-400 border-amber-800', icon: ShieldAlert };
    }
    return { bg: 'bg-purple-950/60 text-purple-400 border-purple-800', icon: Database };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-red-500 animate-pulse" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Operational Activity Stream
            </h1>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
              PostgreSQL Outbox & Audit Ledger
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time chronological timeline of allocations, resource reservations, capacity changes, and operational telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setLiveStreaming(!liveStreaming)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
              liveStreaming
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-700/50'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${liveStreaming ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            {liveStreaming ? 'Live Polling Active (4s)' : 'Polling Paused'}
          </button>

          <button
            onClick={loadEvents}
            disabled={loading}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-700 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Correlation ID, Request ID, Action or Payload..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {['ALL', 'ALLOCATED', 'RESERVATION', 'ALERT', 'CAPACITY'].map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer whitespace-nowrap ${
                selectedFilter === filter
                  ? 'bg-red-600/20 text-red-400 border-red-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Event Timeline Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filtered.length} Recorded Operational Events</span>
          <span>Authoritative PostgreSQL Transaction Audit</span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            {loading ? 'Streaming audit ledger...' : 'No activity records match the selected filter.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filtered.map((ev) => {
              const badge = getActionBadge(ev.action);
              const BadgeIcon = badge.icon;
              const isExpanded = expandedId === ev.id;

              return (
                <div key={ev.id} className="p-4 hover:bg-slate-800/40 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg border ${badge.bg}`}>
                        <BadgeIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-xs text-white">
                            {ev.action}
                          </span>
                          {ev.correlation_id && (
                            <span className="text-[11px] font-mono bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                              CID: {ev.correlation_id}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1 font-mono">
                          {new Date(ev.created_at).toLocaleString()} • Event #{ev.id}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800/60 border border-slate-700/60 transition cursor-pointer"
                    >
                      <FileCode2 className="w-3 h-3" />
                      <span>{isExpanded ? 'Hide Payload' : 'View Payload'}</span>
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
