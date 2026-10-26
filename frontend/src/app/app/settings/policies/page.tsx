'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Sliders, 
  ArrowLeft, 
  Save, 
  CheckCircle2, 
  RotateCcw, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  BarChart3,
  Cpu 
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function PolicyTuningPage() {
  const [etaWeight, setEtaWeight] = useState(40);
  const [availWeight, setAvailWeight] = useState(30);
  const [freshWeight, setFreshWeight] = useState(15);
  const [poissonWeight, setPoissonWeight] = useState(15);

  const [tauSeconds, setTauSeconds] = useState(30);
  const [maxAgingPromotion, setMaxAgingPromotion] = useState(4);
  const [ttlSlackMinutes, setTtlSlackMinutes] = useState(10);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchApi<{ data: any[] }>('/api/v2/settings')
      .then(res => {
        const sw = res.data.find(s => s.key === 'scoring_weights');
        if (sw && sw.value) {
          setEtaWeight(sw.value.eta || 40);
          setAvailWeight(sw.value.available || 30);
          setFreshWeight(sw.value.freshness || 15);
          setPoissonWeight(sw.value.poisson || 15);
        }
        const ap = res.data.find(s => s.key === 'aging_policy');
        if (ap && ap.value) {
          setTauSeconds(ap.value.tau_seconds || 30);
          setMaxAgingPromotion(ap.value.max_aging_promotion || 4);
        }
        const ts = res.data.find(s => s.key === 'ttl_slack');
        if (ts && ts.value) {
          setTtlSlackMinutes(ts.value.slack_minutes || 10);
        }
      })
      .catch(console.error);
  }, []);

  const totalWeight = etaWeight + availWeight + freshWeight + poissonWeight;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalWeight !== 100) {
      alert(`Utility weights must sum to 100% (currently ${totalWeight}%).`);
      return;
    }

    try {
      setSaving(true);
      await fetchApi('/api/v2/settings', {
        method: 'POST',
        body: JSON.stringify({
          key: 'scoring_weights',
          value: {
            eta: etaWeight,
            available: availWeight,
            freshness: freshWeight,
            poisson: poissonWeight
          }
        })
      });

      await fetchApi('/api/v2/settings', {
        method: 'POST',
        body: JSON.stringify({
          key: 'aging_policy',
          value: {
            tau_seconds: tauSeconds,
            max_aging_promotion: maxAgingPromotion
          }
        })
      });

      await fetchApi('/api/v2/settings', {
        method: 'POST',
        body: JSON.stringify({
          key: 'ttl_slack',
          value: {
            slack_minutes: ttlSlackMinutes
          }
        })
      });

      setSuccess('Policy configuration persisted and broadcasted to C++ engine.');
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = () => {
    setEtaWeight(40);
    setAvailWeight(30);
    setFreshWeight(15);
    setPoissonWeight(15);
    setTauSeconds(30);
    setMaxAgingPromotion(4);
    setTtlSlackMinutes(10);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <Link href="/app/settings" className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Settings Hub
        </Link>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-purple-400" />
              Dynamic Allocation Policies & Scoring Weights
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Configure candidate utility factors, starvation prevention aging rates, and reservation TTL buffer slack.
            </p>
          </div>

          <button
            type="button"
            onClick={resetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
        </div>
      </div>

      {success && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Candidate Utility Weights */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sky-400" />
              Multi-Criteria Utility Scoring Weights
            </h3>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
              totalWeight === 100
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                : 'bg-rose-950 text-rose-300 border-rose-800'
            }`}>
              Total: {totalWeight}% {totalWeight === 100 ? '(Valid)' : '(Must sum to 100%)'}
            </span>
          </div>

          <div className="space-y-4">
            {/* ETA Weight */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span className="font-semibold">Road-Network ETA Distance Weight (&alpha;)</span>
                <span className="font-mono text-sky-400 font-bold">{etaWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={etaWeight}
                onChange={(e) => setEtaWeight(parseInt(e.target.value, 10))}
                className="w-full accent-sky-500 bg-slate-950 rounded cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-0.5">Penalizes transit time across Dijkstra / A* road network.</p>
            </div>

            {/* Availability Weight */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span className="font-semibold">Available Capacity Headroom Weight (&beta;)</span>
                <span className="font-mono text-emerald-400 font-bold">{availWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={availWeight}
                onChange={(e) => setAvailWeight(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-500 bg-slate-950 rounded cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-0.5">Rewards facilities with surplus unreserved bed inventory.</p>
            </div>

            {/* Freshness Weight */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span className="font-semibold">Telemetry Freshness Age Penalty (&gamma;)</span>
                <span className="font-mono text-amber-400 font-bold">{freshWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={freshWeight}
                onChange={(e) => setFreshWeight(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 bg-slate-950 rounded cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-0.5">Penalizes stale reporting feeds to avoid phantom availability.</p>
            </div>

            {/* Poisson Weight */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span className="font-semibold">Poisson Walk-In Survival Probability (&delta;)</span>
                <span className="font-mono text-purple-400 font-bold">{poissonWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={poissonWeight}
                onChange={(e) => setPoissonWeight(parseInt(e.target.value, 10))}
                className="w-full accent-purple-500 bg-slate-950 rounded cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-0.5">Rewards facilities with high walk-in survival headroom P(X(t) &lt; a).</p>
            </div>
          </div>
        </div>

        {/* Section 2: Starvation Aging & TTL Slack */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <Clock className="w-4 h-4 text-amber-400" />
            Triage Aging Parameters & Reservation Slack
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Aging Window (&tau; seconds)
              </label>
              <input
                type="number"
                min="5"
                max="120"
                required
                value={tauSeconds}
                onChange={(e) => setTauSeconds(parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-red-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Seconds of wait before effective priority increases by +1.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Max Aging Promotion
              </label>
              <input
                type="number"
                min="1"
                max="5"
                required
                value={maxAgingPromotion}
                onChange={(e) => setMaxAgingPromotion(parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-red-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Ceiling on priority promotion steps.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                TTL Slack Buffer (&delta;_slack min)
              </label>
              <input
                type="number"
                min="2"
                max="30"
                required
                value={ttlSlackMinutes}
                onChange={(e) => setTtlSlackMinutes(parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-red-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Buffer added to transit ETA for hold expiration.</p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || totalWeight !== 100}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Persisting Policies...' : 'Save Configuration Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
