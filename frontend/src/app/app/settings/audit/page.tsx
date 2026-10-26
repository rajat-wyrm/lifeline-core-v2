'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  ArrowLeft, 
  FileText, 
  RefreshCw, 
  Search, 
  FileCode2, 
  ChevronDown, 
  ChevronUp, 
  Lock 
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface AdminAuditLog {
  id: number;
  correlation_id: string;
  action: string;
  payload: any;
  created_at: string;
}

export default function AdminAuditTrailPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadAudit = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<{ data: AdminAuditLog[] }>('/api/v2/observability/events');
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
  }, []);

  const filtered = logs.filter((l) => {
    const searchLower = search.toLowerCase();
    return (
      !search ||
      l.action.toLowerCase().includes(searchLower) ||
      (l.correlation_id && l.correlation_id.toLowerCase().includes(searchLower)) ||
      JSON.stringify(l.payload || {}).toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <Link href="/app/settings" className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Settings Hub
        </Link>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              Administrative Governance & Settings Audit Trail
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Cryptographically correlated audit trail of policy modifications, account permissions, and system tuning.
            </p>
          </div>

          <button
            onClick={loadAudit}
            disabled={loading}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded-lg border border-slate-700 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by Action, Operator, Correlation ID, or Payload..."
          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500 transition"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Audit Trail ({filtered.length} Entries)</span>
          <span>PostgreSQL Append-Only Audit Store</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 font-mono text-sm">
            Loading governance audit trail...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No administrative audit entries found.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filtered.map((log) => {
              const isExpanded = expandedId === log.id;
              return (
                <div key={log.id} className="p-4 hover:bg-slate-800/30 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white">
                          {log.action}
                        </span>
                        <span className="text-[10px] font-mono bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                          #{log.id}
                        </span>
                        {log.correlation_id && (
                          <span className="text-[10px] font-mono text-sky-400">
                            CID: {log.correlation_id}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-1">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 transition cursor-pointer"
                    >
                      <FileCode2 className="w-3 h-3 text-emerald-400" />
                      <span>{isExpanded ? 'Hide Payload' : 'Inspect Payload'}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto max-h-64">
                      <pre>{JSON.stringify(log.payload, null, 2)}</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
