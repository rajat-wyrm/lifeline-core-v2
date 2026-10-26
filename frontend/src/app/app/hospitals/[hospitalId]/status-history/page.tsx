'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  History, 
  ArrowLeft, 
  Building2, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  PlusCircle, 
  CheckCircle2 
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface StatusHistoryRecord {
  id: number;
  previous_status: string;
  new_status: string;
  reason: string;
  changed_by: string;
  created_at: string;
}

export default function HospitalStatusHistoryPage() {
  const params = useParams();
  const hospitalId = params.hospitalId as string;

  const [history, setHistory] = useState<StatusHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStatus, setNewStatus] = useState('NORMAL');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<{ history: StatusHistoryRecord[] }>(`/api/v2/hospitals/${hospitalId}/status-history`);
      setHistory(res.history);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [hospitalId]);

  const handleAddStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await fetchApi(`/api/v2/hospitals/${hospitalId}/status-history`, {
        method: 'POST',
        body: JSON.stringify({
          new_status: newStatus,
          reason,
          changed_by: 'OPERATOR'
        })
      });
      setShowAddModal(false);
      setReason('');
      setSuccess('Status transition logged to PostgreSQL history ledger.');
      await loadHistory();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      alert(`Log failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

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
              <History className="w-5 h-5 text-sky-400" />
              Operational Status Transition Ledger
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
            <Link href={`/app/hospitals/${hospitalId}/status-history`} className="px-3 py-1.5 rounded bg-slate-800 text-white font-medium">
              History
            </Link>
            <Link href={`/app/hospitals/${hospitalId}/audit`} className="px-3 py-1.5 rounded text-slate-400 hover:text-white transition">
              Audit
            </Link>
          </div>
        </div>
      </div>

      {success && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {/* Action Button Bar */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs px-3.5 py-2 rounded-lg font-medium shadow transition cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Record Status Change
        </button>

        <button
          onClick={loadHistory}
          disabled={loading}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-lg border border-slate-700 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* History Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Audit of Facility Operational Status & Divert History</span>
          <span>PostgreSQL `hospital_status_history`</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 font-mono text-sm">
            Loading status history...
          </div>
        ) : history.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No status change events recorded for this hospital. Initialized in NORMAL state.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3">Event ID</th>
                  <th className="px-5 py-3">Previous Status</th>
                  <th className="px-5 py-3">New Status</th>
                  <th className="px-5 py-3">Clinical / Operational Reason</th>
                  <th className="px-5 py-3">Operator</th>
                  <th className="px-5 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {history.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-5 py-3 font-mono text-slate-400">#{rec.id}</td>
                    <td className="px-5 py-3 font-mono text-slate-400">{rec.previous_status || 'INITIAL'}</td>
                    <td className="px-5 py-3 font-mono">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rec.new_status === 'DIVERT'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : rec.new_status === 'BUSY'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}>
                        {rec.new_status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-200">{rec.reason}</td>
                    <td className="px-5 py-3 font-mono text-slate-400">{rec.changed_by}</td>
                    <td className="px-5 py-3 font-mono text-slate-500">
                      {new Date(rec.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">
              Transition Operational Status
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-mono">
              Declare divert or return facility to normal allocation eligibility.
            </p>

            <form onSubmit={handleAddStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                >
                  <option value="NORMAL">NORMAL — Available for emergency allocation</option>
                  <option value="BUSY">BUSY — High surge, penalty applied to scoring</option>
                  <option value="DIVERT">DIVERT — Total divert, excluded from candidates</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Operational Reason
                </label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Mass-casualty triage overload in ED; CT Scanner maintenance downtime"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-500 transition cursor-pointer"
                >
                  {submitting ? 'Recording...' : 'Commit Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
