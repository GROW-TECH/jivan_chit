import React from 'react';
import {
  Menu,
  Search,
  Bell,
  PlusCircle,
  LogOut,
  UserCheck,
  Shield,
  Briefcase
} from 'lucide-react';
import type { User } from '../types';

interface NavbarProps {
  currentUser: User | null;
  unreadNotifsCount: number;
  onOpenMobileMenu: () => void;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onQuickPayment: () => void;
  onSwitchDemoRole: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  unreadNotifsCount,
  onOpenMobileMenu,
  onOpenSearch,
  onOpenNotifications,
  onQuickPayment,
  onSwitchDemoRole,
  onLogout
}) => {
  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile Toggle & Global Search trigger */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          id="mobile-menu-btn"
          onClick={onOpenMobileMenu}
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 lg:hidden shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Button */}
        <button
          id="navbar-search-btn"
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100/80 text-slate-500 text-xs w-36 xs:w-48 sm:w-72 md:w-80 transition min-h-[40px]"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">Search customers, chits...</span>
          <kbd className="hidden sm:inline-block ml-auto text-[10px] bg-white px-1.5 py-0.5 border border-slate-300 rounded text-slate-400 font-mono">
            /
          </kbd>
        </button>
      </div>

      {/* Right: Quick Payment, Notifications, Role Switcher, Profile & Logout */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Quick Payment Action */}
        <button
          id="navbar-quick-payment-btn"
          onClick={onQuickPayment}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition min-h-[40px]"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Record Payment</span>
        </button>

        {/* Notifications Icon with Badge */}
        <button
          id="navbar-notifications-btn"
          onClick={onOpenNotifications}
          className="relative p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadNotifsCount > 0 && (
            <span className="absolute top-2 right-2 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
              {unreadNotifsCount}
            </span>
          )}
        </button>

        <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

        {/* Active Role Indicator Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
          {currentUser?.role === 'admin' ? (
            <Shield className="w-3.5 h-3.5 text-amber-600" />
          ) : currentUser?.role === 'staff' ? (
            <Briefcase className="w-3.5 h-3.5 text-sky-600" />
          ) : (
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
          )}
          <span>Role: <strong className="uppercase font-bold">{currentUser?.role || 'admin'}</strong></span>
        </div>

        {/* Demo Fast Role Switcher Action (Hidden in Agent Panel) */}
        {currentUser?.role !== 'agent' && (
          <button
            id="switch-demo-role-btn"
            onClick={onSwitchDemoRole}
            title="Click to switch session role"
            className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-600 transition"
          >
            <span>Switch to {currentUser?.role === 'admin' ? 'Staff' : 'Agent'}</span>
          </button>
        )}

        {/* Current User Pill */}
        <div className="flex items-center gap-2 pl-1">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
            {currentUser?.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="hidden xl:block text-left">
            <span className="block text-xs font-semibold text-slate-900 leading-none">
              {currentUser?.fullName}
            </span>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              {currentUser?.role}
            </span>
          </div>
        </div>

        {/* Logout */}
        <button
          id="logout-btn"
          onClick={onLogout}
          title="Sign out"
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
