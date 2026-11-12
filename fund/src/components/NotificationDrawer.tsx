import React from 'react';
import { X, Bell, AlertTriangle, Calendar, Award, Check } from 'lucide-react';
import type { NotificationItem } from '../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkRead: (id: string | number) => void;
  onNavigate: (view: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onNavigate
}) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'upcoming_auction':
        return <Calendar className="w-4 h-4 text-amber-600" />;
      case 'overdue_installment':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'pending_prize_payment':
        return <Award className="w-4 h-4 text-indigo-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div id="notifications-backdrop" className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-sm bg-white shadow-2xl border-l border-slate-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-slate-700" />
              <h3 className="font-bold text-slate-900 text-sm">Notifications & Reminders</h3>
              {unreadCount > 0 && (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No reminders or alerts at this time.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.notificationId}
                  className={`p-3 rounded-lg my-1 transition text-xs ${
                    notif.isRead ? 'bg-white opacity-80' : 'bg-amber-50/50 border border-amber-200/50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 bg-white rounded-md shadow-xs border border-slate-100 shrink-0 mt-0.5">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-slate-900 truncate">{notif.title}</span>
                        {!notif.isRead && (
                          <button
                            onClick={() => onMarkRead(notif.notificationId)}
                            title="Mark as read"
                            className="text-slate-400 hover:text-emerald-600 p-0.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-slate-600 text-[11px] mt-1 leading-relaxed">{notif.message}</p>
                      {notif.dueDate && (
                        <span className="inline-block mt-1.5 text-[10px] font-mono text-amber-800 font-semibold bg-amber-100/70 px-1.5 py-0.2 rounded">
                          Due Date: {notif.dueDate}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer with quick action */}
          <div className="p-3 border-t border-slate-200 bg-slate-50 flex gap-2 text-xs">
            <button
              onClick={() => {
                onNavigate('auctions');
                onClose();
              }}
              className="flex-1 py-1.5 px-2 text-center rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium"
            >
              Auctions
            </button>
            <button
              onClick={() => {
                onNavigate('installments');
                onClose();
              }}
              className="flex-1 py-1.5 px-2 text-center rounded bg-amber-600 text-white hover:bg-amber-700 font-medium shadow-xs"
            >
              View Overdues
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
