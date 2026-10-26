'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Key, AlertCircle, CheckCircle2, UserCheck, ArrowRight } from 'lucide-react';
import { fetchApi } from '@/lib/api';

const DEMO_ACCOUNTS = [
  {
    role: 'DISPATCHER',
    name: '108 Lead Dispatcher',
    email: 'dispatch@lifeline.local',
    description: 'Dispatch ambulance units, allocate beds, override holds'
  },
  {
    role: 'HOSPITAL_OPERATOR',
    name: 'PGIMER Bed Board Operator',
    email: 'pgimer.operator@lifeline.local',
    description: 'Update live ICU capacities, report diverts, confirm arrivals'
  },
  {
    role: 'ADMIN',
    name: 'Chief Medical Officer',
    email: 'admin@lifeline.local',
    description: 'Tune triage policies, manage system settings & accounts'
  },
  {
    role: 'AUDITOR',
    name: 'Health Dept Inspector',
    email: 'auditor@lifeline.local',
    description: 'Read-only access to audit logs, compliance reports, and traces'
  }
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('dispatch@lifeline.local');
  const [password, setPassword] = useState('Lifeline@2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successUser, setSuccessUser] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetchApi<{ user: { full_name: string; role: string; email: string } }>('/api/v2/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      setSuccessUser(`${res.user.full_name} (${res.user.role})`);
      setTimeout(() => {
        router.push('/app');
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const selectDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Lifeline@2026');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center font-bold text-white text-2xl mx-auto shadow-lg shadow-red-500/20">
          +
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
          LIFELINE<span className="text-red-500">-CORE</span> OPERATOR PORTAL
        </h2>
        <p className="mt-2 text-xs text-slate-400">
          Tricity Emergency Hospital-Resource Allocation Engine • Secure Operator Session
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-xl rounded-xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {successUser && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Authenticated as {successUser}. Redirecting...</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Operator Email
              </label>
              <div className="mt-1 relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-red-500 transition"
                  placeholder="operator@lifeline.local"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Security Password
              </label>
              <div className="mt-1 relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-red-500 transition font-mono"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg shadow transition text-sm cursor-pointer"
            >
              <Key className="w-4 h-4" />
              {loading ? 'Verifying Session...' : 'Authenticate & Enter Workspace'}
            </button>
          </form>

          {/* Quick Demo Role Switcher */}
          <div className="mt-6 border-t border-slate-800/80 pt-5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-3">
              <UserCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Quick Demo Role Switcher</span>
            </div>
            <div className="space-y-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => selectDemoAccount(acc.email)}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs transition cursor-pointer flex flex-col justify-between ${
                    email === acc.email
                      ? 'border-sky-500/50 bg-sky-950/30 text-sky-200'
                      : 'border-slate-800/80 bg-slate-950/40 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-medium">
                    <span>{acc.name}</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {acc.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 truncate">
                    {acc.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/app"
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
            >
              <span>Continue as guest viewer</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
