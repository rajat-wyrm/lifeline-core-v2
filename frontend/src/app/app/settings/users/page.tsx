'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  ArrowLeft, 
  UserPlus, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  RefreshCw,
  Mail,
  Key 
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface UserAccount {
  id: string;
  email: string;
  role: 'DISPATCHER' | 'HOSPITAL_OPERATOR' | 'ADMIN' | 'AUDITOR' | 'VIEWER';
  full_name: string;
  hospital_id?: string | null;
  is_active: boolean;
  created_at: string;
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Lifeline@2026');
  const [role, setRole] = useState<'DISPATCHER' | 'HOSPITAL_OPERATOR' | 'ADMIN' | 'AUDITOR' | 'VIEWER'>('DISPATCHER');
  const [hospitalId, setHospitalId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<{ data: UserAccount[] }>('/api/v2/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await fetchApi('/api/v2/users', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          role,
          full_name: fullName,
          hospital_id: hospitalId || undefined
        })
      });
      setShowAddModal(false);
      setFullName('');
      setEmail('');
      setSuccess('Operator account provisioned successfully.');
      await loadUsers();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      alert(`User creation failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (r: string) => {
    switch (r) {
      case 'ADMIN':
        return 'bg-purple-950 text-purple-300 border-purple-800';
      case 'DISPATCHER':
        return 'bg-rose-950 text-rose-300 border-rose-800';
      case 'HOSPITAL_OPERATOR':
        return 'bg-sky-950 text-sky-300 border-sky-800';
      case 'AUDITOR':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Link href="/app/settings" className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Settings Hub
        </Link>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              Operator Accounts & Role-Based Access Control (RBAC)
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage operator credentials, roles, facility scopes, and active session permissions.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs px-3.5 py-2 rounded-lg font-medium shadow transition cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Provision Operator
          </button>
        </div>
      </div>

      {success && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Registered Operator Accounts ({users.length})</span>
          <button
            onClick={loadUsers}
            disabled={loading}
            className="flex items-center gap-1 hover:text-white transition cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 font-mono text-sm">
            Loading operator accounts...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No operator accounts found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3">Account ID</th>
                  <th className="px-5 py-3">Operator Name</th>
                  <th className="px-5 py-3">Email Address</th>
                  <th className="px-5 py-3">RBAC Role</th>
                  <th className="px-5 py-3">Assigned Hospital</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-5 py-3 font-mono font-bold text-sky-400">
                      {u.id}
                    </td>
                    <td className="px-5 py-3 font-semibold text-white">
                      {u.full_name}
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-300">
                      {u.email}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${getRoleBadge(u.role)}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-400">
                      {u.hospital_id ? (
                        <Link href={`/app/hospitals/${u.hospital_id}`} className="hover:text-white underline">
                          {u.hospital_id}
                        </Link>
                      ) : (
                        <span className="text-slate-600">Global</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                        {u.is_active ? 'ACTIVE' : 'SUSPENDED'}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Operator Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Provision New Operator Account</h3>
            <p className="text-xs text-slate-400 mb-4 font-mono">
              Generates secure credentials and assigns role permissions.
            </p>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Paramedic Vikram Singh"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vikram@lifeline.local"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Temporary Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  >
                    <option value="DISPATCHER">DISPATCHER</option>
                    <option value="HOSPITAL_OPERATOR">HOSPITAL_OPERATOR</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="AUDITOR">AUDITOR</option>
                    <option value="VIEWER">VIEWER</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Facility Scope
                  </label>
                  <input
                    type="text"
                    value={hospitalId}
                    onChange={(e) => setHospitalId(e.target.value)}
                    placeholder="e.g. HOSP-101"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
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
                  {submitting ? 'Provisioning...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
