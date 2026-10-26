'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  Code, 
  Layers, 
  Server, 
  Database, 
  Cpu, 
  ShieldCheck, 
  BookOpen, 
  ChevronRight,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<string>('architecture');
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(text);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const endpoints = [
    {
      method: 'POST',
      path: '/api/v2/requests',
      desc: 'Dispatch emergency patient request. Triggers C++ candidate ranking, belief state evaluation, A* road routing, and atomic reservation lock.',
      body: `{
  "patient_age": 52,
  "trauma_score": 85,
  "required_resource": "ICU_VENTILATOR",
  "origin_latitude": 30.7333,
  "origin_longitude": 76.7794
}`,
      response: `{
  "request_id": "REQ-1718000000000",
  "assigned_hospital_id": "HOSP-101",
  "reservation_id": "RES-REQ-1718000000000-HOSP-101",
  "eta_minutes": 8.4,
  "hold_expires_at_ms": 1718001104000,
  "status": "DISPATCHED"
}`
    },
    {
      method: 'POST',
      path: '/api/v2/reservations/:id/confirm',
      desc: 'Confirm patient arrival at hospital. Transitions reservation from HELD to CONFIRMED, permanently allocating the bed.',
      body: `{}`,
      response: `{
  "reservation_id": "RES-REQ-1718000000000-HOSP-101",
  "state": "CONFIRMED",
  "success": true
}`
    },
    {
      method: 'POST',
      path: '/api/v2/reservations/:id/release',
      desc: 'Voluntarily release reservation hold if ambulance was cancelled or diverted. Restores capacity in hospital resource pool.',
      body: `{}`,
      response: `{
  "reservation_id": "RES-REQ-1718000000000-HOSP-101",
  "state": "RELEASED",
  "success": true
}`
    },
    {
      method: 'POST',
      path: '/api/v2/hospitals/:id/resources/:type',
      desc: 'Simulate telemetry feed update from hospital inventory management. Updates total/available beds and resets staleness timestamp.',
      body: `{
  "total": 20,
  "available": 6
}`,
      response: `{
  "hospital_id": "HOSP-101",
  "resource_type": "ICU_VENTILATOR",
  "available": 6,
  "updated_at": "2026-10-26T12:00:00Z"
}`
    },
    {
      method: 'POST',
      path: '/api/v2/simulator/run',
      desc: 'Execute Python Monte Carlo simulation across road network and stochastic walk-in demand.',
      body: `{
  "scenario": "contention_surge",
  "policy": "LIFELINE_CORE",
  "num_requests": 250,
  "seed": 42
}`,
      response: `{
  "run_id": "RUN-1718000000000-LIFELINE_CORE",
  "metrics": {
    "total_requests": 250,
    "bed_miss_rate_pct": 0.0,
    "mean_time_to_treatment_min": 11.2,
    "redirect_count": 0,
    "double_allocation_count": 0
  }
}`
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-sky-400" />
              Lifeline-Core v2 Documentation & API Reference
            </h1>
            <span className="px-2 py-0.5 text-xs font-mono bg-sky-950 text-sky-300 border border-sky-800 rounded">
              v2.0 Specification
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Complete architectural blueprint, interface contracts, algorithmic proofs, and developer guide.
          </p>
        </div>
      </div>

      {/* Docs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 space-y-1">
          {[
            { id: 'architecture', label: '1. Architecture & Data Flow' },
            { id: 'api_reference', label: '2. REST API Reference' },
            { id: 'concurrency', label: '3. Concurrency & Locking' },
            { id: 'adsa_summary', label: '4. ADSA Algorithmic Table' },
            { id: 'reproducibility', label: '5. Local Reproducibility' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium transition flex items-center justify-between ${
                activeSection === item.id
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>{item.label}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        {/* Content Pane */}
        <div className="lg:col-span-9 space-y-6">
          {activeSection === 'architecture' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">System Architecture & Pipeline Flow</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Lifeline-Core v2 separates presentation, API orchestration, persistent audit logging, and high-performance algorithmic dispatch.
                </p>
              </div>

              {/* ASCII Diagram Card */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">
                <pre>{`Browser (Next.js 15 App Router + React + Tailwind + Leaflet)
   │
   │  JSON / HTTP (port 3000 /api/* -> port 3001)
   ▼
Fastify REST API (TypeScript + pg raw SQL driver)
   │
   ├──► PostgreSQL 18 (Local dev cluster port 5433)
   │      - hospitals, resources, reservations, emergency_requests, audit_logs
   │
   ├──► C++17 Allocation Engine Daemon (port 8081)
   │      - Per-hospital std::shared_mutex store
   │      - Min-heap TTL reservation ledger
   │      - A* road router (24 nodes, 27 edges)
   │      - Poisson belief state decay estimator
   │      - Starvation-free aging triage queue
   │
   └──► Python Monte Carlo Simulator Tooling (sim/)
          - 20-seed controlled stochastic evaluation
          - Synthetic Tricity road network & walk-in distributions`}</pre>
              </div>

              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <h3 className="text-sm font-semibold text-white">Architectural Principles:</h3>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li><strong>C++17 Engine is Authoritative:</strong> The web layer never performs reservation holds or score rankings in TypeScript. All allocation logic resides in the native C++ engine.</li>
                  <li><strong>Raw SQL via pg:</strong> Strict YAGNI compliance; no heavyweight ORM (Prisma/TypeORM). All schema migrations and transactions execute via clean, inspectable raw SQL.</li>
                  <li><strong>Double-Allocation Elimination:</strong> Reader-writer locks at the C++ engine layer combined with monotonic state transitions in Postgres ensure zero race conditions.</li>
                </ul>
              </div>
            </div>
          )}

          {activeSection === 'api_reference' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">REST API Endpoint Specifications</h2>
                <p className="text-xs text-slate-400 mt-1">
                  All requests and responses use strict JSON payloads with Zod input validation schemas.
                </p>
              </div>

              <div className="space-y-6">
                {endpoints.map((ep) => (
                  <div key={ep.path} className="border border-slate-800 rounded-xl p-4 bg-slate-950/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          ep.method === 'POST' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-sky-950 text-sky-400 border border-sky-800'
                        }`}>
                          {ep.method}
                        </span>
                        <span className="text-white font-medium">{ep.path}</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(ep.path)}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                      >
                        {copiedEndpoint === ep.path ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        Copy Path
                      </button>
                    </div>

                    <p className="text-xs text-slate-400">{ep.desc}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-mono">
                      <div>
                        <div className="text-slate-400 font-sans text-xs mb-1">Request Payload:</div>
                        <pre className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-sky-300 overflow-x-auto">
                          <code>{ep.body}</code>
                        </pre>
                      </div>
                      <div>
                        <div className="text-slate-400 font-sans text-xs mb-1">Response JSON (200 OK):</div>
                        <pre className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-emerald-300 overflow-x-auto">
                          <code>{ep.response}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'concurrency' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white">Concurrency, Locking & State Invariants</h2>
                <p className="text-xs text-slate-400 mt-1">
                  How Lifeline-Core v2 achieves high multi-core scaling without risking double allocations.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-semibold text-emerald-400">Per-Hospital Reader-Writer Lock</div>
                  <p className="text-slate-400 leading-relaxed">
                    By scoping mutex locks per facility rather than globally, two requests allocating beds in different hospitals execute fully in parallel without thread contention.
                  </p>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-semibold text-sky-400">Monotonic State Transitions</div>
                  <p className="text-slate-400 leading-relaxed">
                    A reservation state advances strictly as <code>HELD</code> $\to$ <code>CONFIRMED</code> or <code>RELEASED</code> or <code>EXPIRED</code>. Reverting from terminal states is rejected at both engine and database layers.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'adsa_summary' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">ADSA Complexity Matrix</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Theoretical asymptotic bounds and empirical measured behavior across the 7 core data structures.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Data Structure</th>
                      <th className="py-2.5 px-3">Time Complexity</th>
                      <th className="py-2.5 px-3">Space</th>
                      <th className="py-2.5 px-3">Empirical Crossover / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    <tr>
                      <td className="py-2.5 px-3 text-white">Per-Hospital Mutex Store</td>
                      <td className="py-2.5 px-3 text-emerald-400">O(1) read / O(1) write</td>
                      <td className="py-2.5 px-3">O(H * R)</td>
                      <td className="py-2.5 px-3 text-slate-400">10.3x throughput scaling at 16 threads</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-white">Min-Heap TTL Ledger</td>
                      <td className="py-2.5 px-3 text-emerald-400">O(log K) insert, O(1) top</td>
                      <td className="py-2.5 px-3">O(K)</td>
                      <td className="py-2.5 px-3 text-slate-400">Monotone auto-expiry in &lt;1ms</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-white">Max Segment Tree</td>
                      <td className="py-2.5 px-3 text-emerald-400">O(log N) query & update</td>
                      <td className="py-2.5 px-3">O(4N)</td>
                      <td className="py-2.5 px-3 text-slate-400">Beats linear scan at N &gt; 150 (92x at N=50k)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-white">2D Spatial Grid Index</td>
                      <td className="py-2.5 px-3 text-emerald-400">O(1 + k) lookup</td>
                      <td className="py-2.5 px-3">O(H)</td>
                      <td className="py-2.5 px-3 text-slate-400">Prunes 90% of spatial distance calculations</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-white">Dynamic Aging Triage Queue</td>
                      <td className="py-2.5 px-3 text-emerald-400">O(log N) push/pop, O(1) peek</td>
                      <td className="py-2.5 px-3">O(N)</td>
                      <td className="py-2.5 px-3 text-slate-400">Guarantees T_max &lt;= 120s upper bound</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-white">Poisson Belief Estimator</td>
                      <td className="py-2.5 px-3 text-emerald-400">O(1) evaluation</td>
                      <td className="py-2.5 px-3">O(1)</td>
                      <td className="py-2.5 px-3 text-slate-400">Exp decay exp(-lambda * dt) protects stale feeds</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-white">A* Road Router</td>
                      <td className="py-2.5 px-3 text-emerald-400">O((V + E) log V)</td>
                      <td className="py-2.5 px-3">O(V)</td>
                      <td className="py-2.5 px-3 text-slate-400">Admissible Euclidean heuristic ensures optimal ETA</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSection === 'reproducibility' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">Local Developer Reproducibility Guide</h2>
                <p className="text-xs text-slate-400 mt-1">
                  How to build and run all components locally without cloud dependencies.
                </p>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-slate-400 font-sans font-semibold">1. Database (PostgreSQL user-space cluster):</div>
                  <pre className="text-sky-300"><code>./scripts/db-dev.sh start</code></pre>

                  <div className="text-slate-400 font-sans font-semibold pt-2">2. C++17 Allocation Engine:</div>
                  <pre className="text-sky-300"><code>mkdir -p engine/build && cd engine/build
cmake -DCMAKE_BUILD_TYPE=Release .. && make -j4
./lifeline-tests # 471 Catch2 unit tests
./lifeline-engine --port 8081 # REST Daemon</code></pre>

                  <div className="text-slate-400 font-sans font-semibold pt-2">3. Fastify Backend:</div>
                  <pre className="text-sky-300"><code>cd backend && pnpm install && pnpm build && pnpm dev</code></pre>

                  <div className="text-slate-400 font-sans font-semibold pt-2">4. Next.js Frontend:</div>
                  <pre className="text-sky-300"><code>cd frontend && pnpm install && pnpm build && pnpm dev</code></pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
