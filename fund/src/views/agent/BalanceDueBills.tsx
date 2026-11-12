import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Wallet,
  AlertCircle,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Phone,
  Loader2,
  IndianRupee,
  Edit2,
  Trash2
} from 'lucide-react';
import { agentApi, AGENT_ID, formatAmount, formatDate } from '../../services/agentApi';
import type {
  AgentDueBill,
  AgentReceipt,
  CollectionStatus,
  CollectPaymentInput,
  CollectPaymentResult,
  PayableCustomer
} from '../../types/agent';
import { CollectPaymentModal } from './CollectPaymentModal';
import { AgentReceiptModal } from './AgentReceiptModal';

interface BalanceDueBillsProps {
  agentName: string;
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const STATUS_BADGE: Record<CollectionStatus, { badge: string; dot: string; label: string }> = {
  paid: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    label: 'Paid'
  },
  pending: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    label: 'Pending'
  },
  overdue: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
    label: 'Overdue'
  }
};

export const BalanceDueBills: React.FC<BalanceDueBillsProps> = ({ agentName, onNotify }) => {
  const [bills, setBills] = useState<AgentDueBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [payItem, setPayItem] = useState<PayableCustomer | null>(null);
  const [receipt, setReceipt] = useState<AgentReceipt | null>(null);
  const [version, setVersion] = useState(0);

  const safeBills = Array.isArray(bills) ? bills : [];

  const loadBills = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await agentApi.getAgentDueBills(AGENT_ID);
      setBills(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Unable to load due bills. Please try again.');
      setBills([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBills();
  }, [loadBills, version]);

  const totals = useMemo(() => {
    const totalOutstanding = safeBills.reduce((sum, b) => sum + (b.outstandingBalance || 0), 0);
    const totalOverdue = safeBills.filter((b) => b.status === 'overdue').reduce(
      (sum, b) => sum + (b.outstandingBalance || 0),
      0
    );
    const totalPending = safeBills.filter((b) => b.status === 'pending').reduce(
      (sum, b) => sum + (b.outstandingBalance || 0),
      0
    );
    const partiallyPaid = safeBills.filter(
      (b) => (b.paidAmount || 0) > 0 && (b.paidAmount || 0) < (b.dueAmount || 0)
    ).length;
    return { totalOutstanding, totalOverdue, totalPending, partiallyPaid };
  }, [safeBills]);

  const summaryChips = [
    { label: 'Total Outstanding', value: formatAmount(totals.totalOutstanding), icon: Wallet, chip: 'text-slate-900 border-slate-200', iconClass: 'text-slate-500' },
    { label: 'Total Overdue', value: formatAmount(totals.totalOverdue), icon: AlertCircle, chip: 'text-rose-700 border-rose-200', iconClass: 'text-rose-500' },
    { label: 'Total Pending', value: formatAmount(totals.totalPending), icon: Clock, chip: 'text-amber-700 border-amber-200', iconClass: 'text-amber-500' },
    { label: 'Partially Paid', value: String(totals.partiallyPaid), icon: CheckCircle2, chip: 'text-emerald-700 border-emerald-200', iconClass: 'text-emerald-500' }
  ];

  const handleCollect = (bill: AgentDueBill) => {
    setPayItem({
      customerId: bill.customerId,
      customerName: bill.customerName,
      phone: bill.phone,
      chitGroupCode: bill.chitGroupCode,
      ticketNumber: bill.ticketNumber,
      dueDate: bill.dueDate,
      dueAmount: bill.dueAmount,
      outstandingBalance: bill.outstandingBalance
    });
  };

  const handlePaymentSuccess = (result: CollectPaymentResult) => {
    setReceipt(result.receipt);
    setPayItem(null);
    onNotify('Payment collected successfully.');
    setVersion((v) => v + 1);
  };

  const handleSubmit = useCallback(
    async (input: CollectPaymentInput): Promise<CollectPaymentResult> => {
      try {
        return await agentApi.collectAgentPayment(input);
      } catch (err: any) {
        onNotify(err.message || 'Payment failed. Please try again.', 'error');
        throw err;
      }
    },
    [onNotify]
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Wallet className="w-6 h-6 text-indigo-600" />
          Balance & Due Bills
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Unpaid and partially paid bills assigned to{' '}
          <span className="font-semibold text-slate-700">{agentName}</span>
        </p>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {summaryChips.map((chip) => {
          const Icon = chip.icon;
          return (
            <div key={chip.label} className={`bg-white rounded-xl border p-4 shadow-xs ${chip.chip}`}>
              <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${chip.iconClass}`}>
                <Icon className="w-3.5 h-3.5" />
                {chip.label}
              </div>
              <p className="text-lg font-bold mt-1.5 font-mono text-slate-900">{chip.value}</p>
            </div>
          );
        })}
      </div>

      {loading && bills.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Loading due bills...</p>
          </div>
        </div>
      ) : error && bills.length === 0 ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </span>
          <button onClick={() => setVersion((v) => v + 1)} className="text-xs font-bold text-rose-700 underline whitespace-nowrap">
            Retry
          </button>
        </div>
      ) : safeBills.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-500">No pending bills for this agent.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {safeBills.map((bill) => {
            const badge = STATUS_BADGE[bill.status];
            const isExpanded = expandedId === bill.id;
            return (
              <div
                key={bill.id}
                className={`bg-white border rounded-xl shadow-xs transition ${
                  isExpanded ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-slate-200'
                }`}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : bill.id)}
                  className="w-full text-left px-3.5 sm:px-4 py-3 flex items-center gap-3 min-h-[56px]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-slate-900 truncate text-sm">{bill.customerName}</span>
                      <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${badge.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {bill.phone}
                    </p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <span className="text-[10px] text-slate-400 block uppercase">Outstanding</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {formatAmount(bill.outstandingBalance)}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 block uppercase">
                      {bill.chitGroupCode} / #{bill.ticketNumber}
                    </span>
                    <span className="text-[11px] text-amber-800 font-semibold font-mono block">
                      {formatAmount(bill.dueAmount)}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-3.5 sm:px-4 pb-4 pt-1 border-t border-slate-100 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-3">
                      <div className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-2">
                        <span className="text-slate-500 block text-[10px] uppercase">Installment</span>
                        <span className="font-bold text-slate-900">#{bill.currentInstallment}</span>
                      </div>
                      <div className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-2">
                        <span className="text-slate-500 block text-[10px] uppercase">Paid Amount</span>
                        <span className="font-bold text-emerald-700 font-mono">{formatAmount(bill.paidAmount)}</span>
                      </div>
                      <div className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-2">
                        <span className="text-slate-500 block text-[10px] uppercase">Arrears</span>
                        <span className={`font-bold font-mono ${bill.arrears > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                          {formatAmount(bill.arrears)}
                        </span>
                      </div>
                      <div className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-2">
                        <span className="text-slate-500 block text-[10px] uppercase">Due Date</span>
                        <span className="font-bold text-slate-900">{formatDate(bill.dueDate)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[11px] font-bold uppercase tracking-wide inline-flex items-center gap-1.5 sm:hidden ${badge.badge} px-2 py-1 rounded-full border`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>
                      <span className="text-xs text-slate-500 hidden sm:block">
                        Due {formatDate(bill.dueDate)} &middot; Outstanding{' '}
                        <span className="font-bold text-slate-800 font-mono">{formatAmount(bill.outstandingBalance)}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCollect(bill)}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition shrink-0"
                        >
                          <IndianRupee className="w-3.5 h-3.5" />
                          Collect Payment
                        </button>
                        <button
                          onClick={async () => {
                            const newBal = prompt('Edit outstanding balance (₹):', String(bill.outstandingBalance));
                            if (newBal && !isNaN(Number(newBal))) {
                              setBills((prev) => prev.map((x) => x.id === bill.id ? { ...x, outstandingBalance: Number(newBal) } : x));
                            }
                          }}
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit Bill Balance"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete due bill for ${bill.customerName}?`)) {
                              setBills((prev) => prev.filter((x) => x.id !== bill.id));
                            }
                          }}
                          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Bill"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {payItem && (
        <CollectPaymentModal
          item={payItem}
          onClose={() => setPayItem(null)}
          onSubmit={handleSubmit}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {receipt && <AgentReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
};