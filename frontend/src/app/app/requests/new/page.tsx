'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Clock, 
  MapPin, 
  Bed, 
  AlertTriangle, 
  Activity, 
  ArrowLeft, 
  Zap, 
  CheckCircle2, 
  Layers, 
  ShieldCheck,
  Send
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

const LOCATION_PRESETS = [
  { label: 'Sector 17 Bus Stand, Chandigarh', lat: 30.7398, lng: 76.7827 },
  { label: 'Phase 7 Industrial Area, Mohali', lat: 30.7046, lng: 76.7179 },
  { label: 'Sector 5 Urban Estate, Panchkula', lat: 30.6942, lng: 76.8534 },
  { label: 'Zirakpur Flyover Junction', lat: 30.6425, lng: 76.8173 },
  { label: 'Sukhna Lake Promenade', lat: 30.7421, lng: 76.8188 }
];

export default function NewEmergencyRequestPage() {
  const router = useRouter();

  const [patientAge, setPatientAge] = useState(48);
  const [traumaScore, setTraumaScore] = useState(4); // 1 = minimal, 5 = critical resuscitation
  const [requiredResource, setRequiredResource] = useState('ICU-BED');
  const [requireVentilator, setRequireVentilator] = useState(false);
  const [originLat, setOriginLat] = useState(30.7398);
  const [originLng, setOriginLng] = useState(76.7827);
  const [ambulanceId, setAmbulanceId] = useState(`AMB-108-${Math.floor(10 + Math.random() * 89)}`);
  const [idempotencyKey, setIdempotencyKey] = useState(`IDEM-${Date.now()}-${Math.floor(Math.random() * 1000)}`);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Build resource lines
      const resourceLines = [{ resource_type: requiredResource, quantity: 1 }];
      if (requireVentilator && requiredResource !== 'VENTILATOR') {
        resourceLines.push({ resource_type: 'VENTILATOR', quantity: 1 });
      }

      const res = await fetchApi<{ request_id: string; allocation: any }>('/api/v2/requests', {
        method: 'POST',
        headers: {
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          patient_age: Number(patientAge),
          trauma_score: Number(traumaScore),
          required_resource: requiredResource,
          origin_latitude: Number(originLat),
          origin_longitude: Number(originLng),
          ambulance_id: ambulanceId,
          resource_lines: resourceLines
        })
      });

      if (res.allocation && res.allocation.success) {
        router.push(`/app/requests/${res.request_id}/allocation`);
      } else {
        router.push(`/app/requests/${res.request_id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Dispatch allocation failed. Check hospital capacity.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/app/requests"
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Requests Log</span>
        </Link>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 shadow-xl">
        <div className="border-b border-slate-800 pb-5 mb-6">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-red-500 animate-pulse" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Create Emergency Dispatch Request
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Transmits real-time patient acuity, GPS coordinates, and required resources to the C++17 Allocation Engine.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Acuity Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-400" />
              Patient Clinical Acuity & Triage Rating
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Patient Age
                </label>
                <input
                  type="number"
                  min="0"
                  max="125"
                  required
                  value={patientAge}
                  onChange={(e) => setPatientAge(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span className="font-semibold uppercase tracking-wider">Trauma Acuity Score (1 - 5)</span>
                  <span className="font-mono text-white font-bold">{traumaScore} / 5</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={traumaScore}
                  onChange={(e) => setTraumaScore(parseInt(e.target.value, 10))}
                  className="w-full accent-red-500 bg-slate-950 rounded cursor-pointer mt-1"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>1: Non-urgent</span>
                  <span>3: Urgent</span>
                  <span>5: Immediate Resuscitation</span>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Primary Required Resource
                </label>
                <select
                  value={requiredResource}
                  onChange={(e) => setRequiredResource(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-red-500 font-mono"
                >
                  <option value="ICU-BED">ICU-BED — Intensive Care Resuscitation Bed</option>
                  <option value="VENTILATOR">VENTILATOR — Mechanical Invasive Ventilator</option>
                  <option value="OXYGEN-BED">OXYGEN-BED — High-Flow Oxygen Support</option>
                  <option value="WARD-BED">WARD-BED — Inpatient General Medical Ward</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="flex items-center gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                  <input
                    type="checkbox"
                    checked={requireVentilator}
                    onChange={(e) => setRequireVentilator(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-red-600 focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white">Require Simultaneous Ventilator Line</span>
                    <p className="text-[11px] text-slate-400">
                      Executes multi-resource atomic reservation hold across both ICU bed and ventilator.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Location & Ambulance Section */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-400" />
              Incident Coordinates & Ambulance Unit
            </h3>

            {/* Presets */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Tricity Geographic Presets
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {LOCATION_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => { setOriginLat(p.lat); setOriginLng(p.lng); }}
                    className={`p-2 rounded-lg border text-xs text-left transition cursor-pointer flex items-center justify-between ${
                      originLat === p.lat && originLng === p.lng
                        ? 'border-sky-500/50 bg-sky-950/30 text-sky-200'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-850 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{p.label}</span>
                    <span className="font-mono text-[10px] text-slate-500 shrink-0">
                      {p.lat.toFixed(3)}, {p.lng.toFixed(3)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Incident Latitude
                </label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={originLat}
                  onChange={(e) => setOriginLat(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Incident Longitude
                </label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={originLng}
                  onChange={(e) => setOriginLng(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Ambulance Call Sign
                </label>
                <input
                  type="text"
                  required
                  value={ambulanceId}
                  onChange={(e) => setAmbulanceId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-red-500"
                />
              </div>
            </div>
          </div>

          {/* Idempotency Section */}
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-semibold uppercase tracking-wider">Network Idempotency Key</span>
              <span className="font-mono text-[10px] text-slate-500">24-hour deduplication</span>
            </div>
            <input
              type="text"
              readOnly
              value={idempotencyKey}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 font-mono select-all"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-6 border-t border-slate-800 flex items-center justify-end gap-3">
            <Link
              href="/app/requests"
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20 transition cursor-pointer"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Executing Allocation Pipeline...' : 'Allocate Hospital & Create Hold'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
