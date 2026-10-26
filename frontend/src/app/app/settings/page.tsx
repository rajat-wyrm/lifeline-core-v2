'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Settings, 
  Sliders, 
  Network, 
  Users, 
  ShieldCheck, 
  ArrowRight, 
  Activity, 
  Database,
  Lock
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function SettingsHubPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi<{ data: any[] }>('/api/v2/settings')
      .then(res => setSettings(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const sections = [
    {
      title: 'Allocation Policies & Dynamic Weights',
      description: 'Tune candidate utility weights (ETA distance, available beds, freshness decay, Poisson survival) and starvation aging parameters.',
      href: '/app/settings/policies',
      icon: Sliders,
      color: 'text-purple-400',
      bg: 'bg-purple-950/40 border-purple-800/60'
    },
    {
      title: 'Telemetry Integrations & Engine Sockets',
      description: 'Configure real-time hospital webhook connectors, C++ allocation socket endpoints, and OpenStreetMap graph layers.',
      href: '/app/settings/integrations',
      icon: Network,
      color: 'text-sky-400',
      bg: 'bg-sky-950/40 border-sky-800/60'
    },
    {
      title: 'Operator Accounts & RBAC Roles',
      description: 'Manage dispatcher, bed board operator, and health inspector credentials, role-based access control (RBAC), and session timeouts.',
      href: '/app/settings/users',
      icon: Users,
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/40 border-emerald-800/60'
    },
    {
      title: 'Administrative Governance & Audit',
      description: 'Review policy updates, configuration modifications, and administrative audit trails with cryptographic hash verification.',
      href: '/app/settings/audit',
      icon: ShieldCheck,
      color: 'text-amber-400',
      bg: 'bg-amber-950/40 border-amber-800/60'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-sky-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              System Settings & Administration Hub
            </h1>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
              Policy Configuration & RBAC
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Centralized management of allocation weights, telemetry webhooks, operator accounts, and governance policies.
          </p>
        </div>
      </div>

      {/* Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((sec) => {
          const Icon = sec.icon;
          return (
            <Link
              key={sec.href}
              href={sec.href}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl hover:border-slate-700 transition flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-lg border ${sec.bg}`}>
                    <Icon className={`w-5 h-5 ${sec.color}`} />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition" />
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {sec.title}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {sec.description}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800/80 text-[11px] font-mono text-slate-500">
                <span>Manage Subsystem &rarr;</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Persisted Settings Snapshot */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
          <Database className="w-4 h-4 text-emerald-400" />
          Active Configuration Keys in PostgreSQL (`system_settings`)
        </h3>

        {loading ? (
          <div className="p-8 text-center text-slate-500 font-mono text-xs">
            Loading settings...
          </div>
        ) : (
          <div className="space-y-2">
            {settings.map((s) => (
              <div key={s.key} className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-start justify-between gap-4">
                <div>
                  <span className="font-mono text-xs font-bold text-sky-400">{s.key}</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">{s.description}</p>
                </div>
                <pre className="text-[10px] font-mono text-emerald-400 bg-slate-900 px-2 py-1 rounded border border-slate-800 shrink-0 max-w-xs truncate">
                  {JSON.stringify(s.value)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
