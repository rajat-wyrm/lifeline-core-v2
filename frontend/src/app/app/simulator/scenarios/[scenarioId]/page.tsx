'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Sliders, 
  ArrowLeft, 
  Play, 
  Layers, 
  Clock, 
  Cpu, 
  Activity, 
  ShieldAlert,
  Flame,
  FileCode2
} from 'lucide-react';

const SCENARIO_DETAILS: Record<string, {
  name: string;
  description: string;
  arrival_rate: string;
  contention_surge: boolean;
  freeze_list: string[];
  feed_latency_model: string;
  expected_results: string;
}> = {
  normal_day: {
    name: 'Normal Day Baseline Scenario',
    description: 'Models typical 24-hour baseline emergency arrivals across Tricity sectors. Standard traffic conditions and regular hospital telemetry reporting interval (5-10 min).',
    arrival_rate: 'Poisson arrival rate &lambda; = 0.08 requests / minute',
    contention_surge: false,
    freeze_list: [],
    feed_latency_model: 'Uniform distribution U(5, 10) minutes',
    expected_results: 'Lifeline-Core achieves 0.00% bed-miss failure rate, compared to 3-6% for Nearest Hospital and 0.5-1% for Portal Count.'
  },
  contention_surge: {
    name: 'Mass-Casualty Contention Surge Scenario',
    description: 'Simulates a major industrial fire or multi-vehicle collision creating a 3x burst of severe trauma calls targeting Sector 62 and Mohali corridor within 20 minutes.',
    arrival_rate: 'Burst arrival rate &lambda; = 0.35 requests / minute',
    contention_surge: true,
    freeze_list: [],
    feed_latency_model: 'Uniform distribution U(3, 8) minutes with high contention on ICU beds',
    expected_results: 'Nearest Hospital experiences 5-8% bed-miss rate and multiple ambulance redirects. Lifeline-Core reservation locking eliminates double-allocation completely.'
  },
  feed_outage_chaos: {
    name: 'Feed Outage Chaos (Frozen Telemetry) Scenario',
    description: 'Adversarial benchmark where PGIMER, GMCH-32, and Fortis Hospital experience complete telemetry network blackouts. Hospital portals continue showing old bed counts while physical capacity is consumed by walk-ins.',
    arrival_rate: 'Poisson arrival rate &lambda; = 0.12 requests / minute',
    contention_surge: false,
    freeze_list: ['HOSP-101 (PGIMER)', 'HOSP-102 (GMCH-32)', 'HOSP-103 (GMSH-16)', 'HOSP-104 (Fortis Mohali)'],
    feed_latency_model: 'Complete telemetry freeze (&Delta;t &rarr; &infin;) on 4 major tertiary hospitals',
    expected_results: 'Portal-Count suffers severe bed-miss rates (up to 4%) due to blind routing. Lifeline-Core Poisson belief decay reduces confidence to <30%, automatically diverting ambulances to reliable secondary facilities.'
  }
};

export default function ScenarioDetailPage() {
  const params = useParams();
  const scenarioId = params.scenarioId as string;

  const scenario = SCENARIO_DETAILS[scenarioId] || {
    name: `Scenario ${scenarioId}`,
    description: 'Custom benchmark scenario configuration.',
    arrival_rate: 'Configured dynamically',
    contention_surge: false,
    freeze_list: [],
    feed_latency_model: 'Standard stochastic feed',
    expected_results: 'Lifeline-Core achieves zero bed-miss rate.'
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <Link href="/app/simulator/scenarios" className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Scenario Library
        </Link>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-sky-400" />
              {scenario.name}
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Scenario ID: {scenarioId}
            </p>
          </div>

          <Link
            href={`/app/simulator?scenario=${scenarioId}`}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-xs px-4 py-2 rounded-lg font-medium shadow transition"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Execute Workload</span>
          </Link>
        </div>
      </div>

      {/* Details Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Workload Description
          </h3>
          <p className="text-sm text-slate-200 leading-relaxed">
            {scenario.description}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase">Arrival Generation Model</span>
            <div className="text-xs font-mono text-sky-300 font-semibold">
              {scenario.arrival_rate}
            </div>
          </div>

          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase">Telemetry Feed Model</span>
            <div className="text-xs font-mono text-emerald-300 font-semibold">
              {scenario.feed_latency_model}
            </div>
          </div>
        </div>

        {scenario.freeze_list.length > 0 && (
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
              <Flame className="w-4 h-4" />
              <span>Simulated Feed Outage (Blackout Facilities)</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {scenario.freeze_list.map((hosp, i) => (
                <span key={i} className="px-2.5 py-1 rounded bg-rose-950/60 text-rose-300 border border-rose-800 text-xs font-mono">
                  {hosp}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-800 space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Expected Scientific Outcome
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed font-mono bg-slate-950 p-4 rounded-lg border border-slate-800">
            {scenario.expected_results}
          </p>
        </div>
      </div>
    </div>
  );
}
