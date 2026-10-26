'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ShieldAlert, 
  ArrowLeft, 
  Building2, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  RefreshCw, 
  AlertCircle,
  Truck
} from 'lucide-react';
import { fetchApi, Reservation } from '@/lib/api';

export default function ReservationDetailPage() {
  const params = useParams();
  const reservationId = params.reservationId as string;

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<{ reservation: Reservation }>(`/api/v2/reservations/${reservationId}`);
      setReservation(res.reservation);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [reservationId]);

  const handleConfirm = async () => {
    try {
      setActionLoading(true);
      await fetchApi(`/api/v2/reservations/${reservationId}/confirm`, { method: 'POST' });
      setActionMsg('Hold confirmed! Resource marked as occupied by incoming patient.');
      await loadData();
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err: any) {
      alert(`Confirm failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      setActionLoading(true);
      await fetchApi(`/api/v2/reservations/${reservationId}/cancel`, { method: 'POST' });
      setActionMsg('Hold released! Capacity returned immediately to hospital inventory.');
      await loadData();
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err: any) {
      alert(`Cancel failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtend = async () => {
    try {
      setActionLoading(true);
      await fetchApi(`/api/v2/reservations/${reservationId}/extend`, {
        method: 'POST',
        body: JSON.stringify({ extend_minutes: 5 })
      });
      setActionMsg('Hold extended by 5 minutes.');
      await loadData();
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err: any) {
      alert(`Extend failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-mono text-sm">Loading hold details...</div>;
  }

  if (!reservation) {
    return (
      <div className="p-12 text-center space-y-4">
        <h2 className="text-lg font-bold text-slate-200">Reservation {reservationId} not found</h2>
        <Link href="/app/reservations" className="text-sky-400 text-xs underline">
          Back to Ledger Holds
        </Link>
      </div>
    );
  }

  const remainingMs = Math.max(0, reservation.expires_at_ms - Date.now());
  const remainingMin = Math.floor(remainingMs / 60000);
  const remainingSec = Math.floor((remainingMs % 60000) / 1000);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <Link href="/app/reservations" className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Reservations Ledger
        </Link>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              Reservation Hold Workspace: {reservationId}
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Facility: {reservation.hospital_id} • Resource: {reservation.resource_type}
            </p>
          </div>

          <span className={`text-xs font-mono font-bold px-3 py-1 rounded-lg border ${
            reservation.state === 'HELD'
              ? 'bg-amber-950 text-amber-300 border-amber-800'
              : reservation.state === 'CONFIRMED'
              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
              : 'bg-rose-950 text-rose-300 border-rose-800'
          }`}>
            {reservation.state}
          </span>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Main Details Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase">Hospital Node</span>
            <div className="text-sm font-bold text-white font-mono mt-1">
              <Link href={`/app/hospitals/${reservation.hospital_id}`} className="hover:underline">
                {reservation.hospital_id}
              </Link>
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase">Resource</span>
            <div className="text-sm font-bold text-emerald-400 font-mono mt-1">
              {reservation.resource_type}
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase">Ambulance Call Sign</span>
            <div className="text-sm font-bold text-sky-400 font-mono mt-1">
              {reservation.ambulance_id || 'Manual Hold'}
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase">Remaining Hold TTL</span>
            <div className={`text-sm font-bold font-mono mt-1 ${remainingMs < 180000 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
              {reservation.state === 'HELD' ? `${remainingMin}m ${remainingSec}s` : 'Resolved'}
            </div>
          </div>
        </div>

        {/* Timestamps */}
        <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-slate-400 space-y-1">
          <div>Created: {new Date(reservation.created_at_ms).toLocaleString()}</div>
          <div>TTL Expiration: {new Date(reservation.expires_at_ms).toLocaleString()}</div>
          <div>Last Updated: {new Date(reservation.updated_at).toLocaleString()}</div>
        </div>

        {/* Action Buttons */}
        {reservation.state === 'HELD' && (
          <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-end gap-3">
            <button
              onClick={handleExtend}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
              Extend (+5 min)
            </button>

            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 rounded-lg text-xs font-medium border border-rose-800 transition cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
              Release / Cancel Hold
            </button>

            <button
              onClick={handleConfirm}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium shadow-lg shadow-emerald-600/20 transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm Patient Arrival
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
