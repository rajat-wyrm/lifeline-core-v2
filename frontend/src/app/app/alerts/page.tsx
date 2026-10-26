'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  RefreshCw, 
  PlusCircle, 
  Check, 
  Eye, 
  Building2,
  XCircle,
  Filter
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface AlertItem {
  id: string;
  hospital_id?: string | null;
  hospital_name?: string | null;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  code: string;
  message: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  created_at: string;
}

export default function AlertsHubPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED'>('ACTIVE');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // New alert form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newHospId, setNewHospId] = useState('HOSP-101');
  const [newSeverity, setNewSeverity] = useState<'CRITICAL' | 'WARNING' | 'INFO'>('WARNING');
  const [newCode, setNewCode] = useState('HIGH_CAPACITY_LOAD');
  const [newMessage, setNewMessage] = useState('');

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const queryParam = statusFilter === 'ALL' ? '' : `?status=${statusFilter}`;
      const res = await fetchApi<{ data: AlertItem[] }>(`/api/v2/alerts${queryParam}`);
      setAlerts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [statusFilter]);

  const handleAcknowledge = async (id: string) => {
    try {
      setActionLoading(id);
      await fetchApi(`/api/v2/alerts/${id}/acknowledge`, { method: 'POST' });
      await loadAlerts();
    } catch (err: any) {
      alert(`Acknowledge failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      setActionLoading(id);
      await fetchApi(`/api/v2/alerts/${id}/resolve`, { method: 'POST' });
      await loadAlerts();
    } catch (err: any) {
      alert(`Resolve failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading('create');
      await fetchApi('/api/v2/alerts', {
        method: 'POST',
        body: JSON.stringify({
          hospital_id: newHospId || undefined,
          severity: newSeverity,
          code: newCode,
          message: newMessage
        })
      });
      setShowCreateModal(false);
      setNewMessage('');
      await loadAlerts();
    } catch (err: any) {
      alert(`Create alert failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          bg: 'bg-rose-950/60 text-rose-300 border-rose-800',
          icon: ShieldAlert,
          label: 'CRITICAL'
        };
      case 'WARNING':
        return {
          bg: 'bg-amber-950/60 text-amber-300 border-amber-800',
          icon: AlertTriangle,
          label: 'WARNING'
        };
      default:
        return {
          bg: 'bg-sky-950/60 text-sky-300 border-sky-800',
          icon: Info,
          label: 'INFO'
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Operational Alerts Hub
            </h1>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
              Actionable Incident Management
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            System warnings, telemetry drift, feed freeze notifications, and facility capacity alerts across Tricity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs px-3.5 py-2 rounded-lg font-medium shadow transition cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Raise Alert
          </button>

          <button
            onClick={loadAlerts}
            disabled={loading}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-lg border border-slate-700 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        {(['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'ALL'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
              statusFilter === tab
                ? 'bg-amber-600/20 text-amber-400 border-amber-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Alerts Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {alerts.length} Alerts ({statusFilter})</span>
          <span>Fastify API • Explicit State Machine</span>
        </div>

        {alerts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            {loading ? 'Loading operational alerts...' : 'No operational alerts found for this filter.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {alerts.map((alt) => {
              const sev = getSeverityBadge(alt.severity);
              const SevIcon = sev.icon;

              return (
                <div key={alt.id} className="p-5 hover:bg-slate-800/40 transition">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5 flex-1">
                      <div className={`p-2.5 rounded-lg border shrink-0 ${sev.bg}`}>
                        <SevIcon className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${sev.bg}`}>
                            {sev.label}
                          </span>
                          <span className="font-semibold text-sm text-white font-mono">
                            {alt.code}
                          </span>
                          {alt.hospital_id && (
                            <Link
                              href={`/app/hospitals/${alt.hospital_id}`}
                              className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800"
                            >
                              <Building2 className="w-3 h-3" />
                              <span>{alt.hospital_name || alt.hospital_id}</span>
                            </Link>
                          )}
                          <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                            alt.status === 'ACTIVE' 
                              ? 'bg-red-950/80 text-red-400 border border-red-800/50' 
                              : alt.status === 'ACKNOWLEDGED'
                              ? 'bg-amber-950/80 text-amber-400 border border-amber-800/50'
                              : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                          }`}>
                            {alt.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {alt.message}
                        </p>

                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-3 pt-1">
                          <span>Raised: {new Date(alt.created_at).toLocaleString()}</span>
                          {alt.acknowledged_by && (
                            <span>Ack by: {alt.acknowledged_by} ({alt.acknowledged_at ? new Date(alt.acknowledged_at).toLocaleTimeString() : ''})</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      {alt.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleAcknowledge(alt.id)}
                          disabled={actionLoading === alt.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 border border-amber-800/60 rounded-lg text-xs font-medium transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Acknowledge
                        </button>
                      )}

                      {alt.status !== 'RESOLVED' && (
                        <button
                          onClick={() => handleResolve(alt.id)}
                          disabled={actionLoading === alt.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-300 border border-emerald-800/60 rounded-lg text-xs font-medium transition cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Raise Alert Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Raise Operational Alert</h3>
            <p className="text-xs text-slate-400 mb-4">
              Broadcasts an urgent situation notice to dispatch and bed-board telemetry hubs.
            </p>

            <form onSubmit={handleCreateAlert} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Severity Level
                </label>
                <select
                  value={newSeverity}
                  onChange={(e: any) => setNewSeverity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                >
                  <option value="CRITICAL">CRITICAL — Severe patient hazard or divert</option>
                  <option value="WARNING">WARNING — Feed lag, high load, capacity drift</option>
                  <option value="INFO">INFO — Operational status notice</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Hospital Facility
                </label>
                <input
                  type="text"
                  value={newHospId}
                  onChange={(e) => setNewHospId(e.target.value)}
                  placeholder="e.g. HOSP-101"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Alert Code
                </label>
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="e.g. MASS_CASUALTY_HOLD"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Incident Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Describe the operational incident or required action..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'create'}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-500 transition cursor-pointer"
                >
                  {actionLoading === 'create' ? 'Broadcasting...' : 'Publish Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
