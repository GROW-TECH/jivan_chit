import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Search,
  Filter,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Building,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { api } from '../../api/client';
import type { Installment, ChitGroup, Customer, UserRole } from '../../types';

interface InstallmentsViewProps {
  userRole: UserRole;
  onPayInstallment: (customerId: string, groupId: string, membershipId: string, installmentId?: string) => void;
  onNavigateToCustomer: (customerId: string) => void;
}

export const InstallmentsView: React.FC<InstallmentsViewProps> = ({
  userRole,
  onPayInstallment,
  onNavigateToCustomer
}) => {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [groups, setGroups] = useState<ChitGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const loadData = async () => {
    try {
      setLoading(true);
      const [insts, grps] = await Promise.all([
        api.getInstallments({
          groupId: selectedGroupId !== 'all' ? selectedGroupId : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined
        }),
        api.getChitGroups()
      ]);
      setInstallments(insts);
      setGroups(grps);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [deletingInstallment, setDeletingInstallment] = useState<Installment | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteInstallment = (inst: Installment) => {
    setDeletingInstallment(inst);
    setDeleteError(null);
  };

  const confirmDeleteInstallment = async () => {
    if (!deletingInstallment) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await api.deleteInstallment(deletingInstallment.installmentId);
      setInstallments((prev) => prev.filter((item) => item.installmentId !== deletingInstallment.installmentId));
      setDeletingInstallment(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete installment');
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setCurrentPage(1);
  }, [selectedGroupId, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    if (dateStr.includes('T')) return dateStr.split('T')[0];
    return dateStr.substring(0, 10);
  };

  const filteredInstallments = installments.filter((i) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      i.customerName?.toLowerCase().includes(q) ||
      i.customerId.toLowerCase().includes(q) ||
      i.groupName?.toLowerCase().includes(q) ||
      i.installmentId.toLowerCase().includes(q) ||
      String(i.ticketNumber).includes(q)
    );
  });

  const totalPages = Math.ceil(filteredInstallments.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInstallments = filteredInstallments.slice(startIndex, startIndex + itemsPerPage);

  const getStatusBadge = (status: Installment['status']) => {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Partially Paid':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Overdue':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Calculations for quick statistics header
  const totalNetDue = installments.reduce((s, i) => s + i.netDueAmount, 0);
  const totalCollected = installments.reduce((s, i) => s + i.paidAmount, 0);
  const totalBalance = installments.reduce((s, i) => s + i.balanceAmount, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Monthly Installments Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track monthly dues, dividend deductions, collected amounts, and overdue balances per subscriber
          </p>
        </div>
      </div>

      {/* Mini KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
        <div className="bg-white p-3 rounded-lg border border-slate-200/80">
          <span className="text-slate-400 text-[10px] uppercase font-semibold block">Total Installment Dues</span>
          <span className="text-base font-bold font-mono text-slate-900">₹{totalNetDue.toLocaleString()}</span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-emerald-200/80">
          <span className="text-emerald-700 text-[10px] uppercase font-semibold block">Total Collected</span>
          <span className="text-base font-bold font-mono text-emerald-800">₹{totalCollected.toLocaleString()}</span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-amber-200/80">
          <span className="text-amber-800 text-[10px] uppercase font-semibold block">Outstanding Pending</span>
          <span className="text-base font-bold font-mono text-amber-900">₹{totalBalance.toLocaleString()}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs text-xs">
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by subscriber, group, ticket..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Group:</span>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
            >
              <option value="all">All Chit Groups</option>
              {groups.map((g) => (
                <option key={g.groupId} value={g.groupId}>
                  {g.groupName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Overdue">Overdue</option>
              <option value="Paid">Paid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Installment #</th>
                <th className="py-3 px-4">Subscriber</th>
                <th className="py-3 px-4">Chit Group & Ticket</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Gross (₹)</th>
                <th className="py-3 px-4 text-right">Dividend (₹)</th>
                <th className="py-3 px-4 text-right">Net Due (₹)</th>
                <th className="py-3 px-4 text-right">Paid (₹)</th>
                <th className="py-3 px-4 text-right">Balance (₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-slate-400 font-sans">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
                    Loading installments ledger...
                  </td>
                </tr>
              ) : filteredInstallments.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-slate-400 font-sans">
                    No installment records found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedInstallments.map((i) => (
                  <tr key={i.installmentId} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      M#{i.monthNumber}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <button
                        onClick={() => onNavigateToCustomer(i.customerId)}
                        className="font-bold text-slate-900 hover:text-amber-700 hover:underline block text-left text-xs"
                      >
                        {i.customerName}
                      </button>
                      <span className="text-slate-400 text-[10px] font-mono">{i.customerId}</span>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span className="font-semibold text-slate-800 block text-xs">{i.groupName}</span>
                      <span className="text-amber-800 text-[10px] font-mono">Ticket #{i.ticketNumber}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {formatDate(i.dueDate)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      ₹{i.installmentAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-700">
                      {i.dividendDeduction > 0 ? `-₹${i.dividendDeduction.toLocaleString()}` : '₹0'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹{i.netDueAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-700 font-medium">
                      ₹{i.paidAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-amber-800">
                      ₹{i.balanceAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge(i.status)}`}>
                        {i.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <div className="flex items-center justify-center gap-1.5">
                        {i.status !== 'Paid' ? (
                          <button
                            onClick={() => onPayInstallment(i.customerId, i.groupId, i.membershipId, i.installmentId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-2xs transition"
                            title="Pay Installment"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>Pay</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-700 font-semibold">Settled</span>
                        )}
                        <button
                          onClick={async () => {
                            const newBal = prompt('Edit remaining balance (₹):', String(i.balanceAmount));
                            if (newBal && !isNaN(Number(newBal))) {
                              try {
                                await api.updateInstallment(i.installmentId, { balanceAmount: Number(newBal) });
                                loadData();
                              } catch (err: any) {
                                alert(err.message || 'Failed to update installment');
                              }
                            }
                          }}
                          className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition"
                          title="Edit Balance"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteInstallment(i)}
                          className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition"
                          title="Delete Installment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredInstallments.length > 0 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold focus:outline-none"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="ml-2 font-medium text-slate-500">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredInstallments.length)} of {filteredInstallments.length} installments
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium inline-flex items-center gap-1 transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              {/* Number Buttons */}
              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                      currentPage === pageNum
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-white border border-slate-300 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium inline-flex items-center gap-1 transition"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* In-UI Confirmation Modal for Deleting Installment */}
      {deletingInstallment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Delete Installment Record?
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Are you sure you want to permanently delete installment <strong className="text-slate-900 font-semibold">Month #{deletingInstallment.monthNumber}</strong> for subscriber <span className="font-semibold text-slate-900">{deletingInstallment.customerName}</span> (<span className="font-mono text-amber-800 font-bold">{deletingInstallment.groupId}</span>)?
              </p>
              <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3 mt-3.5 text-left leading-relaxed">
                ⚠️ <strong>Notice:</strong> This action cannot be undone. Any payment records associated with this installment should be handled accordingly.
              </div>

              {deleteError && (
                <div className="mt-3 p-3 bg-rose-100 border border-rose-300 text-rose-800 text-xs rounded-lg text-left font-medium">
                  {deleteError}
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={() => {
                    setDeletingInstallment(null);
                    setDeleteError(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={confirmDeleteInstallment}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Yes, Delete Installment</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
