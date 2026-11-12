import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  ShieldAlert,
  Loader2,
  Calendar,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Code,
  Info,
  DollarSign,
  Gavel,
  Gift,
  LogIn,
  UserPlus,
  Receipt,
  RotateCcw
} from 'lucide-react';
import { api } from '../../api/client';
import type { AuditLog, UserRole } from '../../types';

// Helper to safely parse JSON strings
const safeParseJson = (val: any) => {
  if (!val) return {};
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return { raw: String(val) };
  }
};

// Date formatter
const formatDate = (dateStr: any) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr).split('T')[0];
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return String(dateStr);
  }
};

// Translates raw developer action codes into clean readable business names
const getHumanActionInfo = (action: string): { label: string; badgeClass: string; icon: any } => {
  switch (action) {
    case 'RECORD_PAYMENT':
      return { label: 'Payment Collection', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: Receipt };
    case 'REVERSE_PAYMENT':
      return { label: 'Payment Reversal', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200', icon: RotateCcw };
    case 'DISBURSE_PRIZE':
      return { label: 'Prize Disbursal', badgeClass: 'bg-purple-50 text-purple-800 border-purple-200', icon: Gift };
    case 'RECORD_AUCTION':
      return { label: 'Auction Held', badgeClass: 'bg-amber-50 text-amber-900 border-amber-200', icon: Gavel };
    case 'USER_LOGIN':
      return { label: 'User Login', badgeClass: 'bg-sky-50 text-sky-800 border-sky-200', icon: LogIn };
    case 'CREATE_CUSTOMER':
      return { label: 'New Subscriber', badgeClass: 'bg-teal-50 text-teal-800 border-teal-200', icon: UserPlus };
    case 'UPDATE_CUSTOMER':
      return { label: 'Update Customer', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200', icon: Edit2 };
    case 'DELETE_CUSTOMER':
      return { label: 'Delete Customer', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200', icon: Trash2 };
    case 'CREATE_MEMBERSHIP':
      return { label: 'Scheme Enrollment', badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200', icon: CheckCircle2 };
    case 'UPDATE_MEMBERSHIP':
      return { label: 'Update Membership', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200', icon: Edit2 };
    case 'DELETE_MEMBERSHIP':
      return { label: 'Cancel Membership', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200', icon: Trash2 };
    case 'CREATE_GROUP':
      return { label: 'New Chit Scheme', badgeClass: 'bg-violet-50 text-violet-800 border-violet-200', icon: FileText };
    case 'UPDATE_GROUP':
      return { label: 'Update Scheme', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200', icon: Edit2 };
    case 'DELETE_CHIT_GROUP':
      return { label: 'Delete Scheme', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200', icon: Trash2 };
    case 'CREATE_EXPENSE':
      return { label: 'Office Expense', badgeClass: 'bg-orange-50 text-orange-800 border-orange-200', icon: DollarSign };
    case 'UPDATE_EXPENSE':
      return { label: 'Update Expense', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200', icon: Edit2 };
    case 'DELETE_EXPENSE':
      return { label: 'Delete Expense', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200', icon: Trash2 };
    case 'SUBMIT_HANDOVER':
      return { label: 'Cash Handover', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: CheckCircle2 };
    case 'VERIFY_HANDOVER':
      return { label: 'Verify Handover', badgeClass: 'bg-teal-50 text-teal-800 border-teal-200', icon: CheckCircle2 };
    case 'CREATE_USER':
      return { label: 'Create Staff User', badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200', icon: UserPlus };
    case 'UPDATE_USER':
      return { label: 'Update User', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200', icon: Edit2 };
    case 'DELETE_USER':
      return { label: 'Delete User', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200', icon: Trash2 };
    default:
      return {
        label: action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
        badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
        icon: Info
      };
  }
};

// Translates raw JSON payload into human business language
const getHumanAuditDetails = (log: AuditLog): { headline: string; chips: { label: string; value: string }[] } => {
  let data: any = {};
  if (log.newValue) {
    data = safeParseJson(log.newValue);
  } else if (log.details) {
    data = safeParseJson(log.details);
  }

  const chips: { label: string; value: string }[] = [];
  const action = log.action || '';

  // If plain string without JSON keys
  if (data.raw) {
    return { headline: data.raw, chips: [] };
  }

  switch (action) {
    case 'RECORD_PAYMENT': {
      const amt = data.amountPaid !== undefined ? `₹${Number(data.amountPaid).toLocaleString('en-IN')}` : '';
      const mode = data.paymentMode || 'Cash';
      const inst = data.installmentId ? `for Installment ${data.installmentId}` : '';
      const date = data.paymentDate ? formatDate(data.paymentDate) : '';
      const headline = `Payment of ${amt} received via ${mode} ${inst}${date ? ` on ${date}` : ''}`.trim();
      if (amt) chips.push({ label: 'Amount', value: amt });
      if (mode) chips.push({ label: 'Mode', value: mode });
      if (data.installmentId) chips.push({ label: 'Installment', value: data.installmentId });
      if (date) chips.push({ label: 'Date', value: date });
      return { headline, chips };
    }

    case 'REVERSE_PAYMENT': {
      const reason = data.reason || 'Reversal requested';
      const headline = `Receipt payment reversed & ledger rolled back (${reason})`;
      chips.push({ label: 'Reason', value: reason });
      return { headline, chips };
    }

    case 'DISBURSE_PRIZE': {
      const amt = data.amountToDisburse !== undefined ? `₹${Number(data.amountToDisburse).toLocaleString('en-IN')}` : '';
      const mode = data.paymentMode || 'Bank Transfer';
      const ref = data.transactionReference || data.referenceNo || '';
      const date = data.disbursalDate ? formatDate(data.disbursalDate) : '';
      const headline = `Prize money of ${amt} disbursed via ${mode}${date ? ` on ${date}` : ''}`.trim();
      if (amt) chips.push({ label: 'Prize Amount', value: amt });
      if (mode) chips.push({ label: 'Payout Mode', value: mode });
      if (ref) chips.push({ label: 'Reference #', value: ref });
      if (date) chips.push({ label: 'Date', value: date });
      return { headline, chips };
    }

    case 'RECORD_AUCTION': {
      const auctionNo = data.auctionNumber ? `#${data.auctionNumber}` : '';
      const grp = data.groupId || '';
      const discount = data.bidDiscountAmount !== undefined ? `₹${Number(data.bidDiscountAmount).toLocaleString('en-IN')}` : '';
      const date = data.auctionDate ? formatDate(data.auctionDate) : '';
      const headline = `Conducted Auction ${auctionNo} for Group ${grp}${date ? ` on ${date}` : ''}`.trim();
      if (grp) chips.push({ label: 'Group', value: grp });
      if (auctionNo) chips.push({ label: 'Auction No', value: auctionNo });
      if (discount) chips.push({ label: 'Bid Discount', value: discount });
      if (date) chips.push({ label: 'Date', value: date });
      return { headline, chips };
    }

    case 'USER_LOGIN': {
      const ip = data.ip || log.ipAddress || '127.0.0.1';
      const headline = `User successfully authenticated from network IP ${ip}`;
      chips.push({ label: 'IP Address', value: ip });
      return { headline, chips };
    }

    case 'CREATE_CUSTOMER':
    case 'UPDATE_CUSTOMER': {
      const isCreate = action === 'CREATE_CUSTOMER';
      const name = data.fullName || data.name || 'Subscriber';
      const mobile = data.mobileNumber || data.phone || '';
      const headline = `${isCreate ? 'Registered new subscriber profile' : 'Updated subscriber profile'}: ${name}${mobile ? ` (${mobile})` : ''}`.trim();
      if (name) chips.push({ label: 'Name', value: name });
      if (mobile) chips.push({ label: 'Mobile', value: mobile });
      return { headline, chips };
    }

    case 'DELETE_CUSTOMER': {
      const headline = `Deleted subscriber account (Customer ID: ${data.customerId || log.recordId})`;
      chips.push({ label: 'Customer ID', value: String(data.customerId || log.recordId) });
      return { headline, chips };
    }

    case 'CREATE_MEMBERSHIP':
    case 'UPDATE_MEMBERSHIP': {
      const isCreate = action === 'CREATE_MEMBERSHIP';
      const grp = data.groupId || '';
      const ticket = data.ticketNumber !== undefined ? `Ticket #${data.ticketNumber}` : '';
      const headline = `${isCreate ? 'Enrolled subscriber into' : 'Updated membership in'} group ${grp} (${ticket})`.trim();
      if (grp) chips.push({ label: 'Group', value: grp });
      if (ticket) chips.push({ label: 'Ticket', value: ticket });
      return { headline, chips };
    }

    case 'DELETE_MEMBERSHIP': {
      const headline = `Removed subscriber from chit scheme membership (ID: ${data.membershipId || log.recordId})`;
      chips.push({ label: 'Membership ID', value: String(data.membershipId || log.recordId) });
      return { headline, chips };
    }

    case 'CREATE_GROUP':
    case 'UPDATE_GROUP': {
      const isCreate = action === 'CREATE_GROUP';
      const name = data.groupName || '';
      const val = data.chitValue ? `₹${Number(data.chitValue).toLocaleString('en-IN')}` : '';
      const headline = `${isCreate ? 'Created new chit scheme' : 'Updated chit scheme'}: ${name} (${val})`.trim();
      if (name) chips.push({ label: 'Scheme Name', value: name });
      if (val) chips.push({ label: 'Chit Value', value: val });
      return { headline, chips };
    }

    case 'DELETE_CHIT_GROUP': {
      const headline = `Deleted chit scheme (Group ID: ${data.groupId || log.recordId})`;
      chips.push({ label: 'Group ID', value: String(data.groupId || log.recordId) });
      return { headline, chips };
    }

    case 'CREATE_EXPENSE':
    case 'UPDATE_EXPENSE': {
      const isCreate = action === 'CREATE_EXPENSE';
      const amt = data.amount ? `₹${Number(data.amount).toLocaleString('en-IN')}` : '';
      const cat = data.category || 'General';
      const desc = data.description || '';
      const headline = `${isCreate ? 'Recorded office expense' : 'Updated office expense'} of ${amt} under category ${cat}${desc ? ` (${desc})` : ''}`.trim();
      if (amt) chips.push({ label: 'Amount', value: amt });
      if (cat) chips.push({ label: 'Category', value: cat });
      return { headline, chips };
    }

    case 'DELETE_EXPENSE': {
      const headline = `Deleted expense voucher (ID: ${data.expenseId || log.recordId})`;
      chips.push({ label: 'Expense ID', value: String(data.expenseId || log.recordId) });
      return { headline, chips };
    }

    case 'SUBMIT_HANDOVER':
    case 'VERIFY_HANDOVER': {
      const isVerify = action === 'VERIFY_HANDOVER';
      const status = data.status || 'Verified';
      const amt = data.totalCollected !== undefined ? `₹${Number(data.totalCollected).toLocaleString('en-IN')}` : '';
      const headline = `${isVerify ? 'Manager verified daily collection handover' : 'Field agent submitted daily collection handover'} ${amt ? `(${amt})` : ''}`.trim();
      if (status) chips.push({ label: 'Status', value: status });
      if (amt) chips.push({ label: 'Handover Amount', value: amt });
      return { headline, chips };
    }

    default: {
      const keys = Object.keys(data);
      if (keys.length === 0) {
        return { headline: log.action.replace(/_/g, ' '), chips: [] };
      }
      const tagList = keys.slice(0, 4).map((k) => ({
        label: k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim(),
        value: typeof data[k] === 'object' ? JSON.stringify(data[k]) : String(data[k])
      }));
      const headline = tagList.map((t) => `${t.label}: ${t.value}`).join(' • ');
      return { headline, chips: tagList };
    }
  }
};

// Formats entity nicely
const getHumanEntityInfo = (module?: string, recordId?: string) => {
  if (!module && !recordId) return 'General';
  const cleanMod = (module || 'RECORD').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return `${cleanMod}: ${recordId || '-'}`;
};

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Raw JSON Inspector Modal
  const [inspectingJson, setInspectingJson] = useState<{ title: string; json: string } | null>(null);

  // Edit Audit Log Modal
  const [editingLog, setEditingLog] = useState<AuditLog | null>(null);
  const [editAction, setEditAction] = useState('');
  const [editDetails, setEditDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditLogs();
      setLogs(data || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // Reset to page 1 on search or filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, actionFilter, pageSize]);

  const handleOpenEdit = (log: AuditLog) => {
    setEditingLog(log);
    setEditAction(log.action || '');
    setEditDetails(log.details || (log.newValue ? JSON.stringify(log.newValue) : ''));
    setModalError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;
    const logId = editingLog.id || (editingLog as any).logId;

    setSubmitting(true);
    setModalError(null);
    try {
      await api.updateAuditLog(logId!, {
        action: editAction,
        details: editDetails
      });
      setEditingLog(null);
      loadLogs();
    } catch (err: any) {
      setModalError(err.message || 'Failed to update audit log entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLog = async (log: AuditLog) => {
    const logId = log.id || (log as any).logId;
    if (!confirm('Are you sure you want to permanently delete this audit record?')) return;
    try {
      await api.deleteAuditLog(logId!);
      setLogs((prev) => prev.filter((l) => (l.id || (l as any).logId) !== logId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete audit log entry');
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (actionFilter !== 'all' && log.action !== actionFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchAction = (log.action || '').toLowerCase().includes(q);
        const matchUser = (log.username || '').toLowerCase().includes(q);
        const detailsStr = (log.details || JSON.stringify(log.newValue || '')).toLowerCase();
        const matchDetails = detailsStr.includes(q);
        const matchId = (log.recordId || log.entityId || '').toLowerCase().includes(q);
        if (!matchAction && !matchUser && !matchDetails && !matchId) return false;
      }
      return true;
    });
  }, [logs, actionFilter, searchQuery]);

  // Pagination calculation
  const totalItems = filteredLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const currentLogs = filteredLogs.slice(startIndex, endIndex);

  const actionTypes = useMemo(() => Array.from(new Set(logs.map((l) => l.action))), [logs]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-sans flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-600" />
            <span>Immutable Audit Trail</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographically tracked operational records of payments, prize disbursals, customer creations, and system events
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadLogs}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-2xs transition"
          >
            Refresh Log
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by action, operator, details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Action:</span>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
            >
              <option value="all">All Actions ({logs.length})</option>
              {actionTypes.map((act) => {
                const info = getHumanActionInfo(act);
                return (
                  <option key={act} value={act}>
                    {info.label} ({logs.filter((l) => l.action === act).length})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-36">Timestamp</th>
                <th className="py-3 px-4 w-28">Operator</th>
                <th className="py-3 px-4 w-44">Action Event</th>
                <th className="py-3 px-4 w-44">Entity / Target</th>
                <th className="py-3 px-4">Event Description & Business Details</th>
                <th className="py-3 px-4 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 font-sans">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
                    Loading audit trail...
                  </td>
                </tr>
              ) : currentLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 font-sans">
                    No audit records match the selected query.
                  </td>
                </tr>
              ) : (
                currentLogs.map((log, idx) => {
                  const actionInfo = getHumanActionInfo(log.action);
                  const humanDetails = getHumanAuditDetails(log);
                  const entityInfo = getHumanEntityInfo(log.module || log.entityType, log.recordId || log.entityId);
                  const ActionIcon = actionInfo.icon;

                  return (
                    <tr key={log.id || (log as any).logId || idx} className="hover:bg-slate-50/80 transition">
                      {/* 1. Timestamp */}
                      <td className="py-3 px-4 text-slate-600 text-[11px] whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {formatDate(log.timestamp)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </td>

                      {/* 2. Operator */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 font-bold text-slate-900">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                          <span>{log.username}</span>
                        </span>
                      </td>

                      {/* 3. Action */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border ${actionInfo.badgeClass}`}>
                          <ActionIcon className="w-3 h-3 shrink-0" />
                          <span>{actionInfo.label}</span>
                        </span>
                      </td>

                      {/* 4. Entity */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-mono border border-slate-200">
                          {entityInfo}
                        </span>
                      </td>

                      {/* 5. Human Event Details & Metadata */}
                      <td className="py-3 px-4 text-slate-800">
                        <div className="font-medium text-slate-900 text-xs">
                          {humanDetails.headline}
                        </div>

                        {/* Attribute Chips */}
                        {humanDetails.chips.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {humanDetails.chips.map((chip, cIdx) => (
                              <span
                                key={cIdx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                              >
                                <span className="text-slate-500 font-semibold">{chip.label}:</span>
                                <span className="text-slate-900 font-bold">{chip.value}</span>
                              </span>
                            ))}

                            {/* Optional Raw JSON Inspector */}
                            <button
                              onClick={() =>
                                setInspectingJson({
                                  title: `Audit Entry #${log.id || (log as any).logId} Payload`,
                                  json: JSON.stringify(safeParseJson(log.newValue || log.details), null, 2)
                                })
                              }
                              className="text-[10px] text-slate-400 hover:text-amber-700 inline-flex items-center gap-0.5 ml-1 transition"
                              title="Inspect raw technical payload"
                            >
                              <Code className="w-3 h-3" />
                              <span>JSON</span>
                            </button>
                          </div>
                        )}
                      </td>

                      {/* 6. Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(log)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded border border-slate-200 transition"
                            title="Edit Audit Log"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteLog(log)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded border border-slate-200 transition"
                            title="Delete Audit Log"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ============================================================ */}
        {/* PAGINATION TOOLBAR                                           */}
        {/* ============================================================ */}
        {totalItems > 0 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-600">
              Showing <span className="font-bold text-slate-900">{startIndex + 1}</span> to{' '}
              <span className="font-bold text-slate-900">{endIndex}</span> of{' '}
              <span className="font-bold text-slate-900">{totalItems}</span> audit entries
            </div>

            <div className="flex items-center gap-1">
              {/* First Page */}
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 text-slate-600 hover:bg-white border border-slate-200 rounded-md disabled:opacity-40 disabled:pointer-events-none transition"
                title="First Page"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>

              {/* Prev Page */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 text-slate-600 hover:bg-white border border-slate-200 rounded-md disabled:opacity-40 disabled:pointer-events-none transition"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Page Number Chips */}
              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5) {
                    if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-7 h-7 px-2 flex items-center justify-center font-bold text-xs rounded-md transition ${
                        currentPage === pageNum
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Page */}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 text-slate-600 hover:bg-white border border-slate-200 rounded-md disabled:opacity-40 disabled:pointer-events-none transition"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Last Page */}
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 text-slate-600 hover:bg-white border border-slate-200 rounded-md disabled:opacity-40 disabled:pointer-events-none transition"
                title="Last Page"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RAW JSON INSPECTION MODAL */}
      {inspectingJson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Code className="w-4 h-4 text-amber-600" />
                <span>{inspectingJson.title}</span>
              </h3>
              <button onClick={() => setInspectingJson(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs font-mono max-h-80 overflow-y-auto whitespace-pre-wrap">
                {inspectingJson.json}
              </pre>
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setInspectingJson(null)}
                className="px-4 py-1.5 bg-slate-800 text-white font-semibold text-xs rounded-lg hover:bg-slate-700 transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT AUDIT LOG MODAL */}
      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                Edit Audit Entry #{editingLog.id || (editingLog as any).logId}
              </h3>
              <button onClick={() => setEditingLog(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 text-xs">
              {modalError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-medium mb-1">Action Name</label>
                <input
                  type="text"
                  required
                  value={editAction}
                  onChange={(e) => setEditAction(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Details & Metadata</label>
                <textarea
                  rows={4}
                  value={editDetails}
                  onChange={(e) => setEditDetails(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Audit Entry</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
