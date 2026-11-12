import React, { useState, useEffect } from 'react';
import {
  Award,
  Search,
  Filter,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Calendar,
  Building2,
  DollarSign,
  Edit2,
  Trash2
} from 'lucide-react';
import { api } from '../../api/client';
import type { PrizePayment, UserRole } from '../../types';

interface PrizePaymentsViewProps {
  userRole: UserRole;
  onNavigateToCustomer: (customerId: string) => void;
}

export const PrizePaymentsView: React.FC<PrizePaymentsViewProps> = ({
  userRole,
  onNavigateToCustomer
}) => {
  const [prizes, setPrizes] = useState<PrizePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // Disbursal Modal State
  const [selectedPrize, setSelectedPrize] = useState<PrizePayment | null>(null);
  const [disburseAmount, setDisburseAmount] = useState<number | ''>('');
  const [disbursalDate, setDisbursalDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<string>('Bank Transfer');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Edit Prize Modal State
  const [editingPrize, setEditingPrize] = useState<PrizePayment | null>(null);
  const [editPrizeAmount, setEditPrizeAmount] = useState<number | ''>('');
  const [editPaidAmount, setEditPaidAmount] = useState<number | ''>('');
  const [editStatus, setEditStatus] = useState<string>('Pending');
  const [editRemarks, setEditRemarks] = useState<string>('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getPrizePayments(statusFilter !== 'all' ? statusFilter : undefined);
      setPrizes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleOpenDisburse = (prize: PrizePayment) => {
    setSelectedPrize(prize);
    setDisburseAmount(prize.remainingAmount);
    setDisbursalDate(new Date().toISOString().split('T')[0]);
    setPaymentMode('Bank Transfer');
    setTransactionRef('');
    setRemarks('');
    setModalError(null);
  };

  const handleOpenEdit = (prize: PrizePayment) => {
    setEditingPrize(prize);
    setEditPrizeAmount(prize.prizeAmount);
    setEditPaidAmount(prize.paidAmount);
    setEditStatus(prize.paymentStatus);
    setEditRemarks(prize.remarks || '');
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrize) return;

    setEditSubmitting(true);
    setEditError(null);
    try {
      await api.updatePrizePayment(editingPrize.prizePaymentId, {
        prizeAmount: Number(editPrizeAmount),
        paidAmount: Number(editPaidAmount),
        paymentStatus: editStatus as any,
        remarks: editRemarks
      });
      setEditingPrize(null);
      loadData();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update prize payment');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeletePrize = async (prizePaymentId: string) => {
    if (!confirm('Are you sure you want to permanently delete this prize payment record?')) return;
    try {
      await api.deletePrizePayment(prizePaymentId);
      setPrizes((prev) => prev.filter((p) => p.prizePaymentId !== prizePaymentId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete prize payment record');
    }
  };

  const handleConfirmDisbursal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrize || !disburseAmount || Number(disburseAmount) <= 0) {
      setModalError('Please enter a valid disbursal amount.');
      return;
    }

    if (Number(disburseAmount) > selectedPrize.remainingAmount) {
      setModalError(`Amount exceeds the remaining unpaid balance of ₹${selectedPrize.remainingAmount.toLocaleString()}`);
      return;
    }

    setSubmitting(true);
    setModalError(null);
    try {
      await api.disbursePrize(selectedPrize.prizePaymentId, {
        amountToDisburse: Number(disburseAmount),
        disbursalDate,
        paymentMode,
        transactionReference: transactionRef,
        remarks
      });
      setSelectedPrize(null);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to disburse prize amount');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: PrizePayment['paymentStatus']) => {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Partially Paid':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Auction Prize Payout Disbursals
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage and track prize money payouts to auction winners, bank transfer UTRs, and surety settlements
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Filter by Status:</span>
          <div className="flex gap-1">
            {['all', 'Pending', 'Partially Paid', 'Paid'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'all' ? 'All Prize Claims' : st}
              </button>
            ))}
          </div>
        </div>
        <span className="text-slate-400 font-mono">{prizes.length} records found</span>
      </div>

      {/* Prize Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Winner Subscriber</th>
                <th className="py-3 px-4">Chit Scheme</th>
                <th className="py-3 px-4 text-center">Ticket #</th>
                <th className="py-3 px-4 text-center">Auction #</th>
                <th className="py-3 px-4 text-right">Prize Amount</th>
                <th className="py-3 px-4 text-right">Disbursed (₹)</th>
                <th className="py-3 px-4 text-right">Remaining Balance</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400 font-sans">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
                    Loading prize payout records...
                  </td>
                </tr>
              ) : prizes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400 font-sans">
                    No prize payouts found. Conduct an auction to generate prize claims.
                  </td>
                </tr>
              ) : (
                prizes.map((p) => (
                  <tr key={p.prizePaymentId} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-sans">
                      <button
                        onClick={() => onNavigateToCustomer(p.winnerCustomerId)}
                        className="font-bold text-slate-900 hover:text-amber-700 hover:underline block text-left"
                      >
                        {p.winnerCustomerName}
                      </button>
                      <span className="text-slate-400 text-[10px] font-mono">{p.winnerCustomerId}</span>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span className="font-semibold text-slate-800 block">{p.groupName}</span>
                      <span className="text-slate-400 text-[10px] font-mono">{p.groupId}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-[11px]">
                        #{p.ticketNumber}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900">
                      Month #{p.auctionNumber}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 text-sm">
                      ₹{p.prizeAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-700 font-medium">
                      ₹{p.paidAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-amber-800">
                      ₹{p.remainingAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge(p.paymentStatus)}`}>
                        {p.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <div className="flex items-center justify-center gap-1.5">
                        {p.paymentStatus !== 'Paid' && userRole === 'admin' && (
                          <button
                            onClick={() => handleOpenDisburse(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow-2xs transition"
                            title="Disburse Payout"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Disburse</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 rounded border border-slate-200"
                          title="Edit Prize Payment"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePrize(p.prizePaymentId)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 rounded border border-slate-200"
                          title="Delete Prize Payment"
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
      </div>

      {/* DISBURSE PRIZE MODAL (ADMIN ONLY) */}
      {selectedPrize && (
        <div id="disburse-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-amber-50 text-amber-950">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Award className="w-4 h-4 text-amber-700" />
                <span>Disburse Auction Prize Payout</span>
              </div>
              <button onClick={() => setSelectedPrize(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDisbursal} className="p-5 space-y-4 text-xs">
              {modalError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                  {modalError}
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p><strong>Prize Winner:</strong> {selectedPrize.winnerCustomerName}</p>
                <p><strong>Chit Group:</strong> {selectedPrize.groupName} (Ticket #{selectedPrize.ticketNumber})</p>
                <p><strong>Total Prize:</strong> ₹{selectedPrize.prizeAmount.toLocaleString()}</p>
                <p><strong>Already Paid:</strong> ₹{selectedPrize.paidAmount.toLocaleString()}</p>
                <p className="text-amber-800 font-bold"><strong>Unpaid Balance:</strong> ₹{selectedPrize.remainingAmount.toLocaleString()}</p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Amount to Disburse (₹) *</label>
                <input
                  type="number"
                  required
                  step="1"
                  min="1"
                  max={selectedPrize.remainingAmount}
                  value={disburseAmount}
                  onChange={(e) => setDisburseAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold font-mono text-emerald-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Disbursal Date *</label>
                  <input
                    type="date"
                    required
                    value={disbursalDate ? String(disbursalDate).split('T')[0] : ''}
                    onChange={(e) => setDisbursalDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Payment Mode *</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Bank UTR / Cheque Ref Number</label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. UTR-CHIT-901823901 or CHQ-400192"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Surety / Verification Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. 2 sureties verified, promissory note signed"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPrize(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Disbursal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PRIZE PAYMENT MODAL */}
      {editingPrize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                Edit Prize Payment ({editingPrize.winnerCustomerName})
              </h3>
              <button onClick={() => setEditingPrize(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 text-xs">
              {editError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-medium mb-1">Prize Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={editPrizeAmount}
                  onChange={(e) => setEditPrizeAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Already Paid Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={editPaidAmount}
                  onChange={(e) => setEditPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-emerald-700"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Payment Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="Pending">Pending</option>
                  <option value="Partially Paid">Partially Paid</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Remarks</label>
                <input
                  type="text"
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="Optional internal remarks"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPrize(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5"
                >
                  {editSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Prize Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
