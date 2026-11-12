import React, { useState, useEffect } from 'react';
import {
  Receipt,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Printer,
  RotateCcw,
  Loader2,
  Calendar,
  CreditCard,
  UserCheck,
  Building,
  ArrowRight,
  Eye,
  X,
  Edit2,
  Trash2
} from 'lucide-react';
import { api } from '../../api/client';
import type {
  Payment,
  PaymentReceipt,
  Customer,
  ChitGroup,
  Membership,
  Installment,
  UserRole
} from '../../types';

interface PaymentsViewProps {
  userRole: UserRole;
  initialCustomerId?: string;
  initialGroupId?: string;
  initialMembershipId?: string;
  initialInstallmentId?: string;
  onOpenReceipt: (receipt: PaymentReceipt) => void;
  onNavigateToCustomer: (customerId: string) => void;
}

/**
 * The backend (PHP + MySQL) should return these additional fields on every
 * membership object from `api.getMemberships(...)` so the Chit Agreement
 * Details panel below can populate automatically. All fields are optional
 * here so the form still renders safely if a field is not yet wired up on
 * the API side.
 */
type MembershipWithAgreement = Membership & {
  groupNo?: string;
  chitValue?: number;
  totalMembers?: number;
  durationMonths?: number;
  monthlySubscription?: number;
  agentName?: string;
  agentMobile?: string;
  agreementDate?: string;
  fatherHusbandName?: string;
  dob?: string;
  address?: string;
  permanentAddress?: string;
  occupation?: string;
  occupationAddress?: string;
  monthlyIncome?: number;
  nomineeName?: string;
  nomineeRelationship?: string;
  nomineeDob?: string;
  nomineeAddress?: string;
  totalPaid?: number;
  pendingAmount?: number;
};

