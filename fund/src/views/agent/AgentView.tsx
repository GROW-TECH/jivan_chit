import React, { useState, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Receipt,
  Scale,
  FileText,
  FileWarning,
  Award,
  Bell,
  History,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  Settings
} from 'lucide-react';
import type { User } from '../../types';
import { AgentDashboard } from './AgentDashboard';
import { CollectionSheet } from './CollectionSheet';
import { BalanceDueBills } from './BalanceDueBills';
import { AgentReceipts } from './AgentReceipts';
import { AgentCommission } from './AgentCommission';
import { AgentNotifications } from './AgentNotifications';
import { AgentProfile } from './AgentProfile';
import { DailyCollectionView } from '../staff/DailyCollectionView';
import { MonthlyCollectionView } from '../staff/MonthlyCollectionView';
import { BalanceSheetView } from '../staff/BalanceSheetView';
import { CustomersView } from '../staff/CustomersView';

export type AgentViewId =
  | 'agent-dashboard'
  | 'agent-customers'
  | 'customers'
  | 'daily-collection'
  | 'monthly-collection'
  | 'balance-sheet'
  | 'agent-collection'
  | 'agent-commission'
  | 'agent-notifications'
  | 'agent-balance'
  | 'agent-receipts'
  | 'agent-settings';

export const AGENT_VIEW_IDS: AgentViewId[] = [
  'agent-dashboard',
  'agent-customers',
  'customers',
  'daily-collection',
  'monthly-collection',
  'balance-sheet',
  'agent-collection',
  'agent-commission',
  'agent-notifications',
  'agent-balance',
  'agent-receipts',
  'agent-settings'
];

interface AgentViewProps {
  currentView: AgentViewId;
  onNavigate: (view: string) => void;
  user: User;
}

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}



export const AgentView: React.FC<AgentViewProps> = ({ currentView, onNavigate, user }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const agentName = user.fullName || user.username || 'Field Agent';

  const notify = useCallback((message: string, type: ToastItem['type'] = 'success') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto pb-24 lg:pb-8">


      {currentView === 'agent-dashboard' && (
        <AgentDashboard agentName={agentName} onNavigate={onNavigate} />
      )}
      {(currentView === 'agent-customers' || currentView === 'customers') && (
        <CustomersView userRole="agent" onOpenReceipt={() => { }} onNavigateToGroup={() => { }} />
      )}
      {currentView === 'daily-collection' && <DailyCollectionView userRole="agent" />}
      {currentView === 'monthly-collection' && <MonthlyCollectionView userRole="agent" currentUser={user} />}
      {currentView === 'balance-sheet' && <BalanceSheetView userRole="agent" />}
      {currentView === 'agent-collection' && (
        <CollectionSheet agentName={agentName} onNotify={notify} />
      )}
      {currentView === 'agent-balance' && (
        <BalanceDueBills agentName={agentName} onNotify={notify} />
      )}
      {currentView === 'agent-commission' && <AgentCommission agentName={agentName} />}
      {currentView === 'agent-receipts' && <AgentReceipts agentName={agentName} />}
      {currentView === 'agent-notifications' && <AgentNotifications />}
      {currentView === 'agent-settings' && <AgentProfile user={user} />}

      {/* Toast stack */}
      <div className="fixed right-3 sm:right-5 bottom-20 lg:bottom-6 z-[60] space-y-2 w-[calc(100%-1.5rem)] max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-2 p-3 rounded-xl border shadow-lg bg-white ${toast.type === 'success'
              ? 'border-emerald-200'
              : toast.type === 'error'
                ? 'border-rose-200'
                : 'border-sky-200'
              }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            )}
            <p className="flex-1 text-xs font-medium text-slate-800">{toast.message}</p>
            <button
              onClick={() => dismissToast(toast.id)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};