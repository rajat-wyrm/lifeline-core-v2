'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Activity, 
  MapPin, 
  Building2, 
  Clock, 
  ListOrdered, 
  Cpu, 
  FlaskConical, 
  BarChart3, 
  Network, 
  ShieldAlert, 
  FileText,
  AlertTriangle,
  Menu,
  X
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [engineOnline, setEngineOnline] = useState<boolean | null>(null);

  useEffect(() => {
    // Check readiness on mount
    fetch('/api/ready')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.dependencies) {
          setEngineOnline(data.dependencies.engine.status === 'UP');
        }
      })
      .catch(() => setEngineOnline(false));
  }, []);

  const navLinks = [
    { href: '/app', label: 'Dashboard', icon: Activity },
    { href: '/app/map', label: 'Tricity Map', icon: MapPin },
    { href: '/app/hospitals', label: 'Hospitals', icon: Building2 },
    { href: '/app/requests', label: 'Requests', icon: Clock },
    { href: '/app/reservations', label: 'Ledger Holds', icon: ShieldAlert },
    { href: '/app/triage', label: 'Triage Queue', icon: ListOrdered },
    { href: '/app/simulator', label: 'Simulator', icon: Cpu },
    { href: '/app/experiments', label: '3-Policy Eval', icon: FlaskConical },
    { href: '/app/benchmarks', label: 'Benchmarks', icon: BarChart3 },
    { href: '/app/algorithms', label: 'ADSA Algorithms', icon: Network },
    { href: '/app/observability', label: 'Observability', icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center font-bold text-white shadow-md shadow-red-500/20 group-hover:bg-red-500 transition">
                +
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                  LIFELINE<span className="text-red-500">-CORE</span>
                </span>
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-mono uppercase bg-red-950 text-red-400 border border-red-800/50 rounded">
                  v2 RC
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden xl:flex items-center gap-1 overflow-x-auto py-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition ${
                    isActive
                      ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Header Status & Docs */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/docs"
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded transition"
            >
              Docs
            </Link>
            <Link
              href="/about/limitations"
              className="text-xs text-amber-400/80 hover:text-amber-300 px-2 py-1 rounded flex items-center gap-1 transition"
            >
              <AlertTriangle className="w-3 h-3" />
              Ethics
            </Link>

            {/* C++ Engine Status Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-slate-800 border border-slate-700">
              <span className={`w-2 h-2 rounded-full ${engineOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-slate-300">C++17 Engine</span>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="xl:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
                  isActive
                    ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
          <div className="pt-2 border-t border-slate-800 flex justify-between text-xs text-slate-400 px-3">
            <Link href="/docs" onClick={() => setMobileMenuOpen(false)}>System Docs</Link>
            <Link href="/about/limitations" onClick={() => setMobileMenuOpen(false)}>Ethics & Limitations</Link>
          </div>
        </div>
      )}
    </header>
  );
}
