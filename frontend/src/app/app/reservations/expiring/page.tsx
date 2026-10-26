'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Clock, 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  RefreshCw, 
  Building2, 
  ArrowRight,
  ShieldAlert 
} from 'lucide-react';
import { fetchApi, Reservation } from '@/lib/api';

export default function ExpiringReservationsPage() {
  const [expiringHolds, setExpiringHolds] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadExpiring = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<{ data: Reservation[] }>('/api/v2/reservations?expiring=true');
      setExpiringHolds(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpiring();
    const interval = setInterval(loadExpiring, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleExtend = async (id: string) => {
    try {
      setActionLoading(id);
      await fetchApi(`/api/v2/reservations/${id}/extend`, {
        method: 'POST',
        body: JSON.stringify({ extend_minutes: 5 })
      });
      await loadExpiring();
    } catch (err: any) {
      alert(`Extend failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      setActionLoading(id);
      await fetchApi(`/api/v2/reservations/${id}/confirm`, { method: 'POST' });
      await loadExpiring();
    } catch (err: any) {
      alert(`Confirm failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-rose-500 animate-pulse" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Urgent Expiring Holds Monitor (&le; 3 min TTL)
            </h1>
            <span className="text-xs bg-rose-950 text-rose-300 px-2 py-0.5 rounded border border-rose-800 font-mono">
              Live Expiry Sweep Watcher
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Active reservations within 180 seconds of automated PostgreSQL worker release (`FOR UPDATE SKIP LOCKED`).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/app/reservations"
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded-lg border border-slate-700 transition"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>All Active Holds</span>
          </Link>
          <button
            onClick={loadExpiring}
            disabled={loading}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded-lg border border-slate-700 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>{expiringHolds.length} Critical Holds Requiring Attention</span>
          <span>Durable Expiry Safety Buffer Active</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 font-mono text-sm">
            Scanning expiring reservations...
          </div>
        ) : expiringHolds.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No holds currently nearing expiration. All active reservations have safe ETA buffers.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {expiringHolds.map((res) => {
              const remainingMs = Math.max(0, res.expires_at_ms - Date.now());
              const remainingMin = Math.floor(remainingMs / 60000);
              const remainingSec = Math.floor((remainingMs % 60000) / 1000);

              return (
                <div key={res.id} className="p-5 hover:bg-slate-800/30 transition">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-300 text-sm">
                          {res.id}
                        </span>
                        <span className="text-xs bg-slate-950 text-slate-300 px-2 py-0.5 rounded border border-slate-800 font-mono">
                          {res.resource_type}
                        </span>
                        <Link href={`/app/hospitals/${res.hospital_id}`} className="text-xs text-sky-400 hover:underline">
                          {res.hospital_id}
                        </Link>
                      </div>

                      <div className="text-xs text-slate-400 flex items-center gap-3">
                        <span>Ambulance: <span className="font-mono text-white">{res.ambulance_id || 'N/A'}</span></span>
                        <span>•</span>
                        <span>TTL Deadline: <span className="font-mono text-rose-400 font-bold">{remainingMin}m {remainingSec}s remaining</span></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => handleExtend(res.id)}
                        disabled={actionLoading === res.id}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                        <span>+5 Min Buffer</span>
                      </button>

                      <button
                        onClick={() => handleConfirm(res.id)}
                        disabled={actionLoading === res.id}
                        className="flex items-center gap-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium shadow transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm Arrival</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
