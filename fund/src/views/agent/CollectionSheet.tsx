import React, { useEffect, useState, useCallback } from 'react';
import {
  Receipt,
  Download,
  Phone,
  AlertCircle,
  Banknote,
  CheckCircle2,
  Edit2,
  Trash2,
  MapPin,
  Coins,
  ExternalLink,
  X,
  Loader2
} from 'lucide-react';
import type { AgentReceipt, PayableCustomer } from '../../types/agent';
import { agentApi, AGENT_ID, formatAmount, formatDate, downloadCollectionSheetCsv } from '../../services/agentApi';
import { api } from '../../api/client';
import { toLocalDateStr } from './agentDateHelpers';
import { CollectionFilters } from './CollectionFilters';
import { CollectPaymentModal } from './CollectPaymentModal';
import { AgentReceiptModal } from './AgentReceiptModal';
import { AgentStatusBadge } from './AgentStatusBadge';
import type { AgentCollectionFilters, CollectionSheetItem } from '../../types/agent';

interface CollectionSheetProps {
  agentName: string;
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

function defaultFilters(): AgentCollectionFilters {
  return {
    dateType: 'today',
    customDate: '',
    status: 'all',
    search: ''
  };
}

function toPayableCustomer(item: CollectionSheetItem): PayableCustomer {
  return {
    customerId: item.customerId,
    customerName: item.customerName,
    phone: item.phone,
    chitGroupCode: item.chitGroupCode,
    ticketNumber: item.ticketNumber,
    dueDate: item.dueDate,
    dueAmount: item.dueInstallmentAmount,
    outstandingBalance: item.pendingBalance
  };
}

export const CollectionSheet: React.FC<CollectionSheetProps> = ({ agentName, onNotify }) => {
  const [filters, setFilters] = useState<AgentCollectionFilters>(defaultFilters);
  const [items, setItems] = useState<CollectionSheetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exported, setExported] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<PayableCustomer | null>(null);
  const [receipt, setReceipt] = useState<AgentReceipt | null>(null);

  // Daily Cash Handover State
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [handoverCash, setHandoverCash] = useState<string>('');
  const [handoverRemarks, setHandoverRemarks] = useState<string>('');
  const [handoverSubmitting, setHandoverSubmitting] = useState(false);
  const [todaySummary, setTodaySummary] = useState<any>(null);

