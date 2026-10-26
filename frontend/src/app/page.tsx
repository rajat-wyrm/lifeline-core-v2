import React from 'react';
import Link from 'next/link';
import { 
  ShieldAlert, 
  Activity, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  Cpu, 
  Network, 
  BarChart3, 
  AlertTriangle,
  Lock,
  Layers,
  Database
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="space-y-20 pb-16">
      {/* Hero Section */}
      <section className="relative pt-6 pb-12 sm:pt-12 sm:pb-20 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono bg-red-950/60 border border-red-800/60 text-red-300">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          ADSA Master Autonomous Engineering Release Candidate
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-100 max-w-4xl mx-auto leading-tight sm:leading-none">
          Eliminating the <span className="bg-gradient-to-r from-red-500 via-rose-400 to-amber-400 bg-clip-text text-transparent">"Arrived But No Bed"</span> Emergency Crisis
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto font-normal leading-relaxed">
          Lifeline-Core v2 is an authoritative, C++17 emergency hospital-resource allocation engine. It replaces blind nearest-hospital routing with freshness-aware belief states, Poisson walk-in prediction, and atomic reservation ledgers.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/app"
            className="flex items-center gap-2 px-6 py-3.5 rounded-lg font-semibold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/25 transition duration-150"
          >
            <Activity className="w-5 h-5" />
            Launch Simulation System
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
          <Link
            href="/app/map"
            className="flex items-center gap-2 px-6 py-3.5 rounded-lg font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition duration-150"
          >
            <MapPin className="w-5 h-5" />
            Interactive Tricity Map
          </Link>
          <Link
            href="/app/experiments"
            className="flex items-center gap-2 px-6 py-3.5 rounded-lg font-semibold bg-slate-900 hover:bg-slate-800 text-sky-400 border border-sky-900/60 transition duration-150"
          >
            <BarChart3 className="w-5 h-5" />
            View 3-Policy Evaluation
          </Link>
        </div>

        {/* Live Empirical Banner */}
        <div className="pt-8 max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400 uppercase font-mono tracking-wider">Bed-Miss Rate</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">0.0%</div>
            <div className="text-[11px] text-slate-500 mt-0.5">vs 4.43% for nearest routing</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400 uppercase font-mono tracking-wider">Double Allocs</div>
            <div className="text-2xl font-bold text-sky-400 mt-1">0</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Under 100-thread stress tests</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400 uppercase font-mono tracking-wider">Tricity Hospitals</div>
            <div className="text-2xl font-bold text-slate-200 mt-1">50</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Chd, Mohali & Panchkula</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400 uppercase font-mono tracking-wider">Decision Latency</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">&lt; 15 &mu;s</div>
            <div className="text-[11px] text-slate-500 mt-0.5">In C++17 core engine</div>
          </div>
        </div>
      </section>

      {/* The Core Problem Space */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-100">Why Modern Emergency Dispatch Fails</h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
            Routing critical ambulances based solely on geographic proximity creates tragic allocation failures under real-world hospital dynamics.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-red-950 border border-red-800/80 flex items-center justify-center text-red-400">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg text-slate-100">Stale Feed Lag</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Hospital availability feeds lag by 10 to 60 minutes. When a portal shows "1 ICU Bed Free", that bed may have been consumed by a walk-in patient 20 minutes ago.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-amber-950 border border-amber-800/80 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg text-slate-100">No Atomic Reservation Holds</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Without an atomic ledger hold, multiple dispatchers simultaneously direct ambulances toward the same last available bed, causing fatal on-arrival rejection.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-sky-950 border border-sky-800/80 flex items-center justify-center text-sky-400">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg text-slate-100">Unmodeled Walk-In Risk</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Hospital emergency rooms constantly admit local walk-ins. A closer hospital with 1 bed has a 60% probability of losing it during a 15-minute transit, while a hospital 3 minutes farther with 6 beds has a 95% survival probability.
            </p>
          </div>
        </div>
      </section>

      {/* The Lifeline-Core v2 Solution */}
      <section className="p-8 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 space-y-8">
        <div className="max-w-3xl space-y-3">
          <span className="text-xs font-mono uppercase tracking-wider text-sky-400">The Allocation Lifecycle</span>
          <h2 className="text-3xl font-bold text-slate-100">How Lifeline-Core Protects the Ambulance</h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Every incoming emergency request transitions through a deterministic, mathematically rigorous pipeline before the ambulance commits to transit.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
            <div className="text-xs font-mono text-sky-400 font-semibold">STAGE 1: TRIAGE & AGING</div>
            <div className="font-medium text-slate-200">Starvation Avoidance</div>
            <p className="text-xs text-slate-400">
              Priority queue computes effective score: <code className="text-slate-300">trauma*100 + wait_time*0.5</code>, preventing lower-severity requests from being starved indefinitely.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
            <div className="text-xs font-mono text-emerald-400 font-semibold">STAGE 2: SPATIAL & ROUTING</div>
            <div className="font-medium text-slate-200">Road-Graph ETA</div>
            <p className="text-xs text-slate-400">
              2D Grid Index filters candidate hospitals in O(k) before A* computes exact arterial road network travel times across Chandigarh, Mohali, and Panchkula.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
            <div className="text-xs font-mono text-amber-400 font-semibold">STAGE 3: BELIEF & POISSON</div>
            <div className="font-medium text-slate-200">Freshness Discounting</div>
            <p className="text-xs text-slate-400">
              Calculates time decay and Poisson walk-in probability: <code className="text-slate-300">P(Poisson(&lambda;&middot;t) &lt; a)</code> to penalize stale counts and fragile single beds.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
            <div className="text-xs font-mono text-rose-400 font-semibold">STAGE 4: ATOMIC HOLD & TTL</div>
            <div className="font-medium text-slate-200">Min-Heap Auto-Expiry</div>
            <p className="text-xs text-slate-400">
              Per-hospital mutex secures resource atomically. If contention occurs, engine immediately falls back to rank #2, avoiding deadlock and double allocation.
            </p>
          </div>
        </div>
      </section>

      {/* ADSA Algorithms in Production */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-100">Every Data Structure Earns Its Place</h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
            No speculative abstractions. Every algorithm is benchmarked against its straightforward alternative with measured crossover curves.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-950 text-sky-400 border border-sky-900">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200">Max Segment Tree vs Linear Scan</h3>
                <span className="text-xs font-mono text-slate-500">O(log n) Zone Range Queries</span>
              </div>
            </div>
            <p className="text-sm text-slate-400">
              Provides immediate regional capacity queries ("Does zone [L, R] have any ICU bed?"). Benchmarked on N=50, 500, 5000, and 50000 hospitals. Honest result: Linear scan wins at N=50; Segment Tree crosses over and dominates above N=500.
            </p>
            <Link href="/app/benchmarks" className="inline-flex items-center text-xs text-sky-400 hover:text-sky-300 font-medium">
              View empirical crossover chart <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>

          <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-900">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200">Per-Hospital Mutexes vs Global Lock</h3>
                <span className="text-xs font-mono text-slate-500">Deadlock-Free Concurrency Architecture</span>
              </div>
            </div>
            <p className="text-sm text-slate-400">
              Each hospital maintains an isolated mutex. Threads contending for Hospital A never block Hospital B. Never holds two locks simultaneously during fallback, eliminating circular wait and verified clean under ThreadSanitizer.
            </p>
            <Link href="/app/algorithms" className="inline-flex items-center text-xs text-emerald-400 hover:text-emerald-300 font-medium">
              Inspect concurrency design <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Honest Scientific Limitations Banner */}
      <section className="p-6 rounded-xl bg-amber-950/20 border border-amber-800/40 space-y-3">
        <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
          <AlertTriangle className="w-4 h-4" />
          Scientific Transparency & Safety Notice
        </div>
        <p className="text-xs sm:text-sm text-amber-300/80 leading-relaxed">
          Lifeline-Core v2 is an academic and simulation decision-support engine developed for evaluation in Advanced Data Structures and Algorithms. The 50,000-row synthetic dataset was analyzed and verified to possess zero predictive medical correlation. All availability results and bed-miss rates represent controlled simulation outcomes under documented assumptions, not clinical certification.
        </p>
        <Link href="/about/limitations" className="inline-block text-xs text-amber-300 underline underline-offset-4">
          Read the complete ethics and limitations statement &rarr;
        </Link>
      </section>
    </div>
  );
}
