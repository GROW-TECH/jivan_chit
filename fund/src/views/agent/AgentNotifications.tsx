import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, AlertTriangle, Clock, RefreshCw, Check } from 'lucide-react';
import { api } from '../../api/client';
import type { NotificationItem } from '../../types';

export const AgentNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id: string | number) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === Number(id) || n.notificationId === String(id) ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'overdue_installment':
        return <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />;
      case 'upcoming_installment':
        return <Clock className="w-5 h-5 text-amber-500 shrink-0" />;
      default:
        return <Bell className="w-5 h-5 text-sky-500 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-amber-500" />
            Agent Notifications & Alerts
          </h1>
          <p className="text-xs text-slate-500 mt-1">Real-time installment reminders, overdue notices, and collection alerts</p>
        </div>
        <button onClick={fetchNotifications} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Alerts</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw className="w-8 h-8 text-amber-500 animate-spin" /></div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs divide-y divide-slate-100">
          {notifications.map((n) => (
            <div key={n.id} className={`p-4 flex items-start justify-between gap-4 hover:bg-slate-50 transition ${!n.isRead ? 'bg-amber-50/40' : ''}`}>
              <div className="flex items-start gap-3">
                {getIcon(n.type)}
                <div>
                  <h3 className="text-xs font-bold text-slate-900">{n.title}</h3>
                  <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              </div>
              {!n.isRead && (
                <button
                  onClick={() => handleMarkRead(n.id)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 hover:text-amber-700 bg-amber-100/60 px-2.5 py-1 rounded-lg shrink-0"
                >
                  <Check className="w-3 h-3" />
                  Mark Read
                </button>
              )}
            </div>
          ))}
          {!notifications.length && (
            <div className="p-12 text-center text-slate-500 text-xs">No notifications at this time.</div>
          )}
        </div>
      )}
    </div>
  );
};
