'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  ArrowLeft, 
  Bed, 
  Edit3, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { fetchApi, Hospital } from '@/lib/api';

export default function HospitalResourcesPage() {
  const params = useParams();
  const hospitalId = params.hospitalId as string;

  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingResource, setEditingResource] = useState<string | null>(null);
  const [editTotal, setEditTotal] = useState(0);
  const [editAvailable, setEditAvailable] = useState(0);
  const [updating, setUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<{ data: Hospital }>(`/api/v2/hospitals/${hospitalId}`);
      setHospital(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [hospitalId]);

  const openEditModal = (resType: string, currentTotal: number, currentAvailable: number) => {
    setEditingResource(resType);
    setEditTotal(currentTotal);
    setEditAvailable(currentAvailable);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResource) return;
    try {
      setUpdating(true);
      await fetchApi(`/api/v2/hospitals/${hospitalId}/resources`, {
        method: 'POST',
        body: JSON.stringify({
          resource_type: editingResource,
          total_capacity: Number(editTotal),
          available_capacity: Number(editAvailable)
        })
      });
      setSuccessMsg(`Successfully updated capacity for ${editingResource}.`);
      setEditingResource(null);
      await loadData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Resource update error: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-nav header */}
      <div className="space-y-2">
        <Link href={`/app/hospitals/${hospitalId}`} className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Facility Overview
        </Link>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Bed className="w-5 h-5 text-emerald-400" />
              Granular Resource Inventory Management
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Facility: {hospital?.name || hospitalId} ({hospitalId})
            </p>
          </div>

          {/* Sub-route tabs */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
            <Link href={`/app/hospitals/${hospitalId}`} className="px-3 py-1.5 rounded text-slate-400 hover:text-white transition">
              Overview
            </Link>
            <Link href={`/app/hospitals/${hospitalId}/resources`} className="px-3 py-1.5 rounded bg-slate-800 text-white font-medium">
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
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading || !hospital ? (
          <div className="col-span-2 p-12 text-center text-slate-500 font-mono text-sm">
            Loading resource inventory...
          </div>
        ) : (
          Object.entries(hospital.resources || {}).map(([resType, data]) => {
            const utilPct = data.total > 0 ? Math.round(((data.total - data.available) / data.total) * 100) : 0;
            return (
              <div key={resType} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white font-mono">{resType}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      data.available > 0
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                        : 'bg-rose-950/60 text-rose-400 border-rose-800'
                    }`}>
                      {data.available > 0 ? `${data.available} Free` : 'Exhausted'}
                    </span>
                  </div>

                  <button
                    onClick={() => openEditModal(resType, data.total, data.available)}
                    className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 bg-slate-800 px-2.5 py-1.5 rounded border border-slate-700 transition cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Adjust Capacity</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase">Total</div>
                    <div className="text-lg font-bold text-white font-mono">{data.total}</div>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-emerald-400 uppercase">Available</div>
                    <div className="text-lg font-bold text-emerald-400 font-mono">{data.available}</div>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-amber-400 uppercase">Reserved</div>
                    <div className="text-lg font-bold text-amber-400 font-mono">{data.reserved}</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Utilization</span>
                    <span className="font-mono">{utilPct}%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all ${
                        utilPct > 85 ? 'bg-red-500' : utilPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${utilPct}%` }}
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between pt-1">
                  <span>Last sync: {data.last_report_timestamp ? new Date(data.last_report_timestamp).toLocaleTimeString() : 'Baseline'}</span>
                  <span>Authoritative PostgreSQL Row</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Modal */}
      {editingResource && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">
              Adjust {editingResource} Capacity
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-mono">
              Updates PostgreSQL `hospital_resources` and syncs in-memory C++ engine ResourceStore.
            </p>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Total Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editTotal}
                  onChange={(e) => setEditTotal(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Available (Free) Capacity
                </label>
                <input
                  type="number"
                  min="0"
                  max={editTotal}
                  required
                  value={editAvailable}
                  onChange={(e) => setEditAvailable(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingResource(null)}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-500 transition cursor-pointer"
                >
                  {updating ? 'Persisting...' : 'Save Capacity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
