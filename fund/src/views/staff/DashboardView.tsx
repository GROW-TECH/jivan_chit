import React, { useEffect, useState } from 'react';
import {
  Users,
  Coins,
  TrendingUp,
  AlertCircle,
  Calendar,
  Receipt,
  PlusCircle,
  Gavel,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Edit2,
  Trash2,
  FileText
} from 'lucide-react';
import { api } from '../../api/client';
import type { DashboardStats, Payment, PaymentReceipt } from '../../types';

interface DashboardViewProps {
  onNavigate: (view: string, id?: string) => void;
  onOpenReceipt: (receipt: PaymentReceipt) => void;
  onRecordPayment: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenReceipt,
  onRecordPayment
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleViewReceipt = async (receiptNumber: string) => {
    try {
      const res = await api.getPaymentReceipt(receiptNumber);
      onOpenReceipt(res.receipt);
    } catch (err: any) {
      alert(err.message || 'Failed to fetch receipt');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading Sri Chit Fund metrics...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8">
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm flex items-center justify-between">
          <span>{error || 'Error loading dashboard'}</span>
          <button onClick={fetchStats} className="text-xs font-bold underline ml-4">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const {
    totalCustomers = 0,
    activeChitGroups = 0,
    totalChitValue = 0,
    monthlyCollectionExpected = 0,
    totalCollectedAmount = 0,
    pendingAmount = 0,
    upcomingAuctionsCount = 0,
    recentPayments = [],
    recentCustomers = [],
    monthlyCollectionTrend = [],
    groupPerformance = []
  } = (stats as any) || {};

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Chit Fund Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational dashboard, live collection metrics, and chit group status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="dash-prev-month-report-btn"
            onClick={() => onNavigate('monthly-collection')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
            title="View Previous Month Completion & Collection Report"
          >
            <FileText className="w-4 h-4" />
            <span>Previous Month Report</span>
          </button>
          <button
            id="dash-record-payment-btn"
            onClick={onRecordPayment}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
          <button
            id="dash-conduct-auction-btn"
            onClick={() => onNavigate('auctions')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
          >
            <Gavel className="w-4 h-4" />
            <span>Conduct Auction</span>
          </button>
          <button
            id="dash-add-customer-btn"
            onClick={() => onNavigate('customers')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition"
          >
            <Users className="w-4 h-4 text-slate-500" />
            <span>Customers</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Customers */}
        <div
          id="stat-customers"
          onClick={() => onNavigate('customers')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Subscribers</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 font-sans">{totalCustomers}</p>
          <p className="text-[10px] text-emerald-600 font-medium mt-1 flex items-center gap-0.5">
            <CheckCircle2 className="w-3 h-3" />
            Active accounts
          </p>
        </div>

        {/* Active Chit Groups */}
        <div
          id="stat-groups"
          onClick={() => onNavigate('chit-groups')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Active Chits</span>
            <Coins className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 font-sans">{activeChitGroups}</p>
          <p className="text-[10px] text-slate-500 mt-1">Active chit groups</p>
        </div>

        {/* Total Chit Value */}
        <div
          id="stat-value"
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Value</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 font-sans">
            ₹{(totalChitValue / 100000).toFixed(1)}L
          </p>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">₹{totalChitValue.toLocaleString()}</p>
        </div>

        {/* Monthly Expected */}
        <div
          id="stat-monthly"
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Monthly Due</span>
            <CreditCard className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 font-sans">
            ₹{(monthlyCollectionExpected / 1000).toFixed(0)}k
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Per-month target</p>
        </div>

        {/* Total Collected */}
        <div
          id="stat-collected"
          onClick={() => onNavigate('payments')}
          className="bg-white p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/20 shadow-xs hover:border-emerald-300 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-emerald-800 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Collected</span>
            <Receipt className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-emerald-900 font-sans">
            ₹{(totalCollectedAmount / 1000).toFixed(0)}k
          </p>
          <p className="text-[10px] text-emerald-700 font-mono mt-1">
            ₹{totalCollectedAmount.toLocaleString()}
          </p>
        </div>

        {/* Pending Amount */}
        <div
          id="stat-pending"
          onClick={() => onNavigate('installments')}
          className="bg-white p-4 rounded-xl border border-amber-200/80 bg-amber-50/20 shadow-xs hover:border-amber-300 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-amber-800 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Outstanding</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-amber-900 font-sans">
            ₹{(pendingAmount / 1000).toFixed(0)}k
          </p>
          <p className="text-[10px] text-amber-700 font-medium mt-1">Pending collection</p>
        </div>
      </div>

      {/* Main Analytics & Visuals Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Collection Trend Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Monthly Collection Performance</h2>
              <p className="text-xs text-slate-500">Collected amounts vs total monthly expected target</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-emerald-600"></span>
                <span className="text-slate-600">Collected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-slate-200"></span>
                <span className="text-slate-600">Expected Target</span>
              </div>
            </div>
          </div>

          {/* Clean Custom SVG Bar Chart */}
          <div className="pt-4">
            <div className="h-52 w-full flex items-end justify-between gap-4 px-2 pb-6 border-b border-slate-100">
              {monthlyCollectionTrend.map((item: any) => {
                const targetVal = item.expected ?? item.target ?? 50000;
                const maxVal = Math.max(targetVal, item.collected, 50000);
                const collectedHeight = Math.min(100, Math.round((item.collected / maxVal) * 100));
                const expectedHeight = Math.min(100, Math.round((targetVal / maxVal) * 100));

                return (
                  <div key={item.month} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <div className="text-[10px] font-mono text-slate-400 mb-1 opacity-0 group-hover:opacity-100 transition">
                      ₹{(item.collected / 1000).toFixed(0)}k
                    </div>
                    <div className="w-full max-w-[48px] flex items-end justify-center gap-1 h-36">
                      {/* Expected Bar */}
                      <div
                        style={{ height: `${expectedHeight}%` }}
                        className="w-1/2 bg-slate-200 rounded-t-xs transition-all duration-300"
                        title={`Target: ₹${targetVal.toLocaleString()}`}
                      />
                      {/* Collected Bar */}
                      <div
                        style={{ height: `${collectedHeight}%` }}
                        className="w-1/2 bg-emerald-600 hover:bg-emerald-500 rounded-t-xs transition-all duration-300"
                        title={`Collected: ₹${item.collected.toLocaleString()}`}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-slate-600 mt-2">{item.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Upcoming Auctions Widget */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-900">Upcoming Auctions</h2>
              </div>
              <button
                onClick={() => onNavigate('auctions')}
                className="text-xs text-amber-700 hover:underline font-semibold"
              >
                View all
              </button>
            </div>

            <div className="space-y-3">
              {groupPerformance.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No pending auctions this cycle.</p>
              ) : (
                groupPerformance.slice(0, 4).map((grp: any, idx: number) => (
                  <div
                    key={grp.groupName || idx}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-amber-50/40 hover:border-amber-200 transition text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-medium">
                      <span className="text-slate-900 font-bold">{grp.groupName}</span>
                      <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded">
                        Active Group
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>Value: ₹{(grp.totalValue || 0).toLocaleString()}</span>
                      <span className="font-mono text-slate-700 font-medium">{grp.membersCount} Members</span>
                    </div>
                    <div className="pt-1 flex items-center justify-between text-[11px]">
                      <span className="text-emerald-700 font-medium">Progress: {grp.completionRate}%</span>
                      <button
                        onClick={() => onNavigate('auctions')}
                        className="text-amber-800 hover:text-amber-900 font-bold text-[11px] inline-flex items-center gap-0.5"
                      >
                        <span>Conduct</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Foreman Commission: 5%</span>
            <span className="text-emerald-700 font-medium">All chits covered</span>
          </div>
        </div>
      </div>

      {/* Tables Row: Recent Payments & Recent Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Payments (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Recent Payment Receipts</h2>
            </div>
            <button
              onClick={() => onNavigate('payments')}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-1"
            >
              <span>View ledger</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Recent Payments (< md) */}
          <div className="md:hidden divide-y divide-slate-100">
            {recentPayments.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-xs">No recent payment records found.</p>
            ) : (
              recentPayments.map((p: any) => (
                <div key={p.id || p.receiptNumber} className="p-3 space-y-1.5 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-slate-900 font-bold text-xs">{p.receiptNumber}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-medium">
                          {p.paymentMode}
                        </span>
                      </div>
                      <p className="font-bold text-slate-900 mt-1 truncate">{p.customerName}</p>
                      <p className="text-[11px] text-slate-500 font-mono truncate">
                        {p.groupName} • Ticket #{p.ticketNumber}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-slate-900 text-sm block">
                        ₹{(p.amountPaid || 0).toLocaleString()}
                      </span>
                      <button
                        onClick={() => handleViewReceipt(p.receiptNumber)}
                        className="text-emerald-700 hover:text-emerald-800 font-semibold text-[11px] inline-flex items-center gap-0.5 mt-1"
                      >
                        <span>Receipt</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Recent Payments Table (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Receipt #</th>
                  <th className="py-2.5 px-4">Subscriber</th>
                  <th className="py-2.5 px-4">Chit Group</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                  <th className="py-2.5 px-4">Mode</th>
                  <th className="py-2.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentPayments.map((p: any) => (
                  <tr key={p.id || p.receiptNumber} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      {p.receiptNumber}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 block">{p.customerName}</span>
                      <span className="text-slate-400 text-[10px] font-mono">{p.customerId}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span>{p.groupName}</span>
                      <span className="text-[10px] text-amber-800 font-mono block">Ticket #{p.ticketNumber}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{(p.amountPaid || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                        {p.paymentMode}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleViewReceipt(p.receiptNumber)}
                          className="text-emerald-700 hover:text-emerald-800 font-semibold text-xs inline-flex items-center gap-1"
                          title="Print Receipt"
                        >
                          <span>Receipt</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                        <button
                          onClick={async () => {
                            const newAmt = prompt('Edit payment amount (₹):', String(p.amountPaid));
                            if (newAmt && !isNaN(Number(newAmt))) {
                              try {
                                await api.updatePayment(p.id || p.receiptNumber, { amountPaid: Number(newAmt) });
                                fetchStats();
                              } catch (err: any) {
                                alert(err.message || 'Failed to update payment');
                              }
                            }
                          }}
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Edit Payment"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Are you sure you want to delete payment receipt #${p.receiptNumber}?`)) {
                              try {
                                await api.deletePayment(p.id || p.receiptNumber);
                                setStats((prev: any) => prev ? { ...prev, recentPayments: prev.recentPayments.filter((x: any) => (x.id || x.receiptNumber) !== (p.id || p.receiptNumber)) } : null);
                              } catch (err: any) {
                                alert(err.message || 'Failed to delete payment');
                              }
                            }
                          }}
                          className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                          title="Delete Payment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Customers (1 Col) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-600" />
                <h2 className="text-sm font-bold text-slate-900">Subscribers</h2>
              </div>
              <button
                onClick={() => onNavigate('customers')}
                className="text-xs text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-1"
              >
                <span>Directory</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-3 divide-y divide-slate-100">
              {recentCustomers.map((c: any) => (
                <div
                  key={c.customerId}
                  onClick={() => onNavigate('customers', c.customerId)}
                  className="py-2.5 px-2 flex items-center justify-between hover:bg-slate-50 rounded-lg cursor-pointer transition text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-slate-900 truncate">{c.fullName}</p>
                    <p className="text-slate-400 text-[11px] font-mono">{c.mobileNumber} • {c.city}</p>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold shrink-0">
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
            <button
              onClick={() => onNavigate('customers')}
              className="text-xs text-amber-800 hover:text-amber-900 font-semibold"
            >
              + Register New Customer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
