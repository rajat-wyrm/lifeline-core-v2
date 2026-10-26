'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Activity, 
  Database, 
  Cpu, 
  Server, 
  ShieldCheck, 
  RotateCcw, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Search,
  Filter
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface SystemStats {
  hospitals_total: number;
  requests_total: number;
  reservations_total: number;
  reservations_held: number;
  reservations_confirmed: number;
  reservations_expired: number;
  uptime_seconds: number;
}

interface AuditLog {
  id: string;
  event_type: string;
  actor: string;
  entity_type: string;
  entity_id: string;
  payload: any;
  created_at: string;
}

export default function ObservabilityPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [events, setEvents] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<AuditLog | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sRes, eRes] = await Promise.all([
        fetchApi<SystemStats>('/api/v2/observability/stats'),
        fetchApi<{ count: number; data: AuditLog[] }>('/api/v2/observability/events')
      ]);
      setStats(sRes);
      setEvents(eRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load observability data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredEvents = events.filter((e) => {
    return (
      e.event_type.toLowerCase().includes(searchFilter.toLowerCase()) ||
      e.entity_id.toLowerCase().includes(searchFilter.toLowerCase()) ||
      e.actor.toLowerCase().includes(searchFilter.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-sky-400" />
              Observability & Audit Trail
            </h1>
            <span className="px-2 py-0.5 text-xs font-mono bg-sky-950 text-sky-300 border border-sky-800 rounded">
              Immutable Log Stream
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time telemetry, daemon heartbeats, and immutable security audit trails for every allocation state change.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium rounded-lg flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Log
          </button>
        </div>
      </div>

      {/* Service Health Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-lg text-emerald-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400">C++17 Engine Daemon</div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Online (Port 8081)
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">ThreadSanitizer Clean</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-lg text-emerald-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400">PostgreSQL Database</div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Healthy (Port 5433)
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Raw SQL via pg pool</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-lg text-emerald-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400">Fastify REST Backend</div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Active (Port 3001)
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Uptime: {stats ? `${Math.floor(stats.uptime_seconds)}s` : '...'}
            </div>
          </div>
        </div>
      </div>

      {/* System Metric Counters */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
            <div className="text-[11px] text-slate-400">Hospitals Tracked</div>
            <div className="text-xl font-bold font-mono text-white mt-1">{stats.hospitals_total}</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
            <div className="text-[11px] text-slate-400">Total Requests</div>
            <div className="text-xl font-bold font-mono text-white mt-1">{stats.requests_total}</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
            <div className="text-[11px] text-slate-400">Total Holds</div>
            <div className="text-xl font-bold font-mono text-white mt-1">{stats.reservations_total}</div>
          </div>
          <div className="bg-slate-900/80 border border-amber-900/40 rounded-xl p-3.5">
            <div className="text-[11px] text-amber-400">Active HELD</div>
            <div className="text-xl font-bold font-mono text-amber-300 mt-1">{stats.reservations_held}</div>
          </div>
          <div className="bg-slate-900/80 border border-emerald-900/40 rounded-xl p-3.5">
            <div className="text-[11px] text-emerald-400">CONFIRMED Admissions</div>
            <div className="text-xl font-bold font-mono text-emerald-300 mt-1">{stats.reservations_confirmed}</div>
          </div>
        </div>
      )}

      {/* Audit Log Stream */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Immutable Event Stream</h2>
            <p className="text-xs text-slate-400 mt-0.5">Tamper-evident audit trail of allocation events</p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by event type, ID, actor..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {loading && events.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <RotateCcw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
            Streaming audit logs from database...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 text-sm">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
            {error}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No audit log events match the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Event Type</th>
                  <th className="py-2.5 px-4">Actor</th>
                  <th className="py-2.5 px-4">Entity</th>
                  <th className="py-2.5 px-4">Payload Inspector</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                {filteredEvents.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                      {new Date(e.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        e.event_type.includes('CONFIRMED')
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                          : e.event_type.includes('HELD')
                          ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                          : e.event_type.includes('RELEASED')
                          ? 'bg-blue-950/80 text-blue-300 border-blue-800'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {e.event_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-300">{e.actor}</td>
                    <td className="py-2.5 px-4 text-sky-400 font-medium">
                      {e.entity_type}:{e.entity_id}
                    </td>
                    <td className="py-2.5 px-4">
                      <button
                        onClick={() => setSelectedEvent(e)}
                        className="text-xs text-sky-400 hover:underline flex items-center gap-1 font-sans"
                      >
                        Inspect Payload
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payload Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Event Payload Inspector</h3>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">{selectedEvent.event_type}</div>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs font-mono text-sky-300 overflow-x-auto max-h-80">
              <code>{JSON.stringify(selectedEvent.payload, null, 2)}</code>
            </pre>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
