'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Layers, 
  ArrowLeft, 
  Play, 
  Cpu, 
  FlaskConical, 
  ShieldAlert, 
  ArrowRight, 
  Sliders 
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface Scenario {
  id: string;
  name: string;
  description: string;
  default_requests: number;
  expected_bed_miss: {
    nearest: string;
    portal: string;
    lifeline: string;
  };
}

export default function SimulatorScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi<{ scenarios: Scenario[] }>('/api/v2/simulator/scenarios')
      .then(res => setScenarios(res.scenarios))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Simulation Scenario Library
            </h1>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
              Controlled Monte Carlo Workloads
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Pre-configured stress-test environments evaluating bed-miss rates, queuing contention, and feed outage behavior.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/app/simulator"
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs px-3.5 py-2 rounded-lg font-medium shadow transition"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Launch Live Simulator</span>
          </Link>
          <Link
            href="/app/simulator/runs"
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded-lg border border-slate-700 transition"
          >
            <span>Run Ledger</span>
          </Link>
        </div>
      </div>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 p-12 text-center text-slate-500 font-mono text-sm">
            Loading scenario presets...
          </div>
        ) : (
          scenarios.map((sc) => (
            <div 
              key={sc.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4 hover:border-slate-700 transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {sc.id}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {sc.default_requests} Requests
                  </span>
                </div>

                <h3 className="text-base font-bold text-white tracking-tight">
                  {sc.name}
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {sc.description}
                </p>

                {/* Expected Outcomes Matrix */}
                <div className="pt-3 border-t border-slate-800/80 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Expected Bed-Miss Failure Rate:
                  </span>
                  <div className="space-y-1 text-xs font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>Nearest Hospital:</span>
                      <span className="text-rose-400 font-bold">{sc.expected_bed_miss.nearest}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Portal Count:</span>
                      <span className="text-amber-400 font-bold">{sc.expected_bed_miss.portal}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Lifeline-Core:</span>
                      <span className="text-emerald-400 font-bold">{sc.expected_bed_miss.lifeline}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <Link
                  href={`/app/simulator/scenarios/${sc.id}`}
                  className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Inspect Spec</span>
                </Link>

                <Link
                  href={`/app/simulator?scenario=${sc.id}`}
                  className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-medium transition"
                >
                  <span>Run Workload</span>
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
