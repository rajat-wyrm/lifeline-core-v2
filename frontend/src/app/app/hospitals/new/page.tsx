'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  MapPin, 
  Bed, 
  Activity, 
  ShieldCheck, 
  AlertCircle, 
  ArrowLeft, 
  Save, 
  Plus
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function NewHospitalPage() {
  const router = useRouter();
  const [id, setId] = useState(`HOSP-${Math.floor(120 + Math.random() * 80)}`);
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState(30.7333);
  const [longitude, setLongitude] = useState(76.7794);
  const [walkInLambda, setWalkInLambda] = useState(0.05);

  // Capacities
  const [icuTotal, setIcuTotal] = useState(20);
  const [icuFree, setIcuFree] = useState(6);
  const [ventTotal, setVentTotal] = useState(12);
  const [ventFree, setVentFree] = useState(4);
  const [oxyTotal, setOxyTotal] = useState(30);
  const [oxyFree, setOxyFree] = useState(12);
  const [wardTotal, setWardTotal] = useState(80);
  const [wardFree, setWardFree] = useState(25);

  // Capabilities
  const [traumaLevel, setTraumaLevel] = useState<'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3'>('LEVEL_2');
  const [hasPediatricIcu, setHasPediatricIcu] = useState(false);
  const [hasCardiacCathLab, setHasCardiacCathLab] = useState(false);
  const [hasBurnUnit, setHasBurnUnit] = useState(false);
  const [hasHelipad, setHasHelipad] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await fetchApi('/api/v2/hospitals', {
        method: 'POST',
        body: JSON.stringify({
          id,
          name,
          latitude: Number(latitude),
          longitude: Number(longitude),
          walk_in_lambda: Number(walkInLambda),
          resources: {
            'ICU-BED': { total: Number(icuTotal), available: Number(icuFree) },
            'VENTILATOR': { total: Number(ventTotal), available: Number(ventFree) },
            'OXYGEN-BED': { total: Number(oxyTotal), available: Number(oxyFree) },
            'WARD-BED': { total: Number(wardTotal), available: Number(wardFree) }
          },
          capabilities: {
            trauma_center_level: traumaLevel,
            has_pediatric_icu: hasPediatricIcu,
            has_cardiac_cath_lab: hasCardiacCathLab,
            has_burn_unit: hasBurnUnit,
            has_helipad: hasHelipad
          }
        })
      });

      router.push(`/app/hospitals/${id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to register hospital facility.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/app/hospitals"
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Hospitals Directory</span>
        </Link>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 shadow-xl">
        <div className="border-b border-slate-800 pb-5 mb-6">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-red-500" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Register New Tricity Healthcare Facility
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Provisions a new hospital node into the authoritative PostgreSQL store, C++ allocation engine, and spatial road index.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Identity & Location */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-400" />
              Facility Identification & Coordinates
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Facility ID (Unique)
                </label>
                <input
                  type="text"
                  required
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  placeholder="e.g. HOSP-125"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-red-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Facility Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Max Super Speciality Hospital Mohali"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-red-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Latitude (Tricity Range 30.6 - 30.8)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-red-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Longitude (Tricity Range 76.6 - 76.9)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-red-500 transition"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Poisson Walk-in Arrival Rate (&lambda; arrivals / min)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="0.5"
                  required
                  value={walkInLambda}
                  onChange={(e) => setWalkInLambda(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-red-500 transition"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Used by C++ Belief State Calculator for uncoordinated walk-in consumption modeling.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Resource Capacities */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Bed className="w-4 h-4 text-emerald-400" />
              Initial Resource Capacities
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-xs font-semibold text-white mb-2">ICU Beds</div>
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] text-slate-400">Total</span>
                    <input
                      type="number"
                      min="1"
                      value={icuTotal}
                      onChange={(e) => setIcuTotal(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Free</span>
                    <input
                      type="number"
                      min="0"
                      value={icuFree}
                      onChange={(e) => setIcuFree(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-xs font-semibold text-white mb-2">Ventilators</div>
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] text-slate-400">Total</span>
                    <input
                      type="number"
                      min="1"
                      value={ventTotal}
                      onChange={(e) => setVentTotal(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Free</span>
                    <input
                      type="number"
                      min="0"
                      value={ventFree}
                      onChange={(e) => setVentFree(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-xs font-semibold text-white mb-2">Oxygen Beds</div>
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] text-slate-400">Total</span>
                    <input
                      type="number"
                      min="1"
                      value={oxyTotal}
                      onChange={(e) => setOxyTotal(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Free</span>
                    <input
                      type="number"
                      min="0"
                      value={oxyFree}
                      onChange={(e) => setOxyFree(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-xs font-semibold text-white mb-2">Ward Beds</div>
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] text-slate-400">Total</span>
                    <input
                      type="number"
                      min="1"
                      value={wardTotal}
                      onChange={(e) => setWardTotal(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Free</span>
                    <input
                      type="number"
                      min="0"
                      value={wardFree}
                      onChange={(e) => setWardFree(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Trauma & Capabilities */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              Clinical Capabilities & Trauma Rating
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Trauma Center Accreditation
                </label>
                <select
                  value={traumaLevel}
                  onChange={(e: any) => setTraumaLevel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                >
                  <option value="LEVEL_1">LEVEL 1 — Comprehensive Regional Trauma Center</option>
                  <option value="LEVEL_2">LEVEL 2 — Major Trauma Center</option>
                  <option value="LEVEL_3">LEVEL 3 — Community Emergency Facility</option>
                </select>
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasPediatricIcu}
                    onChange={(e) => setHasPediatricIcu(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-red-600 focus:ring-0"
                  />
                  <span>Pediatric Intensive Care Unit (PICU)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasCardiacCathLab}
                    onChange={(e) => setHasCardiacCathLab(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-red-600 focus:ring-0"
                  />
                  <span>Cardiac Catheterization Lab (Cath Lab)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasBurnUnit}
                    onChange={(e) => setHasBurnUnit(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-red-600 focus:ring-0"
                  />
                  <span>Specialized Burn Resuscitation Unit</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasHelipad}
                    onChange={(e) => setHasHelipad(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-red-600 focus:ring-0"
                  />
                  <span>Helipad for Air Ambulance Transport</span>
                </label>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-6 border-t border-slate-800 flex items-center justify-end gap-3">
            <Link
              href="/app/hospitals"
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-500 shadow-md transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Provisioning Hospital...' : 'Register Hospital'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
