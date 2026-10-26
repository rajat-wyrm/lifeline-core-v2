'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Search, 
  Filter, 
  ArrowUpRight, 
  RefreshCw, 
  AlertCircle,
  Clock,
  Radio
} from 'lucide-react';
import { fetchApi, Hospital } from '@/lib/api';
import { formatTimeAgo, getFreshnessBadge } from '@/lib/utils';

export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedHospId, setFeedHospId] = useState('HOSP-101');
  const [feedResource, setFeedResource] = useState('ICU-BED');
  const [feedCount, setFeedCount] = useState(15);
  const [feedSuccess, setFeedSuccess] = useState<string | null>(null);

  const loadHospitals = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<{ data: Hospital[] }>('/api/v2/hospitals');
      setHospitals(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHospitals();
  }, []);

  const handleSendFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchApi<any>('/api/v2/hospitals/feed', {
        method: 'POST',
        body: JSON.stringify({
          hospital_id: feedHospId,
          resource_type: feedResource,
          reported_free: Number(feedCount),
          report_timestamp_ms: Date.now()
        })
      });
      setFeedSuccess(`Feed applied for ${feedHospId} (${feedResource}: ${feedCount} free).`);
      loadHospitals();
      setTimeout(() => setFeedSuccess(null), 4000);
    } catch (err: any) {
      alert(`Feed update error: ${err.message}`);
    }
  };

  const filtered = hospitals.filter(h => 
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-sky-400" />
            Hospital Resource Inventory
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time capacity tracking, atomic hold state, and report freshness across 50 Tricity facilities
          </p>
        </div>

        <button
          onClick={loadHospitals}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Live Feed Injection Bar */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            Simulate Hospital Availability Feed Update
          </span>
          {feedSuccess && (
            <span className="text-emerald-400 font-mono text-[11px]">{feedSuccess}</span>
          )}
        </div>

        <form onSubmit={handleSendFeed} className="grid sm:grid-cols-5 gap-3 text-xs">
          <div>
            <select
              value={feedHospId}
              onChange={(e) => setFeedHospId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200"
            >
              {hospitals.map(h => (
                <option key={h.id} value={h.id}>{h.id} - {h.name.slice(0, 24)}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={feedResource}
              onChange={(e) => setFeedResource(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200"
            >
              <option value="ICU-BED">ICU-BED</option>
              <option value="VENTILATOR">VENTILATOR</option>
              <option value="OXYGEN-BED">OXYGEN-BED</option>
              <option value="GENERAL-BED">GENERAL-BED</option>
            </select>
          </div>

          <div>
            <input
              type="number"
              min="0"
              max="200"
              value={feedCount}
              onChange={(e) => setFeedCount(parseInt(e.target.value, 10))}
              placeholder="Reported Free"
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full py-1.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium transition"
            >
              Broadcast Feed Update (Syncs DB &amp; C++ Engine)
            </button>
          </div>
        </form>
      </div>

      {/* Search Input */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by hospital name or ID (e.g. PGIMER, HOSP-101)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          />
        </div>
        <span className="text-xs text-slate-500 font-mono">
          Showing {filtered.length} of {hospitals.length} facilities
        </span>
      </div>

      {/* Hospitals Table */}
      <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/60 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-mono text-[11px]">
                <th className="py-3 px-4">Hospital Name &amp; ID</th>
                <th className="py-3 px-4">Coordinates</th>
                <th className="py-3 px-4 text-center">ICU Capacity</th>
                <th className="py-3 px-4 text-center">Ventilators</th>
                <th className="py-3 px-4 text-center">Oxygen Beds</th>
                <th className="py-3 px-4 text-center">General Beds</th>
                <th className="py-3 px-4 text-center">Freshness</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.map(h => {
                const icu = h.resources?.['ICU-BED'] || { total: 0, available: 0, reserved: 0, last_report_timestamp: 0 };
                const vent = h.resources?.['VENTILATOR'] || { total: 0, available: 0, reserved: 0, last_report_timestamp: 0 };
                const oxy = h.resources?.['OXYGEN-BED'] || { total: 0, available: 0, reserved: 0, last_report_timestamp: 0 };
                const gen = h.resources?.['GENERAL-BED'] || { total: 0, available: 0, reserved: 0, last_report_timestamp: 0 };

                // Calculate freshness relative to last report
                const ageMs = icu.last_report_timestamp ? Date.now() - icu.last_report_timestamp : 3600000;
                const freshScore = Math.max(0, 1.0 - (ageMs / 3600000));
                const badge = getFreshnessBadge(freshScore);

                return (
                  <tr key={h.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-100">{h.name}</div>
                      <div className="text-[10px] font-mono text-slate-500">
                        {h.id} • &lambda;={h.walk_in_lambda.toFixed(2)}/min
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {h.latitude.toFixed(4)}, {h.longitude.toFixed(4)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded font-mono font-medium ${
                        icu.available > 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'bg-red-950 text-red-400 border border-red-800/60'
                      }`}>
                        {icu.available} / {icu.total}
                      </span>
                      {icu.reserved > 0 && (
                        <div className="text-[10px] text-amber-400 font-mono mt-0.5">
                          {icu.reserved} held
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center font-mono">
                      <span className="text-slate-200">{vent.available}</span>
                      <span className="text-slate-500"> / {vent.total}</span>
                    </td>

                    <td className="py-3 px-4 text-center font-mono">
                      <span className="text-slate-200">{oxy.available}</span>
                      <span className="text-slate-500"> / {oxy.total}</span>
                    </td>

                    <td className="py-3 px-4 text-center font-mono">
                      <span className="text-slate-200">{gen.available}</span>
                      <span className="text-slate-500"> / {gen.total}</span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium font-mono ${badge.color}`}>
                        {badge.label}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {formatTimeAgo(icu.last_report_timestamp)}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/app/hospitals/${h.id}`}
                        className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-medium text-xs hover:underline"
                      >
                        Inspect
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
