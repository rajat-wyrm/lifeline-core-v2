'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  ArrowLeft, 
  Clock, 
  ShieldAlert, 
  Activity, 
  MapPin, 
  AlertTriangle,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { fetchApi, Hospital, Reservation } from '@/lib/api';
import { formatTimeAgo, getFreshnessBadge } from '@/lib/utils';

export default function HospitalDetailPage() {
  const params = useParams();
  const hospitalId = params.hospitalId as string;

  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchApi<{ data: Hospital }>(`/api/v2/hospitals/${hospitalId}`),
      fetchApi<{ data: Reservation[] }>('/api/v2/reservations')
    ])
      .then(([hospRes, resRes]) => {
        setHospital(hospRes.data);
        setReservations(resRes.data.filter(r => r.hospital_id === hospitalId));
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [hospitalId]);

  if (loading) {
    return <div className="text-center py-20 text-slate-500 font-mono text-sm">Loading hospital details...</div>;
  }

  if (!hospital) {
    return (
      <div className="text-center py-20 space-y-4">
        <h2 className="text-xl font-bold text-slate-200">Hospital {hospitalId} not found</h2>
        <Link href="/app/hospitals" className="text-sky-400 text-sm underline">Back to Hospitals</Link>
      </div>
    );
  }

  const icu = hospital.resources?.['ICU-BED'] || { total: 0, available: 0, reserved: 0, last_report_timestamp: 0 };
  const vent = hospital.resources?.['VENTILATOR'] || { total: 0, available: 0, reserved: 0, last_report_timestamp: 0 };
  const oxy = hospital.resources?.['OXYGEN-BED'] || { total: 0, available: 0, reserved: 0, last_report_timestamp: 0 };
  const gen = hospital.resources?.['GENERAL-BED'] || { total: 0, available: 0, reserved: 0, last_report_timestamp: 0 };

  const ageMs = icu.last_report_timestamp ? Date.now() - icu.last_report_timestamp : 3600000;
  const freshScore = Math.max(0, 1.0 - (ageMs / 3600000));
  const badge = getFreshnessBadge(freshScore);

  // Compute Poisson walk-in survival probabilities across travel times
  const computePoisson = (a: number, t_min: number, lam: number) => {
    if (a <= 0) return 0;
    const mu = lam * t_min;
    let sum = 0;
    let term = Math.exp(-mu);
    sum += term;
    for (let k = 1; k < a; ++k) {
      term *= (mu / k);
      sum += term;
      if (sum >= 1) return 100;
    }
    return Math.min(100, Math.round(sum * 100));
  };

  return (
    <div className="space-y-8">
      {/* Back button & Title */}
      <div className="space-y-2">
        <Link href="/app/hospitals" className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Hospital Grid
        </Link>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 flex items-center gap-3">
              <Building2 className="w-7 h-7 text-sky-400" />
              {hospital.name}
            </h1>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
              <span>ID: {hospital.id}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-500" />
                {hospital.latitude.toFixed(4)}, {hospital.longitude.toFixed(4)}
              </span>
              <span>•</span>
              <span>Walk-in rate &lambda; = {hospital.walk_in_lambda.toFixed(2)} / min</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
            <span className={`px-2.5 py-1 rounded text-xs font-mono font-medium ${badge.color}`}>
              {badge.label} (Freshness: {(freshScore * 100).toFixed(0)}%)
            </span>
          </div>
        </div>

        {/* Sub-route tabs */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs overflow-x-auto">
          <Link href={`/app/hospitals/${hospitalId}`} className="px-3 py-1.5 rounded bg-slate-800 text-white font-medium">
            Overview
          </Link>
          <Link href={`/app/hospitals/${hospitalId}/resources`} className="px-3 py-1.5 rounded text-slate-400 hover:text-white transition">
            Resources
          </Link>
          <Link href={`/app/hospitals/${hospitalId}/capabilities`} className="px-3 py-1.5 rounded text-slate-400 hover:text-white transition">
            Capabilities
          </Link>
          <Link href={`/app/hospitals/${hospitalId}/feed-health`} className="px-3 py-1.5 rounded text-slate-400 hover:text-white transition">
            Feed Health
          </Link>
          <Link href={`/app/hospitals/${hospitalId}/status-history`} className="px-3 py-1.5 rounded text-slate-400 hover:text-white transition">
            History
          </Link>
          <Link href={`/app/hospitals/${hospitalId}/audit`} className="px-3 py-1.5 rounded text-slate-400 hover:text-white transition">
            Audit
          </Link>
        </div>
      </div>

      {/* Resource Breakdown Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { name: 'ICU Beds', res: icu, color: 'text-red-400', bg: 'bg-red-500' },
          { name: 'Ventilators', res: vent, color: 'text-sky-400', bg: 'bg-sky-500' },
          { name: 'Oxygen Beds', res: oxy, color: 'text-emerald-400', bg: 'bg-emerald-500' },
          { name: 'General Beds', res: gen, color: 'text-amber-400', bg: 'bg-amber-500' },
        ].map((item) => {
          const pct = item.res.total > 0 ? (item.res.available / item.res.total) * 100 : 0;
          return (
            <div key={item.name} className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-xs font-medium text-slate-400">
                <span>{item.name}</span>
                <span className={`font-bold ${item.color}`}>{item.res.available} free</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full ${item.bg}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>Total: {item.res.total}</span>
                <span>Held: {item.res.reserved}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Poisson Arrival Risk Matrix */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="space-y-1 border-b border-slate-800 pb-3">
          <h3 className="font-semibold text-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Poisson Walk-In Survival Probability Matrix
          </h3>
          <p className="text-xs text-slate-400">
            Probability P(bed still available on arrival) taking into account travel time ETA and hospital walk-in rate (&lambda; = {hospital.walk_in_lambda}/min).
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[5, 10, 15, 20].map((t) => {
            const prob = computePoisson(icu.available, t, hospital.walk_in_lambda);
            return (
              <div key={t} className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
                <div className="text-[11px] text-slate-500 font-mono">Transit ETA: {t} mins</div>
                <div className={`text-2xl font-bold font-mono ${
                  prob >= 80 ? 'text-emerald-400' : prob >= 50 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {prob}%
                </div>
                <div className="text-[10px] text-slate-400">Survival Chance</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hospital Reservations */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h3 className="font-semibold text-slate-100 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          Active Holds at this Facility ({reservations.length})
        </h3>
        {reservations.length === 0 ? (
          <div className="text-xs text-slate-500 py-4 text-center">No active holds for this hospital.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 font-mono text-slate-500 text-[11px]">
                  <th className="pb-2">Reservation ID</th>
                  <th className="pb-2">Resource</th>
                  <th className="pb-2">Request</th>
                  <th className="pb-2">State</th>
                  <th className="pb-2">Expires At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {reservations.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2.5 font-mono text-amber-400">{r.id}</td>
                    <td className="py-2.5 font-mono">{r.resource_type}</td>
                    <td className="py-2.5 font-mono text-slate-400">{r.request_id}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-400 border border-amber-800">
                        {r.state}
                      </span>
                    </td>
                    <td className="py-2.5 font-mono text-slate-500">
                      {new Date(r.expires_at_ms).toLocaleTimeString()}
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
