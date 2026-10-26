'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  FileText, 
  ArrowLeft, 
  Clock, 
  ShieldCheck, 
  RefreshCw, 
  FileCode2, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface RequestAuditLog {
  id: number;
  correlation_id: string;
  action: string;
  payload: any;
  created_at: string;
}

export default function RequestAuditPage() {
  const params = useParams();
  const requestId = params.requestId as string;

  const [auditLogs, setAuditLogs] = useState<RequestAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadAudit = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<{ audit: RequestAuditLog[] }>(`/api/v2/requests/${requestId}`);
      setAuditLogs(res.audit || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
  }, [requestId]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <Link href={`/app/requests/${requestId}`} className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Request Summary
        </Link>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              Incident Audit Log & Cryptographic Verification
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Request Correlation ID: {requestId}
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
            <Link href={`/app/requests/${requestId}`} className="px-3 py-1.5 rounded text-slate-400 hover:text-white transition">
              Overview
            </Link>
            <Link href={`/app/requests/${requestId}/allocation`} className="px-3 py-1.5 rounded text-slate-400 hover:text-white transition">
              Allocation
            </Link>
            <Link href={`/app/requests/${requestId}/timeline`} className="px-3 py-1.5 rounded text-slate-400 hover:text-white transition">
              Timeline
            </Link>
            <Link href={`/app/requests/${requestId}/audit`} className="px-3 py-1.5 rounded bg-slate-800 text-white font-medium">
              Audit
            </Link>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Incident Audit Entries ({auditLogs.length})</span>
          <button
            onClick={loadAudit}
            disabled={loading}
            className="flex items-center gap-1 hover:text-white transition cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 font-mono text-sm">
            Loading incident audit trail...
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No audit records found referencing incident {requestId}.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {auditLogs.map((log) => {
              const isExpanded = expandedId === log.id;
              return (
                <div key={log.id} className="p-4 hover:bg-slate-800/40 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white">
                          {log.action}
                        </span>
                        <span className="text-[10px] font-mono bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                          ID: #{log.id}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono mt-1">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800/60 border border-slate-700 transition cursor-pointer"
                    >
                      <FileCode2 className="w-3 h-3" />
                      <span>{isExpanded ? 'Hide Payload' : 'View Payload'}</span>
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
