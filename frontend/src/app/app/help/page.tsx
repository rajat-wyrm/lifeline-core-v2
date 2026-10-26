'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BookOpen, 
  Search, 
  Filter, 
  HelpCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Activity, 
  PhoneCall, 
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface Playbook {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string;
  updated_at: string;
}

export default function OperationalPlaybooksPage() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  useEffect(() => {
    fetchApi<{ data: Playbook[] }>('/api/v2/playbooks')
      .then(res => setPlaybooks(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = playbooks.filter(pb => {
    const matchesCategory = categoryFilter === 'ALL' || pb.category === categoryFilter;
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      !search ||
      pb.title.toLowerCase().includes(searchLower) ||
      pb.content.toLowerCase().includes(searchLower) ||
      pb.tags.toLowerCase().includes(searchLower);

    return matchesCategory && matchesSearch;
  });

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'TRIAGE_PROTOCOLS':
        return 'bg-rose-950/60 text-rose-300 border-rose-800';
      case 'INFRASTRUCTURE':
        return 'bg-sky-950/60 text-sky-300 border-sky-800';
      case 'RESOURCE_SURGE':
        return 'bg-amber-950/60 text-amber-300 border-amber-800';
      default:
        return 'bg-purple-950/60 text-purple-300 border-purple-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Operational Playbooks & Guidance
            </h1>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
              Clinical & Dispatch Directives
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Standard operating procedures, mass-casualty dispersal rules, and telemetry outage contingency playbooks.
          </p>
        </div>

        <Link
          href="/docs"
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded-lg border border-slate-700 transition"
        >
          <span>Architecture Docs</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </Link>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search operational protocols by title, tag, or keyword..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {['ALL', 'TRIAGE_PROTOCOLS', 'INFRASTRUCTURE', 'RESOURCE_SURGE'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-purple-600/20 text-purple-400 border-purple-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Playbooks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 p-12 text-center text-slate-500 text-sm">
            Loading operational playbooks...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-2 p-12 text-center text-slate-500 text-sm">
            No operational playbooks found matching your search.
          </div>
        ) : (
          filtered.map((pb) => (
            <div 
              key={pb.id} 
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4 hover:border-slate-700 transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${getCategoryColor(pb.category)}`}>
                    {pb.category.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {pb.id}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white tracking-tight">
                  {pb.title}
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {pb.content}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-slate-400">Tags:</span>
                  {pb.tags.split(',').map((tag, idx) => (
                    <span key={idx} className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-400">
                      #{tag.trim()}
                    </span>
                  ))}
                </div>
                <span>Updated: {new Date(pb.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Action Directive Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex items-start gap-4">
        <div className="p-3 bg-red-950/60 text-red-400 border border-red-800 rounded-lg shrink-0">
          <PhoneCall className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Critical Operator Escalation Protocol
          </h4>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            For unresolvable hospital feed blackouts or multi-hospital resource gridlock exceeding 20 minutes, initiate immediate voice escalation to the 108 Tri-State Central Command Dispatch Desk (Tricity Toll-Free: 108 / PGI Emergency EPABX: +91-172-2747585).
          </p>
        </div>
      </div>
    </div>
  );
}