/**
 * The subscriber's own full name is already available from the Customer
 * dropdown list (api.getCustomers()), so no extra API call is needed to
 * show it in the Agreement Details panel.
 */

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  userRole,
  initialCustomerId,
  initialGroupId,
  initialMembershipId,
  initialInstallmentId,
  onOpenReceipt,
  onNavigateToCustomer
}) => {
  const [activeTab, setActiveTab] = useState<'record' | 'history'>('record');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Search, Filter & Pagination for History
  const [searchHistory, setSearchHistory] = useState('');
  const [filterMode, setFilterMode] = useState('all');
  const [historyPage, setHistoryPage] = useState<number>(1);
  const historyItemsPerPage = 10;

  const handleExportHistoryCSV = () => {
    if (filteredHistory.length === 0) {
      alert('No receipt records available to export.');
      return;
    }
    const headers = ['S.No', 'Receipt #', 'Date', 'Customer ID', 'Customer Name', 'Group Name', 'Ticket #', 'Month #', 'Amount Paid (INR)', 'Payment Mode', 'Transaction Ref', 'Cashier', 'Status'];
    const rows = filteredHistory.map((p, i) => [
      i + 1,
      `"${p.receiptNumber || ''}"`,
      `"${String(p.paymentDate || '').split('T')[0]}"`,
      `"${p.customerId || ''}"`,
      `"${p.customerName || ''}"`,
      `"${p.groupName || ''}"`,
      p.ticketNumber || '',
      p.monthNumber || '',
      p.amountPaid || 0,
      `"${p.paymentMode || ''}"`,
      `"${p.transactionReference || ''}"`,
      `"${p.collectedByName || ''}"`,
      `"${p.status || ''}"`
    ]);

    const csvContent = [
      'JIVAN CHIT FUNDS - OFFICIAL RECEIPTS & COLLECTION LEDGER REPORT',
      `Exported On: ${new Date().toLocaleString()}`,
      '',
      headers.join(','),
      ...rows.map((row) => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Receipts_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Form State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId || '');
  const [customerMemberships, setCustomerMemberships] = useState<MembershipWithAgreement[]>([]);
  const [selectedMembershipId, setSelectedMembershipId] = useState<string>(initialMembershipId || '');
  const [pendingInstallments, setPendingInstallments] = useState<Installment[]>([]);
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string>(initialInstallmentId || '');

  // Payment Details
  const [amountPaid, setAmountPaid] = useState<number | ''>('');
  const [paymentMode, setPaymentMode] = useState<string>('Cash');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState<string>('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Reversal Modal State
  const [reversingPayment, setReversingPayment] = useState<Payment | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversalSubmitting, setReversalSubmitting] = useState(false);
  const [reversalError, setReversalError] = useState<string | null>(null);

  // Load Customers for dropdown
  useEffect(() => {
    api.getCustomers().then(setCustomers).catch(console.error);
  }, []);

  // Load Memberships (with agreement details) when Customer changes.
  // The Chit Group No. is derived entirely from the subscriber's own
  // memberships here — the user never types a group number manually.
  useEffect(() => {
    if (!selectedCustomerId) {
      setCustomerMemberships([]);
      setSelectedMembershipId('');
      return;
    }
    api
      .getMemberships(undefined, selectedCustomerId)
      .then((mems) => {
        // eslint-disable-next-line no-console
        console.log('getMemberships response for', selectedCustomerId, mems);
        setCustomerMemberships(mems as MembershipWithAgreement[]);
        if (mems.length > 0) {
          // If initial membership belongs to this customer, pick it; otherwise pick first
          if (initialMembershipId && mems.some((m) => m.membershipId === initialMembershipId)) {
            setSelectedMembershipId(initialMembershipId);
          } else {
            setSelectedMembershipId(mems[0].membershipId);
          }
        } else {
          setSelectedMembershipId('');
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('getMemberships failed for', selectedCustomerId, err);
        setCustomerMemberships([]);
        setSelectedMembershipId('');
      });
  }, [selectedCustomerId]);

  // Load Installments when Membership changes
  useEffect(() => {
    if (!selectedMembershipId) {
      setPendingInstallments([]);
      setSelectedInstallmentId('');
      return;
    }
    const mem = customerMemberships.find((m) => m.membershipId === selectedMembershipId);
    if (!mem) return;

    api.getInstallments({ membershipId: selectedMembershipId }).then((insts) => {
      const unpaid = insts.filter((i) => i.status !== 'Paid');
      setPendingInstallments(unpaid);
      if (unpaid.length > 0) {
        if (initialInstallmentId && unpaid.some((i) => i.installmentId === initialInstallmentId)) {
          setSelectedInstallmentId(initialInstallmentId);
        } else {
          setSelectedInstallmentId(unpaid[0].installmentId);
        }
      } else {
        setSelectedInstallmentId('');
      }
    });
  }, [selectedMembershipId, customerMemberships]);

  // Update Amount Paid default when Installment changes
  const activeInstallment = pendingInstallments.find((i) => i.installmentId === selectedInstallmentId);
  const activeMembership = customerMemberships.find((m) => m.membershipId === selectedMembershipId);
  const activeCustomer = customers.find((c) => c.customerId === selectedCustomerId);
  useEffect(() => {
    if (activeInstallment) {
      setAmountPaid(activeInstallment.balanceAmount);
    } else {
      setAmountPaid('');
    }
  }, [activeInstallment]);

  // Load Payment History
  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await api.getPayments();
      setPayments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Handle Submit Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstallmentId || !amountPaid || Number(amountPaid) <= 0) {
      setPaymentError('Please select an installment and specify a valid amount.');
      return;
    }

    if (activeInstallment && Number(amountPaid) > activeInstallment.balanceAmount) {
      setPaymentError(`Amount cannot exceed the remaining balance of ₹${activeInstallment.balanceAmount}`);
      return;
    }

    setSubmittingPayment(true);
    setPaymentError(null);
    try {
      const res = await api.recordPayment({
        installmentId: selectedInstallmentId,
        amountPaid: Number(amountPaid),
        paymentMode,
        transactionReference: transactionRef,
        paymentDate,
        remarks
      });

      // Clear form & open printable receipt modal immediately
      setAmountPaid('');
      setTransactionRef('');
      setRemarks('');
      onOpenReceipt(res.receipt);
      loadHistory();

      // Refresh pending installments
      if (selectedMembershipId) {
        const insts = await api.getInstallments({ membershipId: selectedMembershipId });
        const unpaid = insts.filter((i) => i.status !== 'Paid');
        setPendingInstallments(unpaid);
        if (unpaid.length > 0) setSelectedInstallmentId(unpaid[0].installmentId);
        else setSelectedInstallmentId('');
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Handle Payment Reversal (Admin)
  const handleConfirmReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversingPayment || !reversalReason.trim()) return;

    setReversalSubmitting(true);
    setReversalError(null);
    try {
      await api.reversePayment(reversingPayment.receiptNumber, reversalReason.trim());
      setReversingPayment(null);
      setReversalReason('');
      loadHistory();
    } catch (err: any) {
      setReversalError(err.message || 'Failed to reverse payment');
    } finally {
      setReversalSubmitting(false);
    }
  };

  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeletePayment = (p: Payment) => {
    setDeletingPayment(p);
    setDeleteError(null);
  };

  const confirmDeletePayment = async () => {
    if (!deletingPayment) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const pid = deletingPayment.id ? String(deletingPayment.id) : String(deletingPayment.receiptNumber);
      await api.deletePayment(pid);
      setPayments((prev) => prev.filter((item) => String(item.id || item.receiptNumber) !== pid));
      setDeletingPayment(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete payment');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleOpenReceipt = async (receiptNumber: string) => {
    try {
      const res = await api.getPaymentReceipt(receiptNumber);
      onOpenReceipt(res.receipt);
    } catch (err: any) {
      alert(err.message || 'Failed to fetch receipt');
    }
  };

  const filteredHistory = payments.filter((p) => {
    if (filterMode !== 'all' && p.paymentMode !== filterMode) return false;
    if (searchHistory.trim()) {
      const q = searchHistory.toLowerCase();
      return (
        p.receiptNumber.toLowerCase().includes(q) ||
        p.customerName?.toLowerCase().includes(q) ||
        p.customerId.toLowerCase().includes(q) ||
        p.groupName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Chit Fund Payments & Receipts
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Accept cash, bank, or UPI installments, compute remaining balances, and issue official receipts
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            id="tab-record-payment"
            onClick={() => setActiveTab('record')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'record'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Record Payment
          </button>
          <button
            id="tab-payment-history"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'history'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Receipts Ledger ({payments.length})
          </button>
        </div>
      </div>

      {activeTab === 'record' ? (
        /* RECORD PAYMENT FORM */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form (2 Cols) */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h2 className="font-bold text-slate-900 text-sm">Collection Entry Form</h2>
              </div>
              <span className="text-xs text-slate-500 font-mono">Date: {paymentDate}</span>
            </div>

            <form onSubmit={handleRecordPayment} className="p-5 sm:p-6 space-y-4 text-xs">
              {paymentError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              {/* Step 1: Select Subscriber */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">1. Select Subscriber *</label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">-- Choose Subscriber --</option>
                  {customers.map((c) => (
                    <option key={c.customerId} value={c.customerId}>
                      {c.fullName} ({c.customerId}) - {c.mobileNumber} ({c.city})
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Select Chit Group No. (auto-derived from the subscriber, never typed manually) & Installment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">2. Chit Group No. / Ticket *</label>
                  <select
                    required
                    disabled={!selectedCustomerId || customerMemberships.length === 0}
                    value={selectedMembershipId}
                    onChange={(e) => setSelectedMembershipId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white disabled:bg-slate-100"
                  >
                    {customerMemberships.length === 0 ? (
                      <option value="">No enrolled chit groups found</option>
                    ) : (
                      customerMemberships.map((m) => (
                        <option key={m.membershipId} value={m.membershipId}>
                          {(m.groupNo ? `${m.groupNo} - ` : '') + m.groupName} (Ticket #{m.ticketNumber})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Step 3: Select Installment */}
                <div>
                  <label className="block text-slate-700 font-medium mb-1">3. Due Installment Month *</label>
                  <select
                    required
                    disabled={!selectedMembershipId || pendingInstallments.length === 0}
                    value={selectedInstallmentId}
                    onChange={(e) => setSelectedInstallmentId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white disabled:bg-slate-100"
                  >
                    {pendingInstallments.length === 0 ? (
                      <option value="">All installments are fully settled</option>
                    ) : (
                      pendingInstallments.map((inst) => (
                        <option key={inst.installmentId} value={inst.installmentId}>
                          Month #{inst.monthNumber} • Due: {inst.dueDate} • Bal: ₹{inst.balanceAmount.toLocaleString()}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Chit Agreement Details — auto-fetched the moment a Chit Group / membership is selected */}
              {activeMembership && (
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wide block mb-2">
                    Chit Agreement Details
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <span className="text-slate-500 text-[10px] block">Subscriber Name</span>
                      <span className="font-semibold text-slate-900">{activeCustomer?.fullName || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">DOB</span>
                      <span className="font-mono text-slate-900">{activeCustomer?.dob || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Mobile No.</span>
                      <span className="font-mono text-slate-900">{activeCustomer?.mobileNumber || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Alternate Mobile</span>
                      <span className="font-mono text-slate-900">{activeCustomer?.alternateMobile || '—'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 text-[10px] block">Address</span>
                      <span className="text-slate-900">{activeCustomer?.address || '—'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 text-[10px] block">City</span>
                      <span className="text-slate-900">{activeCustomer?.city || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Pincode</span>
                      <span className="font-mono text-slate-900">{activeCustomer?.pincode || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Nominee</span>
                      <span className="text-slate-900">{activeCustomer?.nomineeName || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Chit Group No.</span>
                      <span className="font-mono font-semibold text-slate-900">{activeMembership.groupId || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Chit Group Name</span>
                      <span className="font-mono font-semibold text-slate-900">{activeMembership.groupName || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Chit Value</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {activeMembership.chitValue != null ? `₹${activeMembership.chitValue.toLocaleString()}` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Ticket Number</span>
                      <span className="font-mono text-slate-900">{activeMembership.ticketNumber ?? '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Total Installments</span>
                      <span className="font-mono text-slate-900">{activeMembership.totalInstallments ?? '—'} months</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Monthly Subscription</span>
                      <span className="font-mono font-semibold text-emerald-800">
                        {activeMembership.installmentAmount != null
                          ? `₹${activeMembership.installmentAmount.toLocaleString()}`
                          : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Joining Date</span>
                      <span className="font-mono text-slate-900">{activeMembership.joiningDate || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Status</span>
                      <span className="font-mono text-slate-900 capitalize">{activeMembership.status || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Total Paid</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {activeMembership.totalPaid != null ? `₹${activeMembership.totalPaid.toLocaleString()}` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Total Pending</span>
                      <span className="font-mono font-semibold text-rose-600">
                        {activeMembership.totalPending != null ? `₹${activeMembership.totalPending.toLocaleString()}` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Installment Summary Box */}
              {activeInstallment && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Gross Due</span>
                    <span className="font-mono font-semibold text-slate-900">₹{activeInstallment.installmentAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-emerald-700 text-[10px] block">Dividend Deduct</span>
                    <span className="font-mono font-semibold text-emerald-800">-₹{activeInstallment.dividendDeduction.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Net Installment</span>
                    <span className="font-mono font-bold text-slate-900">₹{activeInstallment.netDueAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-amber-800 text-[10px] block">Remaining Due</span>
                    <span className="font-mono font-bold text-amber-900 text-sm">₹{activeInstallment.balanceAmount.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Step 4: Amount & Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Amount to Collect (₹) *</label>
                  <input
                    type="number"
                    required
                    step="1"
                    min="1"
                    max={activeInstallment ? activeInstallment.balanceAmount : undefined}
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Enter collected amount"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold font-mono text-emerald-900 focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Allows partial or full payment of balance.</p>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Payment Mode *</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI (GooglePay / PhonePe / Paytm)</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/IMPS/RTGS)</option>
                    <option value="Cheque">Cheque / DD</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Transaction Ref / Cheque #</label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="e.g. UTR-9827361287 or CHQ-00128"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={paymentDate ? String(paymentDate).split('T')[0] : ''}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Remarks / Internal Notes</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional cashier remarks or receipt memo"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end">
                <button
                  id="submit-payment-btn"
                  type="submit"
                  disabled={submittingPayment || !selectedInstallmentId}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {submittingPayment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Printer className="w-4 h-4" />
                      <span>Record Payment & Issue Receipt</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Instant Instructions & Cash Handling Guidelines */}
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs">
              <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Collection Rules & Verification</span>
              </h3>
              <ul className="space-y-2 text-slate-600 text-[11px] leading-relaxed">
                <li>• Each receipt is sequentially numbered and strictly audit-logged.</li>
                <li>• Always hand over the printed or digital receipt to the subscriber immediately upon cash receipt.</li>
                <li>• For UPI / NEFT payments, verify the UTR / reference number against bank statements before confirmation.</li>
                <li>• Reversals require administrator authorization and mandatory recorded audit reasons.</li>
              </ul>
            </div>

            <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200/80 text-xs space-y-2">
              <span className="font-bold text-amber-900 block">Foreman Commission & Auction Dividend</span>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                Auction dividend deductions are automatically reflected on monthly installment slips. The net due amount shown is calculated as Gross Installment less Dividend Deduction.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* PAYMENT HISTORY & RECEIPTS LEDGER */
        <div className="space-y-4 font-sans">
          {/* Printable Header for Receipts Ledger (Print View Only) */}
          <div className="hidden print:flex flex-col items-center justify-center mb-6 py-3 border-b-2 border-black">
            <h2 className="text-xl font-extrabold tracking-wide uppercase text-slate-900 font-serif">
              JIVAN CHIT FUNDS - OFFICIAL RECEIPTS & COLLECTION LEDGER
            </h2>
            <p className="text-xs text-slate-700 font-mono mt-1">
              Printed On: {new Date().toLocaleString()}
            </p>
          </div>

          {/* Search, Filter, Export & Print Toolbar */}
          <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-xs">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by receipt #, subscriber, group..."
                value={searchHistory}
                onChange={(e) => {
                  setSearchHistory(e.target.value);
                  setHistoryPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-semibold">Mode:</span>
                <select
                  value={filterMode}
                  onChange={(e) => {
                    setFilterMode(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 font-medium focus:outline-none"
                >
                  <option value="all">All Modes</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div className="h-4 w-px bg-slate-300 hidden sm:block mx-1" />

              <button
                onClick={handleExportHistoryCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition shadow-xs"
              >
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipts Ledger</span>
              </button>
            </div>
          </div>

          {/* Table Container matching Customer Table structure */}
          <div className="bg-white rounded-xl border-2 border-slate-900 print:border-2 print:border-black shadow-xs overflow-hidden print-table-container">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse print-table">
                <thead className="bg-slate-50 text-slate-900 font-bold border-b-2 border-slate-900 print:bg-white print:text-black print:border-b-2 print:border-black">
                  <tr>
                    <th className="py-3 px-3 text-center border-r-2 border-slate-900 print:border-r-2 print:border-black w-12 font-bold">S.No</th>
                    <th className="py-3 px-3 border-r-2 border-slate-900 print:border-r-2 print:border-black font-bold whitespace-nowrap">Receipt #</th>
                    <th className="py-3 px-3 border-r-2 border-slate-900 print:border-r-2 print:border-black font-bold whitespace-nowrap">Date</th>
                    <th className="py-3 px-4 border-r-2 border-slate-900 print:border-r-2 print:border-black font-bold">Subscriber Name</th>
                    <th className="py-3 px-4 border-r-2 border-slate-900 print:border-r-2 print:border-black font-bold">Chit Group & Ticket</th>
                    <th className="py-3 px-3 text-right border-r-2 border-slate-900 print:border-r-2 print:border-black font-bold whitespace-nowrap">Amount Paid (₹)</th>
                    <th className="py-3 px-3 border-r-2 border-slate-900 print:border-r-2 print:border-black font-bold">Mode & Ref</th>
                    <th className="py-3 px-3 text-center border-r-2 border-slate-900 print:hidden font-bold w-20">Status</th>
                    <th className="py-3 px-3 text-center print:hidden font-bold w-36">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-900 print:divide-y-2 print:divide-black">
                  {loadingHistory ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-500 font-sans">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
                        Loading receipts ledger...
                      </td>
                    </tr>
                  ) : filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-500 font-sans">
                        No payment receipts found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      const totalPages = Math.ceil(filteredHistory.length / historyItemsPerPage) || 1;
                      const currentPage = Math.min(historyPage, totalPages);
                      const startIndex = (currentPage - 1) * historyItemsPerPage;
                      const paginatedList = filteredHistory.slice(startIndex, startIndex + historyItemsPerPage);

                      return (
                        <>
                          {paginatedList.map((p, idx) => {
                            const sno = startIndex + idx + 1;
                            return (
                              <tr key={p.id || p.receiptNumber} className="hover:bg-slate-50 transition">
                                <td className="py-2.5 px-3 text-center font-bold text-slate-700 border-r-2 border-slate-900 print:border-r-2 print:border-black font-mono">
                                  {sno}
                                </td>
                                <td className="py-2.5 px-3 font-extrabold text-slate-900 border-r-2 border-slate-900 print:border-r-2 print:border-black font-mono">
                                  {p.receiptNumber}
                                </td>
                                <td className="py-2.5 px-3 text-slate-700 border-r-2 border-slate-900 print:border-r-2 print:border-black font-mono whitespace-nowrap">
                                  {String(p.paymentDate || '').split('T')[0]}
                                </td>
                                <td className="py-2.5 px-4 font-bold text-slate-900 border-r-2 border-slate-900 print:border-r-2 print:border-black">
                                  <button
                                    onClick={() => onNavigateToCustomer(p.customerId)}
                                    className="hover:text-amber-700 hover:underline text-left font-bold block"
                                  >
                                    {p.customerName}
                                  </button>
                                  <span className="text-[10px] text-slate-500 font-mono block font-normal">{p.customerId}</span>
                                </td>
                                <td className="py-2.5 px-4 border-r-2 border-slate-900 print:border-r-2 print:border-black">
                                  <span className="font-bold text-slate-900 block text-xs">{p.groupName}</span>
                                  <span className="text-amber-900 text-[10px] font-mono font-semibold">Ticket #{p.ticketNumber} • Month #{p.monthNumber}</span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-extrabold text-emerald-800 text-sm border-r-2 border-slate-900 print:border-r-2 print:border-black font-mono whitespace-nowrap">
                                  ₹{p.amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-2.5 px-3 border-r-2 border-slate-900 print:border-r-2 print:border-black">
                                  <span className="inline-block px-2 py-0.5 bg-slate-100 border border-slate-300 text-slate-800 rounded font-mono font-bold text-[10px]">
                                    {p.paymentMode}
                                  </span>
                                  {p.transactionReference && (
                                    <span className="block text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[120px]" title={p.transactionReference}>
                                      Ref: {p.transactionReference}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center border-r-2 border-slate-900 print:hidden">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                                      p.status === 'active'
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                                    }`}
                                  >
                                    {p.status}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-center print:hidden">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => handleOpenReceipt(p.receiptNumber)}
                                      className="p-1 text-emerald-700 hover:bg-emerald-50 rounded transition"
                                      title="Print Official Slip"
                                    >
                                      <Printer className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={async () => {
                                        const newAmt = prompt('Edit payment amount (₹):', String(p.amountPaid));
                                        if (newAmt && !isNaN(Number(newAmt))) {
                                          try {
                                            const pid = p.id ? String(p.id) : String(p.receiptNumber);
                                            await api.updatePayment(pid, { amountPaid: Number(newAmt) });
                                            loadHistory();
                                          } catch (err: any) {
                                            alert(err.message || 'Failed to update payment');
                                          }
                                        }
                                      }}
                                      className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                                      title="Edit Amount"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeletePayment(p)}
                                      className="p-1 text-rose-600 hover:bg-rose-50 rounded transition"
                                      title="Delete Payment"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                    {p.status === 'active' && userRole === 'admin' && (
                                      <button
                                        onClick={() => {
                                          setReversingPayment(p);
                                          setReversalReason('');
                                          setReversalError(null);
                                        }}
                                        className="p-1 text-amber-700 hover:bg-amber-50 rounded transition"
                                        title="Reverse Payment"
                                      >
                                        <RotateCcw className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </>
                      );
                    })()
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (Matching Customer Table) */}
            {filteredHistory.length > 0 && (
              <div className="print:hidden px-4 py-3 bg-slate-50 border-t-2 border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="text-slate-600 font-medium">
                  Showing <span className="font-bold text-slate-900">{Math.min((historyPage - 1) * historyItemsPerPage + 1, filteredHistory.length)}</span> to{' '}
                  <span className="font-bold text-slate-900">{Math.min(historyPage * historyItemsPerPage, filteredHistory.length)}</span> of{' '}
                  <span className="font-bold text-slate-900">{filteredHistory.length}</span> receipt entries
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={historyPage === 1}
                    onClick={() => setHistoryPage((prev) => Math.max(prev - 1, 1))}
                    className="px-3 py-1.5 border-2 border-slate-900 rounded-lg font-bold bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white transition"
                  >
                    Previous
                  </button>
                  <span className="px-2 font-bold text-slate-800">
                    Page {historyPage} of {Math.ceil(filteredHistory.length / historyItemsPerPage) || 1}
                  </span>
                  <button
                    disabled={historyPage >= Math.ceil(filteredHistory.length / historyItemsPerPage)}
                    onClick={() => setHistoryPage((prev) => prev + 1)}
                    className="px-3 py-1.5 border-2 border-slate-900 rounded-lg font-bold bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REVERSAL MODAL (ADMIN ONLY) */}
      {reversingPayment && (
        <div id="reversal-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto max-h-[92vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-rose-50 text-rose-900 shrink-0">
              <div className="flex items-center gap-2 font-bold text-sm min-w-0">
                <RotateCcw className="w-4 h-4 text-rose-700 shrink-0" />
                <span className="truncate">Reverse Receipt {reversingPayment.receiptNumber}</span>
              </div>
              <button
                onClick={() => setReversingPayment(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReversal} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {reversalError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                  {reversalError}
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 space-y-1">
                <p><strong>Subscriber:</strong> {reversingPayment.customerName}</p>
                <p><strong>Amount:</strong> ₹{reversingPayment.amountPaid.toLocaleString()}</p>
                <p><strong>Date:</strong> {reversingPayment.paymentDate}</p>
              </div>

              <p className="text-rose-700 font-medium">
                Warning: Reversing this payment will restore the installment balance and record an irreversible administrative audit entry.
              </p>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reason for Reversal *</label>
                <textarea
                  required
                  rows={3}
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="e.g. Cheque bounce, wrong account selected, duplicate entry..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReversingPayment(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reversalSubmitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5"
                >
                  {reversalSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Reversal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-UI Confirmation Modal for Deleting Payment */}
      {deletingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Delete Payment Receipt?
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Are you sure you want to permanently delete receipt <strong className="text-slate-900 font-semibold">#{deletingPayment.receiptNumber}</strong> of amount <span className="font-mono text-emerald-800 font-bold">₹{Number(deletingPayment.amountPaid || 0).toLocaleString()}</span> for subscriber <span className="font-semibold text-slate-900">{deletingPayment.customerName}</span>?
              </p>
              <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3 mt-3.5 text-left leading-relaxed">
                ⚠️ <strong>Notice:</strong> This action permanently deletes the transaction receipt and will recalculate subscriber account ledger balance.
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
                    setDeletingPayment(null);
                    setDeleteError(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={confirmDeletePayment}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Yes, Delete Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};