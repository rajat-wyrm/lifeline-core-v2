'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  MapPin, 
  Search, 
  Filter, 
  Building2, 
  Activity, 
  Clock, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { fetchApi, Hospital } from '@/lib/api';
import { formatTimeAgo } from '@/lib/utils';

// Dynamically import LeafletMap with SSR disabled to prevent window is undefined errors
const LeafletMap = dynamic(() => import('@/components/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[650px] rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 font-mono text-sm">
      Initializing Leaflet Geographic Engine...
    </div>
  )
});

export default function MapPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [resourceFilter, setResourceFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi<{ data: Hospital[] }>('/api/v2/hospitals')
      .then(res => setHospitals(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filteredHospitals = hospitals.filter(h => {
    const matchesSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          h.id.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (resourceFilter === 'ICU') {
      return (h.resources?.['ICU-BED']?.available ?? 0) > 0;
    } else if (resourceFilter === 'VENTILATOR') {
      return (h.resources?.['VENTILATOR']?.available ?? 0) > 0;
    } else if (resourceFilter === 'OXYGEN') {
      return (h.resources?.['OXYGEN-BED']?.available ?? 0) > 0;
    }
    return true;
  });

  const selectedHospital = hospitals.find(h => h.id === selectedHospitalId);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-sky-400" />
            Tricity Emergency Geographic Grid
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Chandigarh, Mohali, and Panchkula regional road network and hospital availability
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search hospitals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
            {['ALL', 'ICU', 'VENTILATOR', 'OXYGEN'].map(filter => (
              <button
                key={filter}
                onClick={() => setResourceFilter(filter)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                  resourceFilter === filter
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Leaflet Map & Hospital Sidebar */}
      <div className="grid lg:grid-cols-4 gap-6 h-[680px]">
        {/* Map View */}
        <div className="lg:col-span-3 h-full">
          <LeafletMap
            hospitals={filteredHospitals}
            selectedHospitalId={selectedHospitalId}
            onSelectHospital={(id) => setSelectedHospitalId(id)}
            highlightCoordinates={selectedHospital ? { lat: selectedHospital.latitude, lon: selectedHospital.longitude } : null}
          />
        </div>

        {/* Hospital Inspector Sidebar */}
        <div className="lg:col-span-1 h-full flex flex-col bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200">
              Hospitals ({filteredHospitals.length})
            </span>
            <span className="text-[11px] font-mono text-slate-500">Live Grid</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
            {filteredHospitals.map(h => {
              const isSelected = selectedHospitalId === h.id;
              const icu = h.resources?.['ICU-BED']?.available ?? 0;
              const vent = h.resources?.['VENTILATOR']?.available ?? 0;
              const oxy = h.resources?.['OXYGEN-BED']?.available ?? 0;

              return (
                <div
                  key={h.id}
                  onClick={() => setSelectedHospitalId(h.id)}
                  className={`p-3 rounded-lg cursor-pointer transition text-xs space-y-1.5 ${
                    isSelected
                      ? 'bg-sky-950/80 border border-sky-800/80 text-white'
                      : 'hover:bg-slate-800/50 text-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-semibold text-slate-100 line-clamp-1">{h.name}</span>
                    <span className="font-mono text-[10px] text-slate-400">{h.id}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-[11px] font-mono">
                    <span className={`px-1.5 py-0.5 rounded text-center ${icu > 0 ? 'bg-emerald-950/80 text-emerald-400' : 'bg-red-950/80 text-red-400'}`}>
                      ICU: {icu}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-center bg-slate-800/80 text-slate-300">
                      V: {vent}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-center bg-slate-800/80 text-slate-300">
                      O2: {oxy}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <span>&lambda;: {h.walk_in_lambda.toFixed(2)}/min</span>
                    <span>{formatTimeAgo(h.resources?.['ICU-BED']?.last_report_timestamp)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
