import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw,
  Scale,
  AlertTriangle,
  AlertCircle,
  FileText,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  CreditCard,
  Receipt,
  Clock,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Search,
  Filter,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../../api/client';
import { PaymentReceiptModal } from '../../components/PaymentReceiptModal';
import { ArrearsReportView } from './ArrearsReportView';
import type { PaymentReceipt } from '../../types';

interface BalanceSheetViewProps {
  userRole: string;
}

export const BalanceSheetView: React.FC<BalanceSheetViewProps> = ({ userRole }) => {
  const isAgent = userRole === 'agent';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Payment Recording Modal State
  const [paymentTarget, setPaymentTarget] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMode, setPayMode] = useState<string>('Cash');
  const [payReference, setPayReference] = useState<string>('');
  const [payRemarks, setPayRemarks] = useState<string>('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Receipt Modal State
  const [activeReceipt, setActiveReceipt] = useState<PaymentReceipt | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  // View Mode: 'balance-sheet' or 'arrears-report' (inline view without popup)
  const [activeViewMode, setActiveViewMode] = useState<'balance-sheet' | 'arrears-report'>('balance-sheet');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.getBalanceSheet({
        filter: statusFilter,
        search: searchQuery
      });
      setData(res);
    } catch (err) {
      console.error('Failed to load balance sheet / pending dues:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  // Reset page to 1 whenever status filter, search, or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery, pageSize]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const totalRecords = data?.records?.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  // Current page records
  const paginatedRecords = useMemo(() => {
    if (!data?.records) return [];
    const startIndex = (currentPage - 1) * pageSize;
    return data.records.slice(startIndex, startIndex + pageSize);
  }, [data?.records, currentPage, pageSize]);

  const getPageNumbers = (current: number, total: number) => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    if (current <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', total);
    } else if (current >= total - 3) {
      pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total);
    } else {
      pages.push(1, '...', current - 1, current, current + 1, '...', total);
    }
    return pages;
  };

  const openPaymentModal = (record: any) => {
    setPaymentTarget(record);
    setPayAmount(String(record.outstandingBalance || record.dueAmount || ''));
    setPayMode('Cash');
    setPayReference('');
    setPayRemarks('');
    setPaymentError(null);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTarget) return;

    const parsed = Number(payAmount);
    if (!payAmount || isNaN(parsed) || parsed <= 0) {
      setPaymentError('Enter a valid amount greater than zero.');
      return;
    }
    if (parsed > (paymentTarget.outstandingBalance || paymentTarget.dueAmount) + 0.01) {
      setPaymentError(`Amount cannot exceed pending balance of ₹${paymentTarget.outstandingBalance?.toLocaleString()}`);
      return;
    }

    setSubmittingPayment(true);
    setPaymentError(null);

    try {
      const todayDate = new Date().toISOString().slice(0, 10);
      const res = await api.recordPayment({
        installmentId: paymentTarget.id,
        amountPaid: parsed,
        paymentMode: payMode,
        paymentDate: todayDate,
        transactionReference: payReference.trim() || undefined,
        remarks: payRemarks.trim() || undefined
      });

      setPaymentTarget(null);
      await fetchData();

      if (res?.receipt) {
        setActiveReceipt(res.receipt);
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleViewReceipt = async (record: any) => {
    if (!record.latestReceiptNumber) {
      alert('No payment receipt available for this installment yet.');
      return;
    }

    setLoadingReceipt(true);
    try {
      const res = await api.getPaymentReceipt(record.latestReceiptNumber);
      if (res?.receipt) {
        setActiveReceipt(res.receipt);
      } else {
        alert('Receipt details not found.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to fetch receipt');
    } finally {
      setLoadingReceipt(false);
    }
  };

  if (activeViewMode === 'arrears-report') {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <ArrearsReportView
          onBack={() => setActiveViewMode('balance-sheet')}
          userRole={userRole}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">
              {isAgent ? 'Pending Dues' : 'Balance Sheet'}
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              isAgent ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-800'
            }`}>
              {isAgent ? 'Route Collection Dues' : 'Company Wide'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {isAgent
              ? 'Authorized route collection targets, upcoming dues, and customer follow-up actions'
              : 'Live company-wide outstanding targets, arrears, and overdues tracker'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveViewMode('arrears-report')}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-lg transition text-sm font-semibold shadow-sm border border-amber-600/30"
            title="Open Arrears Report (Physical Register Format)"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-200" />
            <span>Arrears Report</span>
          </button>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition text-sm font-medium shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-24">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          {isAgent ? (
            /* Field Agent View: 4 Summary Cards */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Due Today */}
              <div
                onClick={() => setStatusFilter('due-today')}
                className={`p-5 rounded-xl border transition cursor-pointer ${
                  statusFilter === 'due-today'
                    ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/40 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-amber-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Due Today</span>
                  <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900 mt-2">₹{data.dueTodayAmount?.toLocaleString()}</p>
                <p className="text-xs text-amber-700 font-medium mt-1">{data.dueTodayCount || 0} installments due today</p>
              </div>

              {/* 2. Overdue Amount */}
              <div
                onClick={() => setStatusFilter('overdue')}
                className={`p-5 rounded-xl border transition cursor-pointer ${
                  statusFilter === 'overdue'
                    ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-400/40 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-rose-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">Overdue Amount</span>
                  <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-rose-700 mt-2">₹{data.overdueAmount?.toLocaleString()}</p>
                <p className="text-xs text-rose-600 font-medium mt-1">{data.overdueCount || 0} overdue installments</p>
              </div>

              {/* 3. Total Outstanding */}
              <div
                onClick={() => setStatusFilter('all')}
                className={`p-5 rounded-xl border transition cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-400/40 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-indigo-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Total Outstanding</span>
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <Scale className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900 mt-2">₹{data.totalOutstanding?.toLocaleString()}</p>
                <p className="text-xs text-indigo-600 font-medium mt-1">{data.totalOutstandingCount || 0} pending dues total</p>
              </div>

              {/* 4. Upcoming Installments */}
              <div
                onClick={() => setStatusFilter('upcoming')}
                className={`p-5 rounded-xl border transition cursor-pointer ${
                  statusFilter === 'upcoming'
                    ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/40 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-emerald-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Upcoming Installments</span>
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900 mt-2">₹{data.upcomingAmount?.toLocaleString()}</p>
                <p className="text-xs text-emerald-600 font-medium mt-1">{data.upcomingCount || 0} future installments</p>
              </div>
            </div>
          ) : (
            /* Admin View: Preserved Company-Wide Cards */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Outstanding Balance</p>
                  <p className="text-4xl font-bold text-slate-900 mt-2">₹{data.totalOutstanding?.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-1">{data.totalOutstandingCount || 0} total pending installments across company</p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                  <Scale className="w-8 h-8" />
                </div>
              </div>
              <div className="bg-rose-50 p-6 rounded-xl border border-rose-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-rose-600 uppercase tracking-wider">Total Arrears (Overdue)</p>
                  <p className="text-4xl font-bold text-rose-700 mt-2">₹{data.totalArrears?.toLocaleString()}</p>
                  <p className="text-xs text-rose-600 mt-1">{data.overdueCount || 0} overdue installments</p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-rose-200 flex items-center justify-center text-rose-700">
                  <AlertTriangle className="w-8 h-8" />
                </div>
              </div>
            </div>
          )}

          {/* Search and Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            {/* Search form */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by customer name, ID, phone, or group..."
                className="w-full pl-9 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setTimeout(fetchData, 0);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Pending ({data.totalOutstandingCount || 0})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('due-today')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                  statusFilter === 'due-today'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                Due Today ({data.dueTodayCount || 0})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('overdue')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                  statusFilter === 'overdue'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                Overdue ({data.overdueCount || 0})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('upcoming')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                  statusFilter === 'upcoming'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                Upcoming ({data.upcomingCount || 0})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('partially-paid')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                  statusFilter === 'partially-paid'
                    ? 'bg-orange-600 text-white'
                    : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
                }`}
              >
                Partially Paid ({data.partiallyPaidCount || 0})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('paid')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                  statusFilter === 'paid'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Paid ({data.paidCount || 0})
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {/* Table Header Info */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 font-semibold text-slate-800 flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <span>{isAgent ? 'Assigned Route Installments' : 'Pending Installments'}</span>
                {statusFilter !== 'all' && (
                  <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200 capitalize">
                    Filter: {statusFilter.replace('-', ' ')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-normal hidden sm:inline">
                  Page {currentPage} of {totalPages}
                </span>
                <span className="bg-slate-200 text-slate-700 py-0.5 px-2.5 rounded-full text-xs font-semibold">
                  {totalRecords} Records
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Customer & Route</th>
                    {isAgent && <th className="px-4 py-3 text-left font-medium text-slate-500">Contact & Address</th>}
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Chit Group</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Due Date</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-500">Target Amount</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-500">Paid Amount</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-500">Remaining Balance</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-500">Status</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {paginatedRecords.map((r: any) => {
                    const mapUrl = r.googleMapLink || (r.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.address + ', ' + r.city)}` : null);
                    const cleanDueDate = String(r.dueDate || '').slice(0, 10);

                    return (
                      <tr key={r.id} className="hover:bg-slate-50 transition">
                        {/* Customer & Route */}
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{r.customerName}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {r.customerId}
                            </span>
                            {r.routeName && (
                              <span className="text-[11px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-medium">
                                {r.routeName}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Contact & Address (Agent view) */}
                        {isAgent && (
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {r.phone ? (
                                <a
                                  href={`tel:${r.phone}`}
                                  className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 font-medium bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded transition"
                                  title="Call Customer"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>{r.phone}</span>
                                </a>
                              ) : (
                                <span className="text-xs text-slate-400">No phone</span>
                              )}
                            </div>
                            <div className="mt-1 flex items-start gap-1 text-xs text-slate-500 max-w-xs truncate">
                              {mapUrl ? (
                                <a
                                  href={mapUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                                  title="Open Location on Google Maps"
                                >
                                  <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                                  <span className="truncate">{r.address ? `${r.address}, ${r.city}` : 'View Map Location'}</span>
                                </a>
                              ) : (
                                <span>{r.address ? `${r.address}, ${r.city}` : '-'}</span>
                              )}
                            </div>
                          </td>
                        )}

                        {/* Chit Group */}
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{r.groupName}</p>
                          <p className="text-xs text-slate-400 font-mono">{r.groupId}</p>
                        </td>

                        {/* Due Date */}
                        <td className="px-4 py-3">
                          <p className={`font-semibold ${
                            r.isOverdue ? 'text-rose-600' : r.isDueToday ? 'text-amber-600' : 'text-slate-700'
                          }`}>
                            {cleanDueDate || '-'}
                          </p>
                          <p className="text-xs text-slate-500">{r.day}</p>
                        </td>

                        {/* Target Amount */}
                        <td className="px-4 py-3 text-right font-medium text-slate-600">
                          ₹{r.targetAmount?.toLocaleString()}
                        </td>

                        {/* Paid Amount */}
                        <td className="px-4 py-3 text-right font-medium text-emerald-600">
                          ₹{r.paidAmount?.toLocaleString()}
                        </td>

                        {/* Remaining Balance */}
                        <td className="px-4 py-3 text-right">
                          <p className={`font-bold ${
                            r.isPaid ? 'text-emerald-700' : r.isOverdue ? 'text-rose-600' : 'text-slate-900'
                          }`}>
                            ₹{r.outstandingBalance?.toLocaleString()}
                          </p>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            r.isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.isOverdue
                                ? 'bg-rose-100 text-rose-800'
                                : r.isDueToday
                                  ? 'bg-amber-100 text-amber-800'
                                  : r.isPartiallyPaid
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-sky-100 text-sky-800'
                          }`}>
                            {r.isPaid ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : r.isOverdue ? (
                              <AlertTriangle className="w-3 h-3" />
                            ) : (
                              <AlertCircle className="w-3 h-3" />
                            )}
                            {r.paymentStatus}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-center">
                          {isAgent ? (
                            /* Authorized Field Agent Actions */
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Call Customer */}
                              {r.phone && (
                                <a
                                  href={`tel:${r.phone}`}
                                  className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                                  title="Call Customer"
                                >
                                  <Phone className="w-4 h-4" />
                                </a>
                              )}

                              {/* Open Location */}
                              {mapUrl && (
                                <a
                                  href={mapUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                                  title="Open Google Maps Location"
                                >
                                  <MapPin className="w-4 h-4" />
                                </a>
                              )}

                              {/* Record Payment */}
                              {!r.isPaid ? (
                                <button
                                  onClick={() => openPaymentModal(r)}
                                  className="px-2 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md flex items-center gap-1 shadow-xs transition"
                                  title="Record Payment"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  <span>Collect</span>
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400 font-medium">Cleared</span>
                              )}

                              {/* View Receipt */}
                              {(r.latestReceiptNumber || r.paidAmount > 0) && (
                                <button
                                  onClick={() => handleViewReceipt(r)}
                                  disabled={loadingReceipt}
                                  className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                  title="View Payment Receipt"
                                >
                                  <Receipt className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ) : (
                            /* Admin View: Preserved Edit and Delete Management Actions */
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={async () => {
                                  const newBal = prompt('Edit outstanding balance (₹):', String(r.outstandingBalance));
                                  if (newBal && !isNaN(Number(newBal))) {
                                    try {
                                      await api.updateInstallment(r.id, { balanceAmount: Number(newBal) });
                                      fetchData();
                                    } catch (err: any) {
                                      alert(err.message || 'Failed to update record');
                                    }
                                  }
                                }}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                title="Edit Record"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm(`Are you sure you want to delete pending record for ${r.customerName}?`)) {
                                    try {
                                      await api.deleteInstallment(r.id);
                                      setData((prev: any) =>
                                        prev
                                          ? {
                                              ...prev,
                                              records: prev.records.filter((x: any) => x.id !== r.id)
                                            }
                                          : null
                                      );
                                    } catch (err: any) {
                                      alert(err.message || 'Failed to delete record');
                                    }
                                  }
                                }}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                                title="Delete Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!paginatedRecords.length && (
                    <tr>
                      <td colSpan={isAgent ? 9 : 8} className="px-4 py-12 text-center text-slate-500">
                        <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="font-medium text-slate-700">No installments found</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {statusFilter !== 'all'
                            ? `No records match status filter "${statusFilter.replace('-', ' ')}"`
                            : 'All customer dues are up to date.'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            {totalRecords > 0 && (
              <div className="p-4 border-t border-slate-200 bg-slate-50/75 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-600">
                {/* Left: Range text & page size selector */}
                <div className="flex flex-wrap items-center gap-3">
                  <span>
                    Showing <strong className="text-slate-900 font-semibold">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
                    <strong className="text-slate-900 font-semibold">{Math.min(currentPage * pageSize, totalRecords)}</strong> of{' '}
                    <strong className="text-slate-900 font-semibold">{totalRecords}</strong> records
                  </span>
                  <div className="flex items-center gap-1.5 pl-2 border-l border-slate-300">
                    <label htmlFor="pageSizeSelect" className="text-slate-500">Rows per page:</label>
                    <select
                      id="pageSizeSelect"
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="px-2 py-1 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                {/* Right: Page navigation buttons */}
                <div className="flex items-center gap-1">
                  {/* First page button */}
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-600 transition"
                    title="First Page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>

                  {/* Previous page button */}
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-600 transition"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Page number buttons */}
                  <div className="flex items-center gap-1 mx-1">
                    {getPageNumbers(currentPage, totalPages).map((p, idx) =>
                      p === '...' ? (
                        <span key={`dots-${idx}`} className="px-2 py-1 text-slate-400">...</span>
                      ) : (
                        <button
                          key={`page-${p}`}
                          onClick={() => setCurrentPage(Number(p))}
                          className={`min-w-8 h-8 px-2 rounded-md text-xs font-semibold transition ${
                            currentPage === p
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                  </div>

                  {/* Next page button */}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-600 transition"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Last page button */}
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-600 transition"
                    title="Last Page"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-slate-500">Failed to load data</div>
      )}

      {/* Record Payment Modal */}
      {paymentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Record Installment Payment</h3>
              </div>
              <button
                onClick={() => setPaymentTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold text-slate-900">{paymentTarget.customerName} ({paymentTarget.customerId})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Chit Group:</span>
                  <span className="font-semibold text-slate-800">{paymentTarget.groupName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pending Balance:</span>
                  <span className="font-bold text-rose-600">₹{paymentTarget.outstandingBalance?.toLocaleString()}</span>
                </div>
              </div>

              {paymentError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Collection Amount (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="Enter collected amount"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Mode *
                </label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / QR</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {payMode !== 'Cash' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transaction Reference / UPI Ref
                  </label>
                  <input
                    type="text"
                    value={payReference}
                    onChange={(e) => setPayReference(e.target.value)}
                    placeholder="e.g. UPI Ref / Cheque No"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Remarks / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={payRemarks}
                  onChange={(e) => setPayRemarks(e.target.value)}
                  placeholder="e.g. Collected at doorstep"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPaymentTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                >
                  {submittingPayment ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Confirm & Generate Receipt</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Payment Receipt Modal */}
      {activeReceipt && (
        <PaymentReceiptModal
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}
    </div>
  );
};
