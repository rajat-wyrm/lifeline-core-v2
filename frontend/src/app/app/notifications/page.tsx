'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  Building2, 
  ExternalLink 
} from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  type: 'ALERT' | 'EXPIRY' | 'SYNC' | 'SYSTEM';
  timestamp: string;
  read: boolean;
  link?: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'ICU Hold Pending Confirmation (Ambulance AMB-108-04)',
    description: 'Reservation RES-1729-994 at PGIMER Chandigarh has 2 minutes remaining on its road-ETA TTL buffer.',
    type: 'EXPIRY',
    timestamp: '2 minutes ago',
    read: false,
    link: '/app/reservations/expiring'
  },
  {
    id: 'notif-2',
    title: 'High Contention Divert Active in Sector 32',
    description: 'GMCH Chandigarh bed utilization crossed 85%. Fallback routing policy has been engaged.',
    type: 'ALERT',
    timestamp: '14 minutes ago',
    read: false,
    link: '/app/alerts'
  },
  {
    id: 'notif-3',
    title: 'Telemetry Feed Sync Completed',
    description: 'Batch status reconciliation updated 50 Tricity hospitals. 0 double-allocations detected.',
    type: 'SYNC',
    timestamp: '35 minutes ago',
    read: true,
    link: '/app/reservations/reconciliation'
  },
  {
    id: 'notif-4',
    title: 'C++ Allocation Engine Heartbeat OK',
    description: 'Fine-grained mutex striping operational on port 8081. Catch2 test assertion baseline verified.',
    type: 'SYSTEM',
    timestamp: '1 hour ago',
    read: true,
    link: '/app/observability/health'
  }
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const toggleRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: !n.read } : n));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-sky-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Notification Center
            </h1>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
              Operator Alert Broadcasts
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time emergency hold alerts, telemetry drift warnings, and system announcements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-lg border border-slate-700 transition cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
            Mark all read
          </button>
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 text-xs px-3 py-2 rounded-lg border border-slate-700 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            You are all caught up! No active notifications.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {notifications.map((notif) => (
              <div 
                key={notif.id}
                className={`p-5 transition flex items-start justify-between gap-4 ${
                  notif.read ? 'bg-slate-900/40 opacity-75' : 'bg-slate-900 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1">
                  <div className={`p-2.5 rounded-lg border shrink-0 ${
                    notif.type === 'ALERT'
                      ? 'bg-rose-950/60 text-rose-400 border-rose-800'
                      : notif.type === 'EXPIRY'
                      ? 'bg-amber-950/60 text-amber-400 border-amber-800'
                      : notif.type === 'SYNC'
                      ? 'bg-sky-950/60 text-sky-400 border-sky-800'
                      : 'bg-purple-950/60 text-purple-400 border-purple-800'
                  }`}>
                    {notif.type === 'ALERT' && <AlertTriangle className="w-4 h-4" />}
                    {notif.type === 'EXPIRY' && <Clock className="w-4 h-4" />}
                    {notif.type === 'SYNC' && <Building2 className="w-4 h-4" />}
                    {notif.type === 'SYSTEM' && <ShieldCheck className="w-4 h-4" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-white">
                        {notif.title}
                      </span>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {notif.description}
                    </p>
                    <div className="text-[11px] text-slate-500 font-mono pt-1">
                      {notif.timestamp}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {notif.link && (
                    <Link
                      href={notif.link}
                      className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/80 transition"
                    >
                      <span>Action</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                  <button
                    onClick={() => toggleRead(notif.id)}
                    className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1.5 rounded transition cursor-pointer"
                  >
                    {notif.read ? 'Mark unread' : 'Done'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
