'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  Search, 
  Filter, 
  ArrowRight, 
  RefreshCw, 
  Building2, 
  ShieldAlert, 
  Clock, 
  FileText 
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface AllocationRecord {
  reservation_id: string;
  hospital_id: string;
  hospital_name: string;
  resource_type: string;
  request_id: string;
  state: string;
  created_at_ms: number;
  expires_at_ms: number;
  trauma_score?: number;
  patient_age?: number;
}

export default function AllocationsArchivePage() {
  const [allocations, setAllocations] = useState<AllocationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadAllocations = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<{ data: AllocationRecord[] }>('/api/v2/allocations');
      setAllocations(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllocations();
  }, []);

  const filtered = allocations.filter((a) => {
    const searchLower = search.toLowerCase();
    return (
      !search ||
      a.reservation_id.toLowerCase().includes(searchLower) ||
      a.hospital_name.toLowerCase().includes(searchLower) ||
      (a.request_id && a.request_id.toLowerCase().includes(searchLower)) ||
      a.resource_type.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Global Allocation Decision Archive
            </h1>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
              Immutable Decision History
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Historical ledger of all algorithmic assignments, patient match decisions, and fallback routing traces.
          </p>
        </div>

        <button
          onClick={loadAllocations}
          disabled={loading}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded-lg border border-slate-700 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by Reservation ID, Hospital, Incident Request ID, or Resource Type..."
          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500 transition"
        />
      </div>

      {/* Allocations Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filtered.length} Decisions</span>
          <span>Fastify API • PostgreSQL Ledger</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 font-mono text-sm">
            Loading allocations ledger...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No allocation decision records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3">Reservation Hold ID</th>
                  <th className="px-5 py-3">Assigned Hospital</th>
                  <th className="px-5 py-3">Resource Type</th>
                  <th className="px-5 py-3">Linked Incident</th>
                  <th className="px-5 py-3">Hold Status</th>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filtered.map((a) => (
                  <tr key={a.reservation_id} className="hover:bg-slate-800/30 transition">
                    <td className="px-5 py-3 font-mono font-bold text-amber-300">
                      {a.reservation_id}
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/app/hospitals/${a.hospital_id}`} className="font-semibold text-white hover:text-sky-400 transition">
                        {a.hospital_name}
                      </Link>
                      <div className="font-mono text-[10px] text-slate-500">{a.hospital_id}</div>
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-300">
                      {a.resource_type}
                    </td>
                    <td className="px-5 py-3">
                      {a.request_id ? (
                        <Link href={`/app/requests/${a.request_id}`} className="text-sky-400 hover:underline font-mono">
                          {a.request_id}
                        </Link>
                      ) : (
                        <span className="text-slate-500 font-mono">Manual Hold</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        a.state === 'HELD'
                          ? 'bg-amber-950 text-amber-400 border-amber-800'
                          : a.state === 'CONFIRMED'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : 'bg-rose-950 text-rose-400 border-rose-800'
                      }`}>
                        {a.state}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-500">
                      {new Date(a.created_at_ms).toLocaleTimeString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/app/allocations/${a.reservation_id}`}
                        className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-medium transition"
                      >
                        <span>Trace</span>
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
