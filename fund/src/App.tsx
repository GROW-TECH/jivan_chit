import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Coins, Receipt, CalendarDays, Wallet, FileText, Menu as MenuIcon } from 'lucide-react';
import { api } from './api/client';
import type { User, PaymentReceipt, NotificationItem, UserRole } from './types';

// Components
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { PaymentReceiptModal } from './components/PaymentReceiptModal';
import { AgentView, AGENT_VIEW_IDS } from './views/agent/AgentView';
import type { AgentViewId } from './views/agent/AgentView';

// Views (staff)
import { LoginView } from './components/auth/LoginView';
import { DashboardView } from './views/staff/DashboardView';
import { CustomersView } from './views/staff/CustomersView';
import { ChitGroupsView } from './views/staff/ChitGroupsView';
import { MembersView } from './views/staff/MembersView';
import { InstallmentsView } from './views/staff/InstallmentsView';
import { PaymentsView } from './views/staff/PaymentsView';
import { AuctionsView } from './views/staff/AuctionsView';
import { KuzhukkalView } from './views/staff/KuzhukkalView';
import { DailyCollectionView } from './views/staff/DailyCollectionView';
import { MonthlyCollectionView } from './views/staff/MonthlyCollectionView';
import { BalanceSheetView } from './views/staff/BalanceSheetView';
import { ChitBookingListView } from './views/staff/ChitBookingListView';

// Views (Admin)
import { DividendsView } from './views/admin/DividendsView';
import { PrizePaymentsView } from './views/admin/PrizePaymentsView';
import { ExpensesView } from './views/admin/ExpensesView';
import { ReportsView } from './views/admin/ReportsView';
import { UsersView } from './views/admin/UsersView';
import { RoutesView } from './views/admin/RoutesView';
import { SettingsView } from './views/admin/SettingsView';
import { AuditLogsView } from './views/admin/AuditLogsView';

interface AppProps {
  userRole?: 'admin' | 'staff' | 'agent';
}

const DEMO_AGENT_USER: User = {
  id: 9001,
  username: 'agent.demo',
  fullName: 'Ravi Kumar (Field Agent)',
  email: 'agent@chitfund.local',
  role: 'agent',
  status: 'active',
  createdAt: new Date().toISOString()
};