  const safeItems = Array.isArray(items) ? items : [];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const sheet = await agentApi.getAgentCollectionSheet(AGENT_ID, filters);
      setItems(Array.isArray(sheet) ? sheet : []);
    } catch (err: any) {
      setError(err.message || 'Unable to load collection data. Please try again.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, filters.search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [filters, loadData]);

  const handleExportCSV = () => {
    if (!safeItems.length) {
      onNotify('No records to export.', 'error');
      return;
    }
    downloadCollectionSheetCsv(safeItems);
    setExported(true);
    window.setTimeout(() => setExported(false), 3000);
    onNotify('Collection sheet exported successfully.');
  };

  const handlePaymentSuccess = (result: { payment: unknown; receipt: AgentReceipt }) => {
    setReceipt(result.receipt);
    setPaymentTarget(null);
    onNotify('Payment collected successfully.');
    loadData();
  };

  const handleOpenHandover = async () => {
    try {
      const summary = await agentApi.getAgentCollectionSummary();
      setTodaySummary(summary);
      setHandoverCash(String(summary?.todayCashCollection || 0));
      setHandoverRemarks('');
      setShowHandoverModal(true);
    } catch {
      onNotify('Could not load today collection totals', 'error');
    }
  };

  const handleSubmitHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    const declared = Number(handoverCash);
    if (isNaN(declared) || declared < 0) {
      alert('Please enter a valid cash amount');
      return;
    }
    setHandoverSubmitting(true);
    try {
      await api.createDailyHandover({
        handoverDate: toLocalDateStr(new Date()),
        declaredCash: declared,
        notes: handoverRemarks.trim() || undefined,
        remarks: handoverRemarks.trim() || undefined
      });
      setShowHandoverModal(false);
      onNotify(`Daily cash handover of ${formatAmount(declared)} submitted to Cashier successfully!`);
    } catch (err: any) {
      alert(err.message || 'Failed to submit cash handover');
    } finally {
      setHandoverSubmitting(false);
    }
  };

  const viewLabel =
    filters.dateType === 'custom' && filters.customDate
      ? formatDate(filters.customDate)
      : formatDate(toLocalDateStr(new Date()));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-600" />
            Collection Sheet
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Field collection desk for <span className="font-semibold text-slate-700">{agentName}</span>{' '}
            &middot; {viewLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenHandover}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition shrink-0"
          >
            <Coins className="w-4 h-4" />
            <span>Daily Cash Handover</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={loading || safeItems.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition disabled:opacity-60 shrink-0"
          >
            {exported ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {exported ? 'Exported' : 'Download Collection Sheet'}
          </button>
        </div>
      </div>

      <CollectionFilters filters={filters} onChange={setFilters} />

      {/* Sheet table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Daily Entries <span className="ml-1 text-[11px] font-medium text-slate-400">({safeItems.length} records)</span>
          </h3>
          <span className="text-[11px] text-slate-400 hidden sm:block">Tap Collect to record a payment</span>
        </div>

        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Loading collection data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm flex items-center justify-between gap-4">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                {error}
              </span>
              <button onClick={() => loadData()} className="text-xs font-bold underline ml-4 shrink-0">
                Retry
              </button>
            </div>
          </div>
        ) : safeItems.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <Receipt className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No collection records found.</p>
            <p className="text-xs text-slate-400 mt-1">Try changing the date, status or search filter.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-4">Customer</th>
                    <th className="py-2.5 px-3">Group / Ticket</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3 text-right">Due Installment</th>
                    <th className="py-2.5 px-3 text-right">Paid</th>
                    <th className="py-2.5 px-3 text-right">Balance</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-4 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {safeItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{item.customerName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.phone && (
                            <a
                              href={`tel:${item.phone}`}
                              className="text-[11px] text-emerald-700 hover:text-emerald-800 font-mono font-medium flex items-center gap-1 hover:underline"
                              title="Call Customer Directly"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              {item.phone}
                            </a>
                          )}
                          {(item.googleMapLink || (item.address && item.city)) && (
                            <a
                              href={item.googleMapLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.address}, ${item.city}`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded font-bold flex items-center gap-1 transition"
                              title="Directions on Google Maps"
                            >
                              <MapPin className="w-2.5 h-2.5 text-amber-600" />
                              <span>Map</span>
                              <ExternalLink className="w-2 h-2 opacity-60" />
                            </a>
                          )}
                        </div>
                        {item.address && (
                          <p className="text-[10px] text-slate-400 truncate max-w-xs mt-0.5">
                            {item.address}, {item.city}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-mono text-slate-700">{item.chitGroupCode}</p>
                        <p className="text-[11px] text-amber-800 font-semibold">Ticket #{item.ticketNumber}</p>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{formatDate(item.dueDate)}</td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-900">{formatAmount(item.dueInstallmentAmount)}</td>
                      <td className="py-3 px-3 text-right text-emerald-700 font-medium">{formatAmount(item.paidAmount)}</td>
                      <td className={`py-3 px-3 text-right font-semibold ${item.pendingBalance > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                        {formatAmount(item.pendingBalance)}
                      </td>
                      <td className="py-3 px-3">
                        <AgentStatusBadge status={item.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setPaymentTarget(toPayableCustomer(item))}
                            disabled={item.status === 'paid'}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                              item.status === 'paid'
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            }`}
                          >
                            <Banknote className="w-3.5 h-3.5" />
                            Collect Payment
                          </button>
                          <button
                            onClick={async () => {
                              const newDue = prompt('Edit due installment amount (₹):', String(item.dueInstallmentAmount));
                              if (newDue && !isNaN(Number(newDue))) {
                                setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, dueInstallmentAmount: Number(newDue), pendingBalance: Number(newDue) - x.paidAmount } : x));
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit Entry"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete collection entry for ${item.customerName}?`)) {
                                setItems((prev) => prev.filter((x) => x.id !== item.id));
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Entry"
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

            {/* Mobile / tablet cards */}
            <div className="lg:hidden divide-y divide-slate-100">
              {safeItems.map((item) => (
                <div key={item.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{item.customerName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.phone && (
                          <a
                            href={`tel:${item.phone}`}
                            className="text-xs text-emerald-700 font-mono font-semibold flex items-center gap-1 hover:underline"
                          >
                            <Phone className="w-3 h-3" />
                            {item.phone}
                          </a>
                        )}
                        {(item.googleMapLink || (item.address && item.city)) && (
                          <a
                            href={item.googleMapLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.address}, ${item.city}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-bold flex items-center gap-1"
                          >
                            <MapPin className="w-2.5 h-2.5 text-amber-600" />
                            <span>Map</span>
                            <ExternalLink className="w-2 h-2 opacity-60" />
                          </a>
                        )}
                      </div>
                      {item.address && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {item.address}, {item.city}
                        </p>
                      )}
                    </div>
                    <AgentStatusBadge status={item.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Group / Ticket</span>
                      <span className="font-mono text-slate-700">{item.chitGroupCode} <span className="text-amber-800">#{item.ticketNumber}</span></span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Due Date</span>
                      <span className="text-slate-700">{formatDate(item.dueDate)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Balance</span>
                      <span className={`font-semibold ${item.pendingBalance > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                        {formatAmount(item.pendingBalance)}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                      <span className="text-slate-400 block">Due Installment</span>
                      <span className="font-semibold text-slate-800">{formatAmount(item.dueInstallmentAmount)}</span>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                      <span className="text-slate-400 block">Paid</span>
                      <span className="font-semibold text-emerald-700">{formatAmount(item.paidAmount)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setPaymentTarget(toPayableCustomer(item))}
                    disabled={item.status === 'paid'}
                    className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition min-h-[44px] ${
                      item.status === 'paid'
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    {item.status === 'paid' ? 'Already Collected' : 'Collect Payment'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Payment modal */}
      {paymentTarget && (
        <CollectPaymentModal
          item={paymentTarget}
          onClose={() => setPaymentTarget(null)}
          onSubmit={(input) => agentApi.collectAgentPayment(input)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Receipt modal */}
      {receipt && <AgentReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}

      {/* Daily Cash Handover Submission Modal */}
      {showHandoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Submit Daily Cash Handover</h3>
              </div>
              <button
                onClick={() => setShowHandoverModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitHandover} className="p-4 sm:p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Handover Date:</span>
                  <span className="font-mono font-bold text-slate-900">{formatDate(toLocalDateStr(new Date()))}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Cash Collected Today:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {formatAmount(todaySummary?.todayCashCollection || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Online / UPI Collected:</span>
                  <span className="font-mono font-bold text-blue-700">
                    {formatAmount(todaySummary?.todayOnlineCollection || 0)}
                  </span>
                </div>
                <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between font-bold text-slate-900">
                  <span>Total Day Collection:</span>
                  <span className="font-mono text-sm text-slate-900">
                    {formatAmount(todaySummary?.todayTotalCollection || 0)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Declared Cash to Handover to Cashier (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={handoverCash}
                    onChange={(e) => setHandoverCash(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:ring-1 focus:ring-emerald-500"
                    placeholder="Enter cash amount"
                  />
                </div>
              </div>

              {/* Live difference verification indicator */}
              {(() => {
                const declared = Number(handoverCash) || 0;
                const expectedCash = Number(todaySummary?.todayCashCollection || 0);
                const diff = declared - expectedCash;
                if (diff === 0) {
                  return (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-[11px] font-medium">Perfect Match: Declared cash exactly matches recorded cash receipts.</span>
                    </div>
                  );
                } else if (diff < 0) {
                  return (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="text-[11px] font-medium">
                        Shortage Warning: ₹{Math.abs(diff).toLocaleString('en-IN')} less than recorded receipts.
                      </span>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-[11px] font-medium">
                        Excess Notice: ₹{diff.toLocaleString('en-IN')} more than recorded receipts.
                      </span>
                    </div>
                  );
                }
              })()}

              <div>
                <label className="block text-slate-700 font-medium mb-1">Remarks / Note for Cashier (Optional)</label>
                <textarea
                  rows={2}
                  value={handoverRemarks}
                  onChange={(e) => setHandoverRemarks(e.target.value)}
                  placeholder="e.g. Handed over directly to branch cashier"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowHandoverModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={handoverSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5"
                >
                  {handoverSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Submit Handover</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};