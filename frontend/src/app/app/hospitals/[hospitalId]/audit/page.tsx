'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  FileText, 
  ArrowLeft, 
  Building2, 
  Clock, 
  RefreshCw, 
  ShieldCheck, 
  FileCode2, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface AuditLogRecord {
  id: number;
  correlation_id: string;
  action: string;
  payload: any;
  created_at: string;
}

export default function HospitalAuditPage() {
  const params = useParams();
  const hospitalId = params.hospitalId as string;

  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadAudit = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<{ audit: AuditLogRecord[] }>(`/api/v2/hospitals/${hospitalId}/audit`);
      setAuditLogs(res.audit);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
  }, [hospitalId]);

  return (
    <div className="space-y-6">
      {/* Sub-nav header */}
      <div className="space-y-2">
        <Link href={`/app/hospitals/${hospitalId}`} className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Facility Overview
        </Link>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              Facility Compliance & Immutable Audit Log
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Facility: {hospitalId}
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
            <Link href={`/app/hospitals/${hospitalId}`} className="px-3 py-1.5 rounded text-slate-400 hover:text-white transition">
              Overview
            </Link>
            <Link href={`/app/hospitals/${hospitalId}/resources`} className="px-3 py-1.5 rounded text-slate-400 hover:text-white transition">
              Resources
            </Link>
            <Link href={`/app/hospitals/${hospitalId}/capabilities`} className="px-3 py-1.5 rounded text-slate-400 hover:text-white transition">
              Capabilities
            </Link>
            <Link href={`/app/hospitals/${hospitalId}/feed-health`} className="px-3 py-1.5 rounded text-slate-400 hover:text-white transition">
              Feed Health
            </Link>
            <Link href={`/app/hospitals/${hospitalId}/status-history`} className="px-3 py-1.5 rounded text-slate-400 hover:text-white transition">
              History
            </Link>
            <Link href={`/app/hospitals/${hospitalId}/audit`} className="px-3 py-1.5 rounded bg-slate-800 text-white font-medium">
              Audit
            </Link>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Recorded Compliance Audit Entries ({auditLogs.length})</span>
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
            Loading facility audit trail...
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No audit records found referencing facility {hospitalId}.
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
                        {log.correlation_id && (
                          <span className="text-[10px] font-mono bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                            CID: {log.correlation_id}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono mt-1">
                        {new Date(log.created_at).toLocaleString()} • Audit Record #{log.id}
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