export default function App({ userRole: forcedRole }: AppProps = {}) {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Navigation State
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Global Search Modal State
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Notification Drawer State
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkNotifRead = async (id: string | number) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === Number(id) || n.notificationId === String(id) ? { ...n, isRead: true } : n
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Payment Receipt Modal State
  const [receiptToPrint, setReceiptToPrint] = useState<PaymentReceipt | null>(null);

  // Cross-Navigation Context States
  const [navTargetCustomerId, setNavTargetCustomerId] = useState<string | undefined>(undefined);
  const [navTargetGroupId, setNavTargetGroupId] = useState<string | undefined>(undefined);
  const [paymentContext, setPaymentContext] = useState<{
    customerId?: string;
    groupId?: string;
    membershipId?: string;
    installmentId?: string;
  }>({});

  // Check auth session on startup
  useEffect(() => {
    const token = localStorage.getItem('chitfund_token');
    if (token) {
      api
        .getCurrentUser()
        .then((userData) => {
          setUser(userData);
        })
        .catch(() => {
          api.logout();
          setUser(null);
        })
        .finally(() => {
          setAuthChecking(false);
        });
    } else {
      setAuthChecking(false);
    }
  }, []);

  // Global Keyboard Shortcut for Search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setCurrentView(loggedInUser.role === 'agent' ? 'agent-dashboard' : 'dashboard');
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setCurrentView('dashboard');
  };

  const handleRoleSwitch = async (targetRole: 'admin' | 'staff' | 'agent') => {
    try {
      const creds =
        targetRole === 'admin'
          ? { username: 'admin', password: 'admin123' }
          : targetRole === 'staff'
            ? { username: 'staff', password: 'staff123' }
            : { username: 'agent', password: 'agent123' };

      const res = await api.login(creds.username, creds.password);
      setUser(res.user);
      setCurrentView(res.user.role === 'agent' ? 'agent-dashboard' : 'dashboard');
    } catch (err: any) {
      alert(err.message || 'Failed to switch role');
    }
  };

  // Cross-view navigation handlers
  const handleNavigateToCustomer = (customerId: string) => {
    setNavTargetCustomerId(customerId);
    setCurrentView('customers');
  };

  const handleNavigateToGroup = (groupId: string) => {
    setNavTargetGroupId(groupId);
    setCurrentView('chit-groups');
  };

  const handlePayInstallment = (
    customerId: string,
    groupId: string,
    membershipId: string,
    installmentId?: string
  ) => {
    setPaymentContext({ customerId, groupId, membershipId, installmentId });
    setCurrentView('payments');
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-mono text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="tracking-widest uppercase text-slate-400">Loading Chit Fund System...</p>
        </div>
      </div>
    );
  }

  // If not logged in, display the login view (unless an agent role is forced)
  const isForcedAgent = forcedRole === 'agent';
  const displayUser = isForcedAgent ? DEMO_AGENT_USER : user;
  const rawRole = String(displayUser?.role ?? '').toLowerCase().trim();
  const effectiveRole: UserRole = rawRole.includes('agent') ? 'agent' : (rawRole === 'admin' || rawRole === 'staff') ? rawRole : (displayUser?.username === 'agent' ? 'agent' : 'staff');
  const isAgentView = effectiveRole === 'agent';

  if (!displayUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Agents get a role-gated in-shell Agent View (sidebar + navbar + agent tabs)
  const resolvedAgentView =
    isAgentView && AGENT_VIEW_IDS.includes(currentView as AgentViewId)
      ? currentView
      : isAgentView
        ? 'agent-dashboard'
        : currentView;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased">
      {/* Top Navbar */}
      <Navbar
        currentUser={displayUser}
        unreadNotifsCount={notifications.filter((n) => !n.isRead).length}
        onOpenMobileMenu={() => setSidebarOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenNotifications={() => {
          loadNotifications();
          setIsNotificationDrawerOpen(true);
        }}
        onQuickPayment={() => {
          if (isAgentView) {
            setCurrentView('agent-collection');
          } else {
            setPaymentContext({});
            setCurrentView('payments');
          }
        }}
        onSwitchDemoRole={() => {
          const nextRole =
            displayUser.role === 'admin'
              ? 'staff'
              : displayUser.role === 'staff'
                ? 'agent'
                : 'admin';
          handleRoleSwitch(nextRole);
        }}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Responsive Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={(viewId) => {
            // Clear specific target context on manual navigation
            if (viewId !== 'customers') setNavTargetCustomerId(undefined);
            if (viewId !== 'chit-groups') setNavTargetGroupId(undefined);
            if (viewId !== 'payments') setPaymentContext({});
            setCurrentView(viewId);
          }}
          userRole={effectiveRole}
          isOpenMobile={sidebarOpen}
          onCloseMobile={() => setSidebarOpen(false)}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto bg-slate-50/70 pb-20 lg:pb-0">
          {isAgentView ? (
            <AgentView
              user={displayUser}
              currentView={resolvedAgentView as AgentViewId}
              onNavigate={(viewId) => {
                setNavTargetCustomerId(undefined);
                setNavTargetGroupId(undefined);
                setPaymentContext({});
                setCurrentView(viewId);
              }}
            />
          ) : (
            <>
              {currentView === 'dashboard' && (
                <DashboardView
                  onNavigate={(viewId, id) => {
                    if (viewId === 'customers' && id) handleNavigateToCustomer(id);
                    else if (viewId === 'chit-groups' && id) handleNavigateToGroup(id);
                    else setCurrentView(viewId);
                  }}
                  onOpenReceipt={(receipt) => setReceiptToPrint(receipt)}
                  onRecordPayment={() => {
                    setPaymentContext({});
                    setCurrentView('payments');
                  }}
                />
              )}

              {currentView === 'customers' && (
                <CustomersView
                  initialCustomerId={navTargetCustomerId}
                  userRole={displayUser.role}
                  onOpenReceipt={(receipt) => setReceiptToPrint(receipt)}
                  onNavigateToGroup={handleNavigateToGroup}
                />
              )}

              {currentView === 'chit-groups' && (
                <ChitGroupsView
                  userRole={displayUser.role}
                  initialGroupId={navTargetGroupId}
                  onNavigateToCustomer={handleNavigateToCustomer}
                  onConductAuction={(groupId) => {
                    setNavTargetGroupId(groupId);
                    setCurrentView('auctions');
                  }}
                />
              )}

              {currentView === 'members' && (
                <MembersView
                  userRole={displayUser.role}
                  onNavigateToCustomer={handleNavigateToCustomer}
                  onNavigateToGroup={handleNavigateToGroup}
                  onPayInstallment={handlePayInstallment}
                />
              )}

              {currentView === 'installments' && (
                <InstallmentsView
                  userRole={displayUser.role}
                  onPayInstallment={handlePayInstallment}
                  onNavigateToCustomer={handleNavigateToCustomer}
                />
              )}

              {currentView === 'payments' && (
                <PaymentsView
                  userRole={displayUser.role}
                  initialCustomerId={paymentContext.customerId}
                  initialGroupId={paymentContext.groupId}
                  initialMembershipId={paymentContext.membershipId}
                  initialInstallmentId={paymentContext.installmentId}
                  onOpenReceipt={(receipt) => setReceiptToPrint(receipt)}
                  onNavigateToCustomer={handleNavigateToCustomer}
                />
              )}

              {currentView === 'auctions' && (
                <AuctionsView
                  userRole={displayUser.role}
                  initialGroupId={navTargetGroupId}
                  onNavigateToCustomer={handleNavigateToCustomer}
                />
              )}

              {currentView === 'kuzhukkal' && (
                <KuzhukkalView
                  userRole={displayUser.role}
                  initialGroupId={navTargetGroupId}
                  onNavigateToCustomer={handleNavigateToCustomer}
                />
              )}

              {currentView === 'dividends' && <DividendsView />}

              {currentView === 'chit-booking-list' && <ChitBookingListView />}

              {currentView === 'prize-payments' && (
                <PrizePaymentsView
                  userRole={displayUser.role}
                  onNavigateToCustomer={handleNavigateToCustomer}
                />
              )}

              {currentView === 'expenses' && <ExpensesView userRole={displayUser.role} />}

              {currentView === 'reports' && (
                <ReportsView
                  userRole={displayUser.role}
                  onNavigateToCustomer={handleNavigateToCustomer}
                />
              )}

              {currentView === 'routes' && (
                <RoutesView userRole={displayUser.role} currentUserId={displayUser.id} />
              )}

              {currentView === 'users' && (
                <UsersView userRole={displayUser.role} currentUserId={displayUser.id} />
              )}

              {currentView === 'settings' && <SettingsView userRole={displayUser.role} />}

              {currentView === 'audit-logs' && <AuditLogsView />}

              {currentView === 'daily-collection' && <DailyCollectionView userRole={displayUser.role} />}
              {currentView === 'monthly-collection' && <MonthlyCollectionView userRole={displayUser.role} currentUser={displayUser} />}
              {currentView === 'balance-sheet' && <BalanceSheetView userRole={displayUser.role} />}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (< lg screens) */}
      <nav
        id="mobile-bottom-nav"
        aria-label="Mobile Bottom Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 flex items-center justify-around shadow-lg"
      >
        {displayUser.role === 'agent' ? (
          <>
            <button
              onClick={() => setCurrentView('agent-dashboard')}
              className={`flex flex-col items-center justify-center py-1.5 px-3 min-h-[48px] rounded-lg text-[10px] font-semibold transition ${currentView === 'agent-dashboard' || currentView === 'dashboard' ? 'text-amber-800 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <LayoutDashboard className={`w-5 h-5 mb-0.5 ${currentView === 'agent-dashboard' ? 'text-amber-700' : 'text-slate-400'}`} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setCurrentView('agent-collection')}
              className={`flex flex-col items-center justify-center py-1.5 px-3 min-h-[48px] rounded-lg text-[10px] font-semibold transition ${currentView === 'agent-collection' ? 'text-amber-800 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <CalendarDays className={`w-5 h-5 mb-0.5 ${currentView === 'agent-collection' ? 'text-amber-700' : 'text-slate-400'}`} />
              <span>Collection</span>
            </button>

            <button
              onClick={() => setCurrentView('agent-balance')}
              className={`flex flex-col items-center justify-center py-1.5 px-3 min-h-[48px] rounded-lg text-[10px] font-semibold transition ${currentView === 'agent-balance' ? 'text-amber-800 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <Wallet className={`w-5 h-5 mb-0.5 ${currentView === 'agent-balance' ? 'text-amber-700' : 'text-slate-400'}`} />
              <span>Due Bills</span>
            </button>

            <button
              onClick={() => setCurrentView('agent-receipts')}
              className={`flex flex-col items-center justify-center py-1.5 px-3 min-h-[48px] rounded-lg text-[10px] font-semibold transition ${currentView === 'agent-receipts' ? 'text-amber-800 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <FileText className={`w-5 h-5 mb-0.5 ${currentView === 'agent-receipts' ? 'text-amber-700' : 'text-slate-400'}`} />
              <span>Receipts</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                setNavTargetCustomerId(undefined);
                setNavTargetGroupId(undefined);
                setCurrentView('dashboard');
              }}
              className={`flex flex-col items-center justify-center py-1.5 px-3 min-h-[48px] rounded-lg text-[10px] font-semibold transition ${currentView === 'dashboard' ? 'text-amber-800 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <LayoutDashboard className={`w-5 h-5 mb-0.5 ${currentView === 'dashboard' ? 'text-amber-700' : 'text-slate-400'}`} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => {
                setCurrentView('customers');
              }}
              className={`flex flex-col items-center justify-center py-1.5 px-3 min-h-[48px] rounded-lg text-[10px] font-semibold transition ${currentView === 'customers' ? 'text-amber-800 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <Users className={`w-5 h-5 mb-0.5 ${currentView === 'customers' ? 'text-amber-700' : 'text-slate-400'}`} />
              <span>Customers</span>
            </button>

            <button
              onClick={() => {
                setCurrentView('chit-groups');
              }}
              className={`flex flex-col items-center justify-center py-1.5 px-3 min-h-[48px] rounded-lg text-[10px] font-semibold transition ${currentView === 'chit-groups' ? 'text-amber-800 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <Coins className={`w-5 h-5 mb-0.5 ${currentView === 'chit-groups' ? 'text-amber-700' : 'text-slate-400'}`} />
              <span>Groups</span>
            </button>

            <button
              onClick={() => {
                setPaymentContext({});
                setCurrentView('payments');
              }}
              className={`flex flex-col items-center justify-center py-1.5 px-3 min-h-[48px] rounded-lg text-[10px] font-semibold transition ${currentView === 'payments' ? 'text-amber-800 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <Receipt className={`w-5 h-5 mb-0.5 ${currentView === 'payments' ? 'text-amber-700' : 'text-slate-400'}`} />
              <span>Payments</span>
            </button>

            <button
              onClick={() => setSidebarOpen(true)}
              className="flex flex-col items-center justify-center py-1.5 px-3 min-h-[48px] rounded-lg text-[10px] font-semibold text-slate-500 hover:text-slate-800 transition"
            >
              <MenuIcon className="w-5 h-5 mb-0.5 text-slate-400" />
              <span>More</span>
            </button>
          </>
        )}
      </nav>

      {/* Global Search Modal (Ctrl+K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={(view, id) => {
          if (view === 'customers' && id) handleNavigateToCustomer(id);
          else if (view === 'chit-groups' && id) handleNavigateToGroup(id);
          else setCurrentView(view);
          setIsSearchOpen(false);
        }}
      />

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkNotifRead}
        onNavigate={(view) => {
          setCurrentView(view);
          setIsNotificationDrawerOpen(false);
        }}
      />

      {/* Printable Payment Receipt Modal */}
      {receiptToPrint && (
        <PaymentReceiptModal
          receipt={receiptToPrint}
          onClose={() => setReceiptToPrint(null)}
        />
      )}
    </div>
  );
}
