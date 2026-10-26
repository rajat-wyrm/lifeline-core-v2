'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  ArrowLeft, 
  ShieldCheck, 
  Heart, 
  Flame, 
  Plane, 
  Baby, 
  CheckCircle2, 
  AlertTriangle,
  Save,
  Tag
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface Capabilities {
  trauma_center_level: string;
  has_pediatric_icu: boolean;
  has_cardiac_cath_lab: boolean;
  has_burn_unit: boolean;
  has_helipad: boolean;
  specialties: string[];
  restrictions: string[];
}

export default function HospitalCapabilitiesPage() {
  const params = useParams();
  const hospitalId = params.hospitalId as string;

  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchApi<{ capabilities: Capabilities }>(`/api/v2/hospitals/${hospitalId}/capabilities`)
      .then(res => setCapabilities(res.capabilities))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [hospitalId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capabilities) return;
    try {
      setSaving(true);
      await fetchApi(`/api/v2/hospitals/${hospitalId}/capabilities`, {
        method: 'POST',
        body: JSON.stringify(capabilities)
      });
      setSuccess('Capabilities profile saved successfully.');
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setSaving(false);
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
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              Trauma Accreditation & Clinical Capabilities Profile
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Facility: {hospitalId}
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
            <Link href={`/app/hospitals/${hospitalId}`} className="px-3 py-1.5 rounded text-slate-400 hover:text-white transition">
              Overview
            </Link>
            <Link href={`/app/hospitals/${hospitalId}/resources`} className="px-3 py-1.5 rounded text-slate-400 hover:text-white transition">
              Resources
            </Link>
            <Link href={`/app/hospitals/${hospitalId}/capabilities`} className="px-3 py-1.5 rounded bg-slate-800 text-white font-medium">
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

      {success && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {loading || !capabilities ? (
        <div className="p-12 text-center text-slate-500 font-mono text-sm">
          Loading facility capabilities profile...
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Trauma Center Level
              </label>
              <select
                value={capabilities.trauma_center_level}
                onChange={(e) => setCapabilities({ ...capabilities, trauma_center_level: e.target.value })}
                className="w-full sm:w-96 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-red-500"
              >
                <option value="LEVEL_1">LEVEL 1 — Comprehensive Regional Trauma Center</option>
                <option value="LEVEL_2">LEVEL 2 — Major Trauma Center</option>
                <option value="LEVEL_3">LEVEL 3 — Community Emergency Facility</option>
              </select>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                Emergency & Specialty Facilities
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-3.5 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                  <input
                    type="checkbox"
                    checked={capabilities.has_pediatric_icu}
                    onChange={(e) => setCapabilities({ ...capabilities, has_pediatric_icu: e.target.checked })}
                    className="rounded bg-slate-900 border-slate-700 text-red-600 focus:ring-0"
                  />
                  <div className="flex items-center gap-2">
                    <Baby className="w-4 h-4 text-sky-400" />
                    <div>
                      <div className="text-xs font-semibold text-white">Pediatric Intensive Care Unit (PICU)</div>
                      <div className="text-[11px] text-slate-400">Dedicated neonatologist & pediatric beds</div>
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3.5 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                  <input
                    type="checkbox"
                    checked={capabilities.has_cardiac_cath_lab}
                    onChange={(e) => setCapabilities({ ...capabilities, has_cardiac_cath_lab: e.target.checked })}
                    className="rounded bg-slate-900 border-slate-700 text-red-600 focus:ring-0"
                  />
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-400" />
                    <div>
                      <div className="text-xs font-semibold text-white">Cardiac Catheterization Lab</div>
                      <div className="text-[11px] text-slate-400">24/7 Primary PCI stenting & angiogram</div>
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3.5 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                  <input
                    type="checkbox"
                    checked={capabilities.has_burn_unit}
                    onChange={(e) => setCapabilities({ ...capabilities, has_burn_unit: e.target.checked })}
                    className="rounded bg-slate-900 border-slate-700 text-red-600 focus:ring-0"
                  />
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="text-xs font-semibold text-white">Specialized Burn Unit</div>
                      <div className="text-[11px] text-slate-400">Isolated sterile airflow resuscitation beds</div>
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3.5 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                  <input
                    type="checkbox"
                    checked={capabilities.has_helipad}
                    onChange={(e) => setCapabilities({ ...capabilities, has_helipad: e.target.checked })}
                    className="rounded bg-slate-900 border-slate-700 text-red-600 focus:ring-0"
                  />
                  <div className="flex items-center gap-2">
                    <Plane className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="text-xs font-semibold text-white">Active Air Transport Helipad</div>
                      <div className="text-[11px] text-slate-400">Rooftop or perimeter aeromedical landing pad</div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Accredited Clinical Specialties
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {(capabilities.specialties || []).map((spec, idx) => (
                  <span key={idx} className="bg-slate-950 text-slate-300 px-2.5 py-1 rounded-md border border-slate-800 text-xs font-mono">
                    {spec}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-500 transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Update Capabilities Profile'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
