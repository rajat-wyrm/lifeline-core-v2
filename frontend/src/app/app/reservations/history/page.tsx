'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  History, 
  ArrowLeft, 
  Search, 
  Filter, 
  Building2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCw,
  ShieldAlert 
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface HistoricalHold {
  id: string;
  hospital_id: string;
  hospital_name: string;
  resource_type: string;
  request_id: string;
  ambulance_id: string;
  state: 'CONFIRMED' | 'RELEASED' | 'EXPIRED';
  created_at_ms: number;
  expires_at_ms: number;
  updated_at: string;
}

export default function ReservationsHistoryPage() {
  const [history, setHistory] = useState<HistoricalHold[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState<string>('ALL');

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<{ count: number; data: HistoricalHold[] }>('/api/v2/reservations/history');
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const filtered = history.filter((h) => {
    const matchesFilter = filterState === 'ALL' || h.state === filterState;
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      !search ||
      h.id.toLowerCase().includes(searchLower) ||
      h.hospital_name.toLowerCase().includes(searchLower) ||
      h.resource_type.toLowerCase().includes(searchLower) ||
      (h.ambulance_id && h.ambulance_id.toLowerCase().includes(searchLower));

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-sky-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Reservations History & Resolution Ledger
            </h1>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
              Terminal States Archive
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Complete audit trail of confirmed patient admissions, cancelled holds, and expired reservation events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/app/reservations"
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded-lg border border-slate-700 transition"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Active Holds</span>
          </Link>
          <button
            onClick={loadHistory}
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
            placeholder="Search by Hold ID, Hospital, Resource, or Ambulance..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'CONFIRMED', 'EXPIRED', 'RELEASED'].map((state) => (
            <button
              key={state}
              onClick={() => setFilterState(state)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                filterState === state
                  ? 'bg-sky-600/20 text-sky-400 border-sky-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {state}
            </button>
          ))}
        </div>
      </div>

      {/* History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filtered.length} Historical Records</span>
          <span>PostgreSQL Authoritative History</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 font-mono text-sm">
            Loading reservations history...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No historical holds found matching this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3">Reservation ID</th>
                  <th className="px-5 py-3">Hospital Facility</th>
                  <th className="px-5 py-3">Resource Held</th>
                  <th className="px-5 py-3">Ambulance Unit</th>
                  <th className="px-5 py-3">Resolution State</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3">Resolved At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filtered.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-5 py-3 font-mono font-bold text-amber-300">
                      <Link href={`/app/reservations/${h.id}`} className="hover:underline">
                        {h.id}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/app/hospitals/${h.hospital_id}`} className="font-semibold text-white hover:text-sky-400">
                        {h.hospital_name}
                      </Link>
                      <div className="font-mono text-[10px] text-slate-500">{h.hospital_id}</div>
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-300">
                      {h.resource_type}
                    </td>
                    <td className="px-5 py-3 font-mono text-sky-400">
                      {h.ambulance_id || 'Manual'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                        h.state === 'CONFIRMED'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : h.state === 'EXPIRED'
                          ? 'bg-rose-950 text-rose-300 border-rose-800'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {h.state}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-400">
                      {new Date(h.created_at_ms).toLocaleTimeString()}
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-500">
                      {new Date(h.updated_at).toLocaleTimeString()}
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
