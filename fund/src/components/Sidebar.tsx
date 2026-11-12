import React from 'react';
import {
  LayoutDashboard, Users, Coins, Ticket, CalendarDays, Receipt, Gavel,
  PieChart, Award, Wallet, FileBarChart, ShieldCheck, Settings, History,
  Building2, Bell, Scale, FileText, FileWarning, X, MapPin, Gift
} from 'lucide-react';
import type { UserRole } from '../types';
import { Logo } from './Logo';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  userRole: UserRole;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

// 1. admin control)
const ADMIN_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'chit-groups', label: 'Chit Groups', icon: Coins },
  { id: 'members', label: 'Members', icon: Ticket },
  { id: 'installments', label: 'Installments', icon: CalendarDays },
  { id: 'payments', label: 'Payments', icon: Receipt },
  { id: 'auctions', label: 'Auctions', icon: Gavel },
  { id: 'kuzhukkal', label: 'Kuzhukkal (Lucky Draw)', icon: Gift },
  { id: 'dividends', label: 'Dividends', icon: PieChart },
  { id: 'prize-payments', label: 'Prize Payments', icon: Award },
  { id: 'expenses', label: 'Expenses', icon: Wallet },
  { id: 'reports', label: 'Reports', icon: FileBarChart },
  { id: 'daily-collection', label: 'Daily Collection', icon: CalendarDays },
  { id: 'monthly-collection', label: 'Monthly Collection', icon: Receipt },
  { id: 'balance-sheet', label: 'Balance Sheet', icon: Scale },
  { id: 'routes', label: 'Collection Routes', icon: MapPin },
  { id: 'users', label: 'User Management', icon: ShieldCheck },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'audit-logs', label: 'Audit Log', icon: History },
];

const STAFF_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'chit-groups', label: 'Chit Groups', icon: Coins },
  { id: 'members', label: 'Members', icon: Ticket },
  { id: 'installments', label: 'Installments', icon: CalendarDays },
  { id: 'payments', label: 'Payments', icon: Receipt },
  { id: 'auctions', label: 'Auctions', icon: Gavel },
  { id: 'kuzhukkal', label: 'Kuzhukkal (Lucky Draw)', icon: Gift },
  { id: 'dividends', label: 'Dividends', icon: PieChart },
  { id: 'prize-payments', label: 'Prize Payments', icon: Award },
  { id: 'expenses', label: 'Expenses', icon: Wallet },
  { id: 'reports', label: 'Reports', icon: FileBarChart },
  { id: 'daily-collection', label: 'Daily Collection', icon: CalendarDays },
  { id: 'monthly-collection', label: 'Monthly Collection', icon: Receipt },
  { id: 'balance-sheet', label: 'Balance Sheet', icon: Scale },
  { id: 'routes', label: 'Collection Routes', icon: MapPin },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// 3. agent control
const AGENT_ITEMS: NavItem[] = [
  { id: 'agent-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'agent-customers', label: 'My Customers', icon: Users },
  { id: 'daily-collection', label: 'Daily Collection', icon: CalendarDays },
  { id: 'monthly-collection', label: 'My Monthly Collections', icon: Receipt },
  { id: 'balance-sheet', label: 'Pending Dues', icon: Scale },
  { id: 'agent-collection', label: 'Collection Sheet', icon: FileText },
  { id: 'agent-balance', label: 'Balance Due', icon: FileWarning },
  { id: 'agent-commission', label: 'Commission', icon: Award },
  { id: 'agent-receipts', label: 'Receipts', icon: History },
  { id: 'agent-notifications', label: 'Notifications', icon: Bell },
  { id: 'agent-settings', label: 'Profile/Settings', icon: Settings },
];

const normalizeRole = (role: unknown): 'admin' | 'staff' | 'agent' | null => {
  const v = String(role ?? '').toLowerCase().trim();
  if (v.includes('agent')) return 'agent';
  if (v === 'admin' || v === 'staff') return v;
  return null;
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  userRole,
  isOpenMobile,
  onCloseMobile
}) => {
  const role = normalizeRole(userRole);

  // Select navigation list based on user role
  let items: NavItem[] = [];
  if (role === 'admin') {
    items = ADMIN_ITEMS;
  } else if (role === 'staff') {
    items = STAFF_ITEMS;
  } else if (role === 'agent') {
    items = AGENT_ITEMS;
  }

  const isItemActive = (id: string) =>
    currentView === id || (id === 'agent-customers' && currentView === 'customers');

  return (
    <>
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out border-r border-slate-800 lg:static lg:w-64 lg:z-auto lg:translate-x-0 shrink-0 ${isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
          }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 shrink-0 flex items-center justify-center">
              <Logo className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-extrabold text-amber-400 tracking-wide truncate">JIVAN CHIT FUNDS</h1>
              <p className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold truncate">Fund Management</p>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.id);
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => {
                  onNavigate(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 sm:py-2.5 min-h-[44px] rounded-lg text-xs font-medium transition-all ${active
                    .toString() === 'true'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/20'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-slate-950' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800 bg-slate-950/30">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-800/60 rounded-lg text-xs border border-slate-700/60">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${role === 'admin' ? 'bg-amber-400' : role === 'agent' ? 'bg-teal-400' : 'bg-sky-400'}`} />
              <span className="text-slate-200 capitalize font-medium">
                {role === 'agent' ? 'Agent Mode' : role === 'staff' ? 'Staff Mode' : 'Admin Mode'}
              </span>
            </div>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
              {role === 'admin' ? 'Full Access' : 'Restricted'}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};