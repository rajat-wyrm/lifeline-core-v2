'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Clock, 
  Search, 
  Filter, 
  ArrowUpRight, 
  RefreshCw, 
  AlertCircle,
  Activity,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { fetchApi, EmergencyRequest } from '@/lib/api';

export default function RequestsPage() {
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<{ data: EmergencyRequest[] }>('/api/v2/requests');
      setRequests(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const filtered = requests.filter(r => {
    const matchesSearch = r.id.toLowerCase().includes(search.toLowerCase()) ||
                          r.required_resource.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-6 h-6 text-purple-400" />
            Emergency Request Dispatch Log
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete lifecycle inspection of incoming patient streams, severity ranking, and allocation outcomes
          </p>
        </div>

        <button
          onClick={loadRequests}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by request ID or resource..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
          {['ALL', 'ALLOCATED', 'PENDING', 'FAILED'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded text-[11px] font-medium transition ${
                statusFilter === s ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/60 shadow-lg">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-xs text-slate-500">
            No emergency requests found. Use the Dispatch form on the Dashboard to trigger an allocation.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-mono text-[11px]">
                  <th className="py-3 px-4">Request ID</th>
                  <th className="py-3 px-4">Age</th>
                  <th className="py-3 px-4">Trauma Score</th>
                  <th className="py-3 px-4">Resource Needed</th>
                  <th className="py-3 px-4">Origin Coordinates</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-medium text-purple-400">{r.id}</td>
                    <td className="py-3 px-4 font-mono">{r.patient_age} yrs</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        r.trauma_score >= 4 ? 'bg-red-950 text-red-400 border border-red-800' :
                        r.trauma_score === 3 ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        Level {r.trauma_score}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-200">{r.required_resource}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {r.origin_latitude.toFixed(4)}, {r.origin_longitude.toFixed(4)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                        r.status === 'ALLOCATED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                        r.status === 'FAILED' ? 'bg-red-950 text-red-400 border border-red-800' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {r.status === 'ALLOCATED' && <CheckCircle2 className="w-3 h-3" />}
                        {r.status === 'FAILED' && <XCircle className="w-3 h-3" />}
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {new Date(r.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/app/requests/${r.id}`}
                        className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-medium text-xs hover:underline"
                      >
                        Explain
                        <ArrowUpRight className="w-3.5 h-3.5" />
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
