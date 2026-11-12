import React, { useEffect, useState } from 'react';
import {
  X,
  Wallet,
  CreditCard,
  Loader2,
  AlertCircle,
  Phone,
  Calendar,
  CheckCircle2,
  IndianRupee
} from 'lucide-react';
import { formatAmount, formatDate } from '../../services/agentApi';
import type { CollectPaymentInput, CollectPaymentResult, PayableCustomer, PaymentMethod } from '../../types/agent';

interface CollectPaymentModalProps {
  item: PayableCustomer;
  onClose: () => void;
  onSubmit: (input: CollectPaymentInput) => Promise<CollectPaymentResult>;
  onSuccess?: (result: CollectPaymentResult) => void;
}

export const CollectPaymentModal: React.FC<CollectPaymentModalProps> = ({ item, onClose, onSubmit, onSuccess }) => {
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setAmount(String(item.outstandingBalance || ''));
    setMethod('cash');
    setNotes('');
    setAmountError(null);
    setSubmitError(null);
    setSubmitting(false);
  }, [item.customerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(amount);
    if (!amount || Number.isNaN(parsed) || parsed <= 0) {
      setAmountError('Enter a valid amount greater than zero.');
      return;
    }
    if (parsed > item.outstandingBalance + 0.001) {
      setAmountError(`Amount cannot exceed pending balance of ${formatAmount(item.outstandingBalance)}.`);
      return;
    }
    setAmountError(null);
    setSubmitError(null);
    setSubmitting(true);
    try {
      const result = await onSubmit({
        customerId: item.customerId,
        amount: parsed,
        paymentMethod: method,
        notes: notes.trim() || undefined
      });
      onSuccess?.(result);
    } catch (err) {
      setSubmitError((err as Error).message || 'Payment failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden my-auto border border-slate-200 max-h-[94vh] flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[94vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-50 border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <IndianRupee className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900 truncate">Collect Payment</h2>
                <p className="text-[11px] text-slate-500 truncate">{item.customerName}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition disabled:opacity-40"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {/* Customer details */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                <span className="text-[10px] uppercase tracking-wide text-slate-500 block">Chit Group</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{item.chitGroupCode}</span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                <span className="text-[10px] uppercase tracking-wide text-slate-500 block">Ticket No</span>
                <span className="font-bold text-amber-800 mt-0.5 block font-mono">#{item.ticketNumber}</span>
              </div>
              <div className="col-span-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-medium text-slate-700 font-mono">{item.phone}</span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                <span className="text-[10px] uppercase tracking-wide text-slate-500 block">Due Date</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{formatDate(item.dueDate)}</span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                <span className="text-[10px] uppercase tracking-wide text-slate-500 block">Installment</span>
                <span className="font-bold text-slate-900 mt-0.5 block font-mono">
                  {formatAmount(item.dueAmount)}
                </span>
              </div>
            </div>

            {/* Due / pending balance */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-lg bg-slate-900 text-white px-3 py-3">
                <span className="text-[10px] uppercase tracking-wide text-slate-400 block">Total Due</span>
                <span className="text-lg font-bold mt-0.5 block font-mono">{formatAmount(item.dueAmount)}</span>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-900 px-3 py-3">
                <span className="text-[10px] uppercase tracking-wide text-amber-700 block">Pending / Arrears</span>
                <span className="text-lg font-bold mt-0.5 block font-mono">
                  {formatAmount(item.outstandingBalance)}
                </span>
              </div>
            </div>

            {/* Amount input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="payment-amount">
                Payment Amount
              </label>
              <div
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 transition min-h-[48px] ${
                  amountError
                    ? 'border-rose-400 ring-2 ring-rose-100'
                    : 'border-slate-300 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-100'
                }`}
              >
                <IndianRupee className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  id="payment-amount"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setAmountError(null);
                  }}
                  disabled={submitting}
                  placeholder="0.00"
                  className="w-full bg-transparent text-sm font-bold font-mono text-slate-900 placeholder-slate-400 focus:outline-none disabled:opacity-60"
                />
                <span className="text-[11px] text-slate-400 font-medium shrink-0">
                  Max {formatAmount(item.outstandingBalance)}
                </span>
              </div>
              {amountError && (
                <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {amountError}
                </p>
              )}
            </div>

            {/* Payment method */}
            <div>
              <span className="block text-xs font-semibold text-slate-700 mb-1.5">Payment Method</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMethod('cash')}
                  disabled={submitting}
                  className={`flex items-center justify-center gap-2 px-3 py-3 min-h-[48px] rounded-lg border text-xs font-bold transition ${
                    method === 'cash'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-100'
                      : 'border-slate-300 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('online')}
                  disabled={submitting}
                  className={`flex items-center justify-center gap-2 px-3 py-3 min-h-[48px] rounded-lg border text-xs font-bold transition ${
                    method === 'online'
                      ? 'border-sky-500 bg-sky-50 text-sky-800 ring-2 ring-sky-100'
                      : 'border-slate-300 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Online
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="payment-notes">
                Notes <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="payment-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
                rows={2}
                placeholder="e.g. Paid via UPI reference..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-60"
              />
            </div>

            {submitError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 min-h-[44px] rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-60 cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing payment...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Collect Payment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};