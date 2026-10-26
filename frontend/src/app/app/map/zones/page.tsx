'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Layers, 
  MapPin, 
  ShieldAlert, 
  Navigation, 
  Users, 
  Truck, 
  Gauge, 
  Building2, 
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface TricityZone {
  id: string;
  name: string;
  region: 'CHANDIGARH' | 'MOHALI' | 'PANCHKULA' | 'ZIRAKPUR';
  center_lat: number;
  center_lng: number;
  radius_km: number;
  population_est: number;
  active_ambulances: number;
  average_speed_kmh: number;
  hospitals_count: number;
  risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

export default function TricityZonesPage() {
  const [zones, setZones] = useState<TricityZone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi<{ data: TricityZone[] }>('/api/v2/zones')
      .then(res => setZones(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'CRITICAL':
        return 'bg-rose-950 text-rose-300 border-rose-800';
      case 'HIGH':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'MODERATE':
        return 'bg-sky-950 text-sky-300 border-sky-800';
      default:
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Tricity Catchment Zones & Operational Sectors
            </h1>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
              Geographic Partitioning
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Demographic population catchments, 108 ambulance staging zones, and regional speed profiles across Chandigarh, Mohali, and Panchkula.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/app/map"
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded-lg border border-slate-700 transition"
          >
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            <span>Tricity Live Map</span>
          </Link>
          <Link
            href="/app/map/routes"
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded-lg border border-slate-700 transition"
          >
            <Navigation className="w-3.5 h-3.5 text-sky-400" />
            <span>Road Routes</span>
          </Link>
        </div>
      </div>

      {/* Zones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 p-12 text-center text-slate-500 font-mono text-sm">
            Loading Tricity catchment zones...
          </div>
        ) : (
          zones.map((zone) => (
            <div 
              key={zone.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4 hover:border-slate-700 transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {zone.region}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${getRiskBadge(zone.risk_level)}`}>
                    {zone.risk_level} RISK
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white tracking-tight">
                  {zone.name}
                </h3>

                <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                  <span>Center: {zone.center_lat.toFixed(3)}, {zone.center_lng.toFixed(3)} ({zone.radius_km} km radius)</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Users className="w-3 h-3 text-sky-400" />
                      <span>Population</span>
                    </div>
                    <div className="text-sm font-bold text-white font-mono mt-0.5">
                      {(zone.population_est / 1000).toFixed(0)}k est.
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Truck className="w-3 h-3 text-emerald-400" />
                      <span>Ambulances</span>
                    </div>
                    <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                      {zone.active_ambulances} units
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Gauge className="w-3 h-3 text-amber-400" />
                      <span>Avg Speed</span>
                    </div>
                    <div className="text-sm font-bold text-amber-400 font-mono mt-0.5">
                      {zone.average_speed_kmh} km/h
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Building2 className="w-3 h-3 text-purple-400" />
                      <span>Hospitals</span>
                    </div>
                    <div className="text-sm font-bold text-purple-400 font-mono mt-0.5">
                      {zone.hospitals_count} facilities
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="font-mono text-[10px] text-slate-500">{zone.id}</span>
                <Link
                  href={`/app/map/routes`}
                  className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-medium transition"
                >
                  <span>Simulate Route</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
