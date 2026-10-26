'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  CheckCircle2, 
  ArrowLeft, 
  Building2, 
  ShieldAlert, 
  Clock, 
  MapPin, 
  FileCode2, 
  ChevronDown, 
  ChevronUp, 
  Activity 
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface SingleAllocationResponse {
  allocation: {
    id: string;
    hospital_id: string;
    hospital_name: string;
    latitude: number;
    longitude: number;
    resource_type: string;
    request_id: string;
    ambulance_id: string;
    state: string;
    created_at_ms: number;
    expires_at_ms: number;
    updated_at: string;
    trauma_score?: number;
    patient_age?: number;
    origin_latitude?: number;
    origin_longitude?: number;
  };
  decision_trace?: any;
}

export default function SingleAllocationPage() {
  const params = useParams();
  const allocationId = params.allocationId as string;

  const [data, setData] = useState<SingleAllocationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTrace, setExpandedTrace] = useState(true);

  useEffect(() => {
    fetchApi<SingleAllocationResponse>(`/api/v2/allocations/${allocationId}`)
      .then(res => setData(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [allocationId]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <Link href="/app/allocations" className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Decisions Archive
        </Link>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Allocation Decision Record: {allocationId}
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Reservation Hold ID: {allocationId}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 font-mono text-sm">
          Loading allocation decision record...
        </div>
      ) : !data || !data.allocation ? (
        <div className="p-12 text-center text-slate-500 text-sm">
          Decision record {allocationId} not found.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Info Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                  Assigned Healthcare Facility
                </span>
                <div className="text-lg font-bold text-white flex items-center gap-2 mt-0.5">
                  <Building2 className="w-4 h-4 text-sky-400" />
                  <Link href={`/app/hospitals/${data.allocation.hospital_id}`} className="hover:underline">
                    {data.allocation.hospital_name}
                  </Link>
                  <span className="text-xs font-mono text-slate-400">({data.allocation.hospital_id})</span>
                </div>
              </div>

              <span className={`text-xs font-mono px-3 py-1 rounded-lg border font-bold ${
                data.allocation.state === 'HELD'
                  ? 'bg-amber-950 text-amber-300 border-amber-800'
                  : data.allocation.state === 'CONFIRMED'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-rose-950 text-rose-300 border-rose-800'
              }`}>
                {data.allocation.state}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase">Resource Held</span>
                <div className="text-sm font-bold text-white font-mono mt-1">
                  {data.allocation.resource_type}
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase">Ambulance Call Sign</span>
                <div className="text-sm font-bold text-sky-400 font-mono mt-1">
                  {data.allocation.ambulance_id || 'Manual'}
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase">Patient Acuity</span>
                <div className="text-sm font-bold text-rose-400 font-mono mt-1">
                  {data.allocation.trauma_score ? `Trauma ${data.allocation.trauma_score}/5` : 'Standard'}
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase">Hold Created</span>
                <div className="text-xs font-mono text-slate-300 mt-1">
                  {new Date(data.allocation.created_at_ms).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>

          {/* Decision Trace Payload */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-white">Algorithmic Decision Trace</span>
              </div>
              <button
                onClick={() => setExpandedTrace(!expandedTrace)}
                className="flex items-center gap-1 hover:text-white transition cursor-pointer"
              >
                <span>{expandedTrace ? 'Collapse' : 'Expand'}</span>
                {expandedTrace ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {expandedTrace && (
              <div className="p-4 bg-slate-950 text-xs font-mono text-emerald-400 overflow-x-auto max-h-96">
                <pre>{JSON.stringify(data.decision_trace || { note: 'Direct reservation ledger record' }, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
