'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Activity, 
  MapPin, 
  Building2, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Send,
  Sparkles,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { fetchApi, Hospital, Reservation, EmergencyRequest } from '@/lib/api';

export default function AppDashboard() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form State for Quick Dispatch Test
  const [age, setAge] = useState(48);
  const [trauma, setTrauma] = useState(4);
  const [resource, setResource] = useState('ICU-BED');
  const [lat, setLat] = useState(30.7333);
  const [lon, setLon] = useState(76.7794);
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [lastAllocation, setLastAllocation] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [hospRes, resRes, reqRes, statsRes] = await Promise.all([
        fetchApi<{ data: Hospital[] }>('/api/v2/hospitals'),
        fetchApi<{ data: Reservation[] }>('/api/v2/reservations'),
        fetchApi<{ data: EmergencyRequest[] }>('/api/v2/requests'),
        fetchApi<any>('/api/v2/observability/stats')
      ]);
      setHospitals(hospRes.data);
      setReservations(resRes.data);
      setRequests(reqRes.data);
      setStats(statsRes);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to connect to Lifeline-Core backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // 10s auto refresh
    return () => clearInterval(interval);
  }, []);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setDispatchLoading(true);
      const res = await fetchApi<any>('/api/v2/requests', {
        method: 'POST',
        body: JSON.stringify({
          patient_age: Number(age),
          trauma_score: Number(trauma),
          required_resource: resource,
          origin_latitude: Number(lat),
          origin_longitude: Number(lon),
          ambulance_id: `AMB-${Math.floor(100 + Math.random() * 900)}`,
          policy: 'LIFELINE_CORE'
        })
      });
      setLastAllocation(res.allocation);
      loadData();
    } catch (err: any) {
      alert(`Allocation Failed: ${err.message}`);
    } finally {
      setDispatchLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-red-500" />
            Operational Command Center
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time emergency hospital resource grid across Chandigarh, Mohali, and Panchkula
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh State
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}. Make sure the Fastify backend and C++ engine are running.</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>HOSPITALS MONITORED</span>
            <Building2 className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{hospitals.length || 50}</div>
          <div className="text-[11px] text-slate-500">Tricity regional coverage</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>ACTIVE HOLDS (HELD)</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {stats?.reservations_held ?? reservations.filter(r => r.state === 'HELD').length}
          </div>
          <div className="text-[11px] text-slate-500">Beds atomically locked</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>CONFIRMED ADMISSIONS</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {stats?.reservations_confirmed ?? reservations.filter(r => r.state === 'CONFIRMED').length}
          </div>
          <div className="text-[11px] text-slate-500">Successful arrivals</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>TOTAL REQUESTS</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-slate-200">
            {stats?.requests_total ?? requests.length}
          </div>
          <div className="text-[11px] text-slate-500">Emergency stream</div>
        </div>
      </div>

      {/* Main Grid: Interactive Dispatch Tester & Recent Allocations */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Interactive Dispatch Tester */}
        <div className="lg:col-span-1 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
          <div className="space-y-1 border-b border-slate-800 pb-4">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-400" />
              Live Emergency Dispatch
            </h2>
            <p className="text-xs text-slate-400">
              Submit a live request to execute the C++17 ranking and atomic reservation pipeline.
            </p>
          </div>

          <form onSubmit={handleDispatch} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Patient Age</label>
              <input
                type="number"
                min="1"
                max="105"
                value={age}
                onChange={(e) => setAge(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Trauma Severity: <span className="font-bold text-red-400">Level {trauma}</span>
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={trauma}
                onChange={(e) => setTrauma(parseInt(e.target.value, 10))}
                className="w-full accent-red-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>1 (Mild)</span>
                <span>3 (Serious)</span>
                <span>5 (Critical)</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Required Resource</label>
              <select
                value={resource}
                onChange={(e) => setResource(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="ICU-BED">ICU-BED</option>
                <option value="VENTILATOR">VENTILATOR</option>
                <option value="OXYGEN-BED">OXYGEN-BED</option>
                <option value="GENERAL-BED">GENERAL-BED</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Origin Lat</label>
                <input
                  type="number"
                  step="0.001"
                  value={lat}
                  onChange={(e) => setLat(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Origin Lon</label>
                <input
                  type="number"
                  step="0.001"
                  value={lon}
                  onChange={(e) => setLon(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={dispatchLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition shadow-lg shadow-red-600/20 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {dispatchLoading ? 'Computing Allocation...' : 'Dispatch with Lifeline Hold'}
            </button>
          </form>

          {/* Result Card */}
          {lastAllocation && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ALLOCATION SECURED
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {lastAllocation.decision_latency_us} &mu;s
                </span>
              </div>
              <div>
                <div className="text-base font-bold text-slate-100">
                  {lastAllocation.chosen_hospital_name}
                </div>
                <div className="text-xs text-slate-400">
                  ID: {lastAllocation.chosen_hospital_id} • Hold: <code className="text-amber-400 font-mono">{lastAllocation.allocation_id}</code>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                <div>
                  <div className="text-[10px] text-slate-500">Road ETA</div>
                  <div className="font-semibold text-slate-200">
                    {(lastAllocation.eta_seconds / 60).toFixed(1)}m
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Distance</div>
                  <div className="font-semibold text-slate-200">
                    {lastAllocation.distance_km?.toFixed(1)} km
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">P(Free)</div>
                  <div className="font-semibold text-emerald-400">
                    {((lastAllocation.p_free_on_arrival || 1) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Hospitals & Active Holds */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Reservations Widget */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-slate-100">Active Reservation Ledger Holds</h3>
              </div>
              <Link href="/app/reservations" className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1">
                View all holds <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {reservations.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No active reservations currently held. Use the dispatch form to trigger an atomic hold.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800 font-mono text-[11px]">
                      <th className="pb-2">Hold ID</th>
                      <th className="pb-2">Hospital</th>
                      <th className="pb-2">Resource</th>
                      <th className="pb-2">State</th>
                      <th className="pb-2">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {reservations.slice(0, 5).map((r) => (
                      <tr key={r.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 font-mono text-amber-400 font-medium">{r.id}</td>
                        <td className="py-2.5">{r.hospital_id}</td>
                        <td className="py-2.5 font-mono text-slate-400">{r.resource_type}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                            r.state === 'HELD' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                            r.state === 'CONFIRMED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {r.state}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-500 font-mono">
                          {new Date(r.created_at_ms).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick System Navigation Cards */}
          <div className="grid sm:grid-cols-3 gap-4">
            <Link
              href="/app/map"
              className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition group space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <MapPin className="w-5 h-5 text-sky-400" />
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition" />
              </div>
              <div className="font-semibold text-sm text-slate-200">Tricity Map</div>
              <div className="text-xs text-slate-400">View 50 hospitals with live pins on Leaflet.</div>
            </Link>

            <Link
              href="/app/simulator"
              className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition group space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <Cpu className="w-5 h-5 text-red-400" />
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition" />
              </div>
              <div className="font-semibold text-sm text-slate-200">Simulation Controls</div>
              <div className="text-xs text-slate-400">Run contention surges and chaos feed freezes.</div>
            </Link>

            <Link
              href="/app/experiments"
              className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition group space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <Activity className="w-5 h-5 text-emerald-400" />
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition" />
              </div>
              <div className="font-semibold text-sm text-slate-200">Policy Evaluation</div>
              <div className="text-xs text-slate-400">Review 20-seed comparison benchmarks.</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
