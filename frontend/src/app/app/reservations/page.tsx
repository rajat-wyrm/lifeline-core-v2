'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RotateCcw, 
  Search, 
  Filter, 
  ExternalLink,
  Info,
  AlertTriangle,
  Flame
} from 'lucide-react';
import Link from 'next/link';
import { fetchApi, Reservation } from '@/lib/api';

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ id: string; type: 'success' | 'error'; text: string } | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  // Update timer clock every second for live TTL calculation
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadReservations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<{ count: number; data: Reservation[] }>('/api/v2/reservations');
      setReservations(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load reservations ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, []);

  const handleConfirm = async (id: string) => {
    try {
      setActionLoading(id);
      await fetchApi(`/api/v2/reservations/${id}/confirm`, { method: 'POST' });
      setActionMessage({ id, type: 'success', text: 'Confirmed arrival! Resource permanently allocated.' });
      await loadReservations();
    } catch (err: any) {
      setActionMessage({ id, type: 'error', text: err.message || 'Confirm failed' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRelease = async (id: string) => {
    try {
      setActionLoading(id);
      await fetchApi(`/api/v2/reservations/${id}/release`, { method: 'POST' });
      setActionMessage({ id, type: 'success', text: 'Released hold! Resource returned to available pool.' });
      await loadReservations();
    } catch (err: any) {
      setActionMessage({ id, type: 'error', text: err.message || 'Release failed' });
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = reservations.filter((r) => {
    const matchesState = filterState === 'ALL' || r.state === filterState;
    const matchesSearch = 
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.hospital_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.request_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.ambulance_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.resource_type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesState && matchesSearch;
  });

  const countHeld = reservations.filter(r => r.state === 'HELD').length;
  const countConfirmed = reservations.filter(r => r.state === 'CONFIRMED').length;
  const countReleased = reservations.filter(r => r.state === 'RELEASED').length;
  const countExpired = reservations.filter(r => r.state === 'EXPIRED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-sky-400" />
              Reservation Ledger
            </h1>
            <span className="px-2 py-0.5 text-xs font-mono bg-sky-950 text-sky-300 border border-sky-800 rounded">
              Atomic Mutex & Min-Heap
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Authoritative resource holds managed by C++17 engine with strict TTL auto-expiration to prevent bed hoards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadReservations}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium rounded-lg flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-amber-900/40 rounded-xl p-4">
          <div className="text-xs font-medium text-amber-400 flex items-center justify-between">
            Active Holds
            <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">{countHeld}</div>
          <div className="text-[11px] text-slate-400 mt-1">Pending arrival validation</div>
        </div>

        <div className="bg-slate-900/60 border border-emerald-900/40 rounded-xl p-4">
          <div className="text-xs font-medium text-emerald-400 flex items-center justify-between">
            Confirmed
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">{countConfirmed}</div>
          <div className="text-[11px] text-slate-400 mt-1">Ambulance arrived & admitted</div>
        </div>

        <div className="bg-slate-900/60 border border-blue-900/40 rounded-xl p-4">
          <div className="text-xs font-medium text-blue-400 flex items-center justify-between">
            Released
            <RotateCcw className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">{countReleased}</div>
          <div className="text-[11px] text-slate-400 mt-1">Voluntarily cancelled</div>
        </div>

        <div className="bg-slate-900/60 border border-rose-900/40 rounded-xl p-4">
          <div className="text-xs font-medium text-rose-400 flex items-center justify-between">
            Expired
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">{countExpired}</div>
          <div className="text-[11px] text-slate-400 mt-1">Auto-reclaimed via TTL</div>
        </div>
      </div>

      {/* Architectural Callout Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 flex items-start gap-3">
        <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-white">How Lifeline-Core Atomic Holds Eliminate Double Allocations:</div>
          <p className="text-slate-400 leading-relaxed">
            When dispatch approves a reservation, the C++ engine acquires a fine-grained reader-writer lock on the target hospital, decrements available capacity, registers an expiry timestamp in an O(log K) min-heap, and writes an atomic hold to PostgreSQL. If the ambulance does not confirm arrival within the ETA + slack window, the min-heap timer evicts the hold and automatically restores capacity to the hospital pool.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <div className="flex gap-1">
            {(['ALL', 'HELD', 'CONFIRMED', 'RELEASED', 'EXPIRED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterState(s)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                  filterState === s
                    ? 'bg-sky-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search reservation, hospital, ambulance..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 pl-9 pr-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Action Notice */}
      {actionMessage && (
        <div className={`p-3 rounded-lg text-xs flex items-center justify-between border ${
          actionMessage.type === 'success' 
            ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' 
            : 'bg-rose-950/60 border-rose-800 text-rose-300'
        }`}>
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Reservations Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <RotateCcw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
            Loading active reservation ledger...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 text-sm">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No reservations found matching the current criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4">Hold ID & Request</th>
                  <th className="py-3 px-4">Hospital Target</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">Ambulance</th>
                  <th className="py-3 px-4">State</th>
                  <th className="py-3 px-4">TTL Expiry</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filtered.map((r) => {
                  const msRemaining = r.expires_at_ms - now;
                  const secRemaining = Math.max(0, Math.floor(msRemaining / 1000));
                  const isExpiringSoon = r.state === 'HELD' && secRemaining < 120 && secRemaining > 0;
                  const isExpiredNow = r.state === 'HELD' && secRemaining <= 0;

                  return (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono">
                        <div className="text-white font-medium">{r.id}</div>
                        <Link 
                          href={`/app/requests/${r.request_id}`}
                          className="text-[11px] text-sky-400 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          {r.request_id}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      </td>

                      <td className="py-3 px-4">
                        <Link 
                          href={`/app/hospitals/${r.hospital_id}`}
                          className="font-medium text-slate-200 hover:text-sky-400 transition"
                        >
                          {r.hospital_id}
                        </Link>
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                          {r.resource_type}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-300">
                        {r.ambulance_id}
                      </td>

                      <td className="py-3 px-4">
                        {r.state === 'HELD' ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold border ${
                            isExpiredNow
                              ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                              : isExpiringSoon
                              ? 'bg-amber-950/80 text-amber-300 border-amber-800 animate-pulse'
                              : 'bg-yellow-950/60 text-yellow-300 border-yellow-800'
                          }`}>
                            <Clock className="w-3 h-3" />
                            HELD
                          </span>
                        ) : r.state === 'CONFIRMED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            CONFIRMED
                          </span>
                        ) : r.state === 'RELEASED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold bg-blue-950/60 text-blue-300 border border-blue-800">
                            <RotateCcw className="w-3 h-3" />
                            RELEASED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold bg-rose-950/60 text-rose-300 border border-rose-800">
                            <XCircle className="w-3 h-3" />
                            EXPIRED
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px]">
                        {r.state === 'HELD' ? (
                          <div>
                            {isExpiredNow ? (
                              <span className="text-rose-400 font-bold">EXPIRED (TTL Passed)</span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className={isExpiringSoon ? 'text-amber-400 font-bold' : 'text-slate-200'}>
                                  {Math.floor(secRemaining / 60)}m {secRemaining % 60}s
                                </span>
                                {isExpiringSoon && <Flame className="w-3 h-3 text-amber-500 animate-bounce" />}
                              </div>
                            )}
                            <div className="text-[10px] text-slate-500">
                              {new Date(r.expires_at_ms).toLocaleTimeString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {r.state === 'HELD' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleConfirm(r.id)}
                              disabled={actionLoading === r.id}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium text-[11px] transition disabled:opacity-50 flex items-center gap-1"
                              title="Ambulance arrived: Confirm admission"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Confirm
                            </button>
                            <button
                              onClick={() => handleRelease(r.id)}
                              disabled={actionLoading === r.id}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-300 border border-slate-700 rounded font-medium text-[11px] transition disabled:opacity-50 flex items-center gap-1"
                              title="Ambulance diverted: Cancel hold"
                            >
                              <XCircle className="w-3 h-3" />
                              Release
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px] italic">Terminal</span>
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
