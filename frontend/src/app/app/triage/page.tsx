'use client';

import React, { useState, useEffect } from 'react';
import { 
  ListOrdered, 
  Clock, 
  RotateCcw, 
  Plus, 
  TrendingUp, 
  ShieldAlert, 
  CheckCircle2, 
  Info, 
  HeartPulse,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface TriageItem {
  request_id: string;
  patient_age: number;
  trauma_score: number;
  required_resource: string;
  base_priority: number;
  effective_priority: number;
  wait_time_seconds: number;
  enqueued_at_ms: number;
}

export default function TriagePage() {
  const [queue, setQueue] = useState<TriageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enqueuing, setEnqueuing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  // New request form state
  const [age, setAge] = useState<number>(45);
  const [traumaScore, setTraumaScore] = useState<number>(85);
  const [resourceType, setResourceType] = useState<string>('ICU_VENTILATOR');
  const [lat, setLat] = useState<number>(30.7333);
  const [lon, setLon] = useState<number>(76.7794);

  const loadQueue = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<{ count: number; aging_policy: string; data: TriageItem[] }>('/api/v2/triage');
      // Sort by effective priority ascending (1 = highest urgency)
      const sorted = [...(res.data || [])].sort((a, b) => a.effective_priority - b.effective_priority);
      setQueue(sorted);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch triage queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
    // Refresh queue every 3 seconds to observe dynamic aging in real time
    const interval = setInterval(() => {
      fetchApi<{ count: number; aging_policy: string; data: TriageItem[] }>('/api/v2/triage')
        .then(res => {
          if (res && res.data) {
            setQueue([...res.data].sort((a, b) => a.effective_priority - b.effective_priority));
          }
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleEnqueue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setEnqueuing(true);
      // Dispatch via requests API
      await fetchApi('/api/v2/requests', {
        method: 'POST',
        body: JSON.stringify({
          patient_age: Number(age),
          trauma_score: Number(traumaScore),
          required_resource: resourceType,
          origin_latitude: Number(lat),
          origin_longitude: Number(lon)
        })
      });
      setFormOpen(false);
      await loadQueue();
    } catch (err: any) {
      alert(`Enqueue error: ${err.message}`);
    } finally {
      setEnqueuing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <ListOrdered className="w-6 h-6 text-sky-400" />
              Dynamic Triage Queue
            </h1>
            <span className="px-2 py-0.5 text-xs font-mono bg-sky-950 text-sky-300 border border-sky-800 rounded">
              Starvation Prevention
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time priority queue featuring continuous aging ($P_{'{eff}'} = P_{'{base}'} - \lfloor \Delta t / \tau \rfloor$). Prevents low-urgency starvation during surges.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFormOpen(!formOpen)}
            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Enqueue Emergency Request
          </button>
          <button
            onClick={loadQueue}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium rounded-lg flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Enqueue Form Modal / Drawer */}
      {formOpen && (
        <div className="bg-slate-900 border border-sky-900/50 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-rose-500" />
              Dispatch Emergency Patient into Triage Engine
            </h2>
            <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-white text-xs">
              ✕ Close
            </button>
          </div>

          <form onSubmit={handleEnqueue} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Patient Age</label>
              <input
                type="number"
                min="1"
                max="105"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Trauma Score (1 - 100)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={traumaScore}
                onChange={(e) => setTraumaScore(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                required
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">&gt;80: Priority 1 (Resuscitation)</span>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Required Resource</label>
              <select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
              >
                <option value="ICU_VENTILATOR">ICU Ventilator</option>
                <option value="OXYGEN_BED">Oxygen Bed</option>
                <option value="TRAUMA_OT">Trauma OT</option>
                <option value="ISOLATION_WARD">Isolation Ward</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Incident Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={lat}
                onChange={(e) => setLat(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Incident Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={lon}
                onChange={(e) => setLon(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                required
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={enqueuing}
                className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg transition disabled:opacity-50"
              >
                {enqueuing ? 'Submitting...' : 'Submit to Engine'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Algorithm Mechanics Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-sky-400" />
            The Starvation Problem
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            In static priority queues, a continuous influx of Level 1 (Resuscitation) patients causes Level 3 (Urgent) patients to wait indefinitely, potentially deteriorating fatally.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-emerald-400" />
            Aging Function
          </div>
          <p className="text-xs text-slate-400 leading-relaxed font-mono">
            P_eff = P_base - floor(Δt / 30s)
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every 30 seconds of waiting advances priority rank by 1 level, guaranteeing bounded maximum latency (T_max &le; 120s).
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            Complexity Guarantees
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            <strong>Heap Insertion:</strong> $O(\log N)$<br />
            <strong>Top Peek:</strong> $O(1)$<br />
            <strong>Periodic Heapify:</strong> $O(N)$ batch update interval.
          </p>
        </div>
      </div>

      {/* Triage Queue Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-white">Active Dispatch Queue</span>
            <span className="px-2 py-0.5 text-xs font-mono bg-slate-800 text-slate-300 rounded">
              {queue.length} In Queue
            </span>
          </div>
          <span className="text-xs text-slate-500">Auto-refreshing every 3s</span>
        </div>

        {loading && queue.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <RotateCcw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
            Connecting to C++ engine triage queue...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 text-sm">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
            {error}
          </div>
        ) : queue.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm space-y-2">
            <div>All emergency requests have been dispatched and allocated!</div>
            <p className="text-xs text-slate-500">Use the "Enqueue Emergency Request" button above or trigger a simulation run to inject workload.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4">Queue Rank</th>
                  <th className="py-3 px-4">Request ID</th>
                  <th className="py-3 px-4">Patient / Trauma</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">Base Priority</th>
                  <th className="py-3 px-4">Wait Time</th>
                  <th className="py-3 px-4">Effective Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {queue.map((item, idx) => {
                  const priorityPromoted = item.effective_priority < item.base_priority;

                  return (
                    <tr key={item.request_id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                            idx === 0 
                              ? 'bg-rose-600 text-white shadow-sm' 
                              : idx === 1 
                              ? 'bg-amber-600 text-white' 
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {idx + 1}
                          </span>
                          {idx === 0 && (
                            <span className="text-[10px] text-rose-400 font-semibold uppercase tracking-wider">
                              Next
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-medium text-sky-400">
                        {item.request_id}
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-white font-medium">{item.patient_age} yrs</div>
                        <div className="text-[11px] text-slate-400">Trauma score: {item.trauma_score}/100</div>
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                          {item.required_resource}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <span className="px-2 py-0.5 rounded bg-slate-800/60 text-slate-400 border border-slate-700">
                          P{item.base_priority}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.wait_time_seconds}s</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded font-bold border ${
                            item.effective_priority <= 1 
                              ? 'bg-rose-950/80 text-rose-300 border-rose-800' 
                              : item.effective_priority <= 2 
                              ? 'bg-amber-950/80 text-amber-300 border-amber-800' 
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                            P{item.effective_priority}
                          </span>
                          {priorityPromoted && (
                            <span className="text-[10px] text-emerald-400 flex items-center font-sans font-semibold">
                              ▲ Aged
                            </span>
                          )}
                        </div>
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
