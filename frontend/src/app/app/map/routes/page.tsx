'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { 
  Navigation, 
  MapPin, 
  Clock, 
  Cpu, 
  ArrowRight, 
  Sparkles, 
  Sliders, 
  Activity,
  Layers,
  ArrowLeft
} from 'lucide-react';
import { fetchApi, Hospital } from '@/lib/api';

const LeafletMap = dynamic(() => import('@/components/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[480px] w-full rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 font-mono text-xs">
      Loading Tricity road routing engine...
    </div>
  ),
});

const ORIGIN_PRESETS = [
  { name: 'Sector 17 Plaza, Chandigarh', lat: 30.7398, lng: 76.7827 },
  { name: 'Phase 7 Industrial, Mohali', lat: 30.7046, lng: 76.7179 },
  { name: 'Sector 5 Urban, Panchkula', lat: 30.6942, lng: 76.8534 },
  { name: 'Zirakpur Flyover Chokepoint', lat: 30.6425, lng: 76.8173 },
  { name: 'Aerocity Express Corridor', lat: 30.6350, lng: 76.7450 }
];

export default function RoadRoutingPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [originLat, setOriginLat] = useState(30.7398);
  const [originLng, setOriginLng] = useState(76.7827);
  const [selectedHospitalId, setSelectedHospitalId] = useState('HOSP-101');
  const [algorithm, setAlgorithm] = useState<'ASTAR' | 'DIJKSTRA'>('ASTAR');
  const [trafficMultiplier, setTrafficMultiplier] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [routeResult, setRouteResult] = useState<any>(null);

  useEffect(() => {
    fetchApi<{ data: Hospital[] }>('/api/v2/hospitals')
      .then(res => {
        setHospitals(res.data);
      })
      .catch(console.error);
  }, []);

  const handlePlanRoute = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<any>('/api/v2/routes/plan', {
        method: 'POST',
        body: JSON.stringify({
          origin_lat: originLat,
          origin_lng: originLng,
          hospital_id: selectedHospitalId,
          algorithm,
          traffic_multiplier: trafficMultiplier
        })
      });
      setRouteResult(res);
    } catch (err: any) {
      alert(`Route calculation error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handlePlanRoute();
  }, [selectedHospitalId, algorithm, trafficMultiplier]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-sky-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Road-Network Routing & ETA Inspector
            </h1>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
              A* vs Dijkstra Comparison
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Validates admissible Euclidean heuristic search against uniform Dijkstra exploration across Tricity arterial corridors.
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
            href="/app/map/zones"
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded-lg border border-slate-700 transition"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Catchment Zones</span>
          </Link>
        </div>
      </div>

      {/* Grid: Controls & Route Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Column */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <Sliders className="w-4 h-4 text-sky-400" />
            Route Planning Parameters
          </h3>

          {/* Origin Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Origin Incident Location
            </label>
            <div className="space-y-1.5">
              {ORIGIN_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => { setOriginLat(p.lat); setOriginLng(p.lng); }}
                  className={`w-full text-left p-2 rounded-lg border text-xs transition cursor-pointer flex items-center justify-between ${
                    originLat === p.lat && originLng === p.lng
                      ? 'border-sky-500/50 bg-sky-950/30 text-sky-200'
                      : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="truncate">{p.name}</span>
                  <span className="font-mono text-[10px] text-slate-500 shrink-0">
                    {p.lat.toFixed(3)}, {p.lng.toFixed(3)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Destination Hospital */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Destination Hospital
            </label>
            <select
              value={selectedHospitalId}
              onChange={(e) => setSelectedHospitalId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-red-500"
            >
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.id})
                </option>
              ))}
            </select>
          </div>

          {/* Algorithm Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Graph Routing Algorithm
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAlgorithm('ASTAR')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium transition cursor-pointer flex flex-col items-center gap-1 ${
                  algorithm === 'ASTAR'
                    ? 'border-sky-500 bg-sky-950/40 text-sky-300'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                <span>A* Search</span>
                <span className="text-[10px] text-slate-500 font-mono">Heuristic Admissible</span>
              </button>
              <button
                type="button"
                onClick={() => setAlgorithm('DIJKSTRA')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium transition cursor-pointer flex flex-col items-center gap-1 ${
                  algorithm === 'DIJKSTRA'
                    ? 'border-sky-500 bg-sky-950/40 text-sky-300'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                <span>Dijkstra</span>
                <span className="text-[10px] text-slate-500 font-mono">Uniform Cost Baseline</span>
              </button>
            </div>
          </div>

          {/* Traffic Congestion Multiplier */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span className="font-semibold uppercase tracking-wider">Traffic Congestion Factor</span>
              <span className="font-mono text-white">{trafficMultiplier.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="2.5"
              step="0.1"
              value={trafficMultiplier}
              onChange={(e) => setTrafficMultiplier(parseFloat(e.target.value))}
              className="w-full accent-sky-500 bg-slate-950 rounded cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>0.8x (Midnight)</span>
              <span>1.0x (Standard)</span>
              <span>2.5x (Peak Rush)</span>
            </div>
          </div>
        </div>

        {/* Results & Comparison Column */}
        <div className="lg:col-span-2 space-y-4">
          {routeResult && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Road Distance</div>
                <div className="text-xl font-bold text-white font-mono mt-1">
                  {routeResult.metrics.route_distance_km} km
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Air: {routeResult.metrics.straight_line_distance_km} km
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Emergency ETA</div>
                <div className="text-xl font-bold text-sky-400 font-mono mt-1">
                  {routeResult.metrics.eta_minutes} min
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Avg Speed: {routeResult.metrics.effective_speed_kmh} km/h
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Nodes Explored</div>
                <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
                  {routeResult.metrics.graph_nodes_explored}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {algorithm === 'ASTAR' ? 'A* Narrow Cone' : 'Dijkstra Full Circle'}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Search Reduction</div>
                <div className="text-xl font-bold text-purple-400 font-mono mt-1">
                  +{routeResult.metrics.comparison.efficiency_gain_pct}%
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  vs Dijkstra ({routeResult.metrics.comparison.dijkstra_nodes} nodes)
                </div>
              </div>
            </div>
          )}

          {/* Map Display */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl p-3">
            <LeafletMap 
              hospitals={hospitals} 
              selectedHospitalId={selectedHospitalId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
