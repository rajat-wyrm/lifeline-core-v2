'use client';

import React from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  FileText, 
  Lock, 
  HeartCrack, 
  HelpCircle, 
  UserX, 
  Database,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';

export default function LimitationsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Safety Alert Banner */}
      <div className="bg-rose-950/40 border-2 border-rose-800/80 rounded-2xl p-6 space-y-3 shadow-lg shadow-rose-950/20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-900/60 rounded-xl text-rose-300">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Safety Boundary & Research Disclaimer
            </h1>
            <span className="text-xs font-mono uppercase text-rose-400">
              Not a Certified Medical Dispatch Device
            </span>
          </div>
        </div>
        <p className="text-xs text-rose-200/90 leading-relaxed">
          <strong>Lifeline-Core v2 is strictly an algorithmic research, simulation, and academic demonstration project.</strong> It is not FDA/CE-cleared, HIPAA/DISHA certified, or approved for clinical emergency dispatch. It must never be connected to live hospital EHRs, deployed in real ambulances, or used to make live patient triage decisions.
        </p>
      </div>

      {/* Synthetic Dataset Critique */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-white">
            Synthetic Dataset Limitations & Audit
          </h2>
        </div>
        <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
          <p>
            During preliminary dataset exploration, the 50,000-row synthetic emergency dataset was audited. The audit revealed that synthetic trauma scores had zero statistical correlation with transit duration, geographic proximity, or actual clinical triage indicators.
          </p>
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-[11px] text-amber-300 space-y-1">
            <div>Pearson r(trauma_score, distance_km) = 0.002 (uncorrelated)</div>
            <div>Pearson r(patient_age, bed_availability) = -0.001 (uncorrelated)</div>
          </div>
          <p className="text-slate-400">
            <strong>Engineering Decision:</strong> Rather than pretending synthetic attributes possess real clinical predictive power or training spurious machine learning models, Lifeline-Core v2 isolates request generation to stochastic arrival times and Poisson-modeled walk-in competition with deterministic, defensible algorithmic bounds.
          </p>
        </div>
      </div>

      {/* Algorithmic Assumptions & Simplifications */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-sky-400" />
          <h2 className="text-base font-bold text-white">
            Algorithmic Modeling Assumptions & Simplifications
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
            <h3 className="font-semibold text-white">1. Road Network Speeds</h3>
            <p className="text-slate-400 leading-relaxed">
              The A* router operates on a static arterial road graph with fixed speed limits (40-60 km/h). Real emergency transit is subject to sudden weather delays, construction roadblocks, dynamic traffic jams, and emergency sirens right-of-way.
            </p>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
            <h3 className="font-semibold text-white">2. Stationary Poisson Walk-Ins</h3>
            <p className="text-slate-400 leading-relaxed">
              Walk-in patients are modeled as a homogeneous Poisson process with parameter $\lambda$. Real hospital arrivals exhibit diurnal rhythms (surges between 18:00 - 22:00) and seasonal epidemic clustering (e.g. respiratory viral peaks).
            </p>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
            <h3 className="font-semibold text-white">3. Resource Homogeneity</h3>
            <p className="text-slate-400 leading-relaxed">
              Resources are treated as discrete counts (e.g. <code>ICU_VENTILATOR = 4</code>). In real clinical operations, an ICU bed requires dedicated 1:1 or 1:2 nurse staffing, respiratory therapists, and specialized medical subspecialties.
            </p>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
            <h3 className="font-semibold text-white">4. Single Target Dispatch</h3>
            <p className="text-slate-400 leading-relaxed">
              The engine assigns the optimal primary hospital and locks one bed hold. In mass-casualty triage, patients may require multi-facility handoffs or immediate stabilization at a secondary center before tertiary trauma surgery.
            </p>
          </div>
        </div>
      </div>

      {/* Ethics & Human-in-the-Loop */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-bold text-white">
            Ethical Guardrails & Human-in-the-Loop Dispatch
          </h2>
        </div>
        <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
          <p>
            Automated allocation algorithms must never disenfranchise vulnerable populations or replace physician clinical judgment. Lifeline-Core v2 implements two fundamental ethical safeguards:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-400">
            <li>
              <strong className="text-slate-200">Starvation Prevention:</strong> The dynamic aging priority queue guarantees that lower-urgency patients (Level 3-4) are not indefinitely delayed behind endless surges of critical patients, ensuring equitable healthcare access.
            </li>
            <li>
              <strong className="text-slate-200">Human Dispatcher Primacy:</strong> All algorithmic decisions in Lifeline-Core v2 are designed as advisory recommendations. Human telecommunicators retain full unilateral authority to override assignments, release holds, or redirect ambulances.
            </li>
          </ul>
        </div>
      </div>

      {/* Navigation links */}
      <div className="flex justify-between items-center text-xs text-slate-400 pt-4 border-t border-slate-800">
        <Link href="/docs" className="text-sky-400 hover:underline">
          ← Back to Architecture & Docs
        </Link>
        <Link href="/app" className="text-slate-300 hover:text-white">
          Return to Dashboard →
        </Link>
      </div>
    </div>
  );
}
