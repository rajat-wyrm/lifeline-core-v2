'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Clock, 
  ArrowLeft, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Radio, 
  ShieldCheck, 
  Truck, 
  FileText 
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface TimelineEvent {
  stage: string;
  timestamp: string;
  description: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';
}

export default function RequestTimelinePage() {
  const params = useParams();
  const requestId = params.requestId as string;

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi<{ request_id: string; timeline: TimelineEvent[] }>(`/api/v2/requests/${requestId}/timeline`)
      .then(res => setEvents(res.timeline))
      .catch(console.error)
      .finally(() => setLoading(false));
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
              <Clock className="w-5 h-5 text-purple-400" />
              Incident Lifecycle & Dispatch Timeline
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
            <Link href={`/app/requests/${requestId}/timeline`} className="px-3 py-1.5 rounded bg-slate-800 text-white font-medium">
              Timeline
            </Link>
            <Link href={`/app/requests/${requestId}/audit`} className="px-3 py-1.5 rounded text-slate-400 hover:text-white transition">
              Audit
            </Link>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 font-mono text-sm">
          Loading incident timeline...
        </div>
      ) : events.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-sm">
          No chronological timeline records found for request {requestId}.
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <div className="relative pl-6 border-l-2 border-slate-800 space-y-8 my-2">
            {events.map((ev, idx) => (
              <div key={idx} className="relative group">
                {/* Node indicator */}
                <div className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 border-slate-900 ${
                  ev.status === 'COMPLETED'
                    ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                    : ev.status === 'IN_PROGRESS'
                    ? 'bg-sky-500 animate-pulse'
                    : 'bg-slate-700'
                }`} />

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">
                      {ev.stage}
                    </span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      ev.status === 'COMPLETED'
                        ? 'bg-emerald-950 text-emerald-400'
                        : 'bg-sky-950 text-sky-400'
                    }`}>
                      {ev.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">
                    {ev.description}
                  </p>

                  <div className="text-[11px] font-mono text-slate-500">
                    {new Date(ev.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
