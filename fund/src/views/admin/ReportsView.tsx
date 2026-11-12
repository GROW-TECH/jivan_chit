import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Building,
  CheckCircle2,
  PieChart,
  Loader2,
  Search,
  Edit2,
  Trash2
} from 'lucide-react';
import { api } from '../../api/client';
import type { ChitGroup, Customer, UserRole } from '../../types';
import { Logo } from '../../components/Logo';

interface ReportsViewProps {
  userRole: UserRole;
  onNavigateToCustomer: (customerId: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ userRole, onNavigateToCustomer }) => {
  const [activeTab, setActiveTab] = useState<'collections' | 'outstanding' | 'groups' | 'pnl' | 'joining_grouping'>('collections');
  const [loading, setLoading] = useState(false);

  // Data states
  const [collectionReport, setCollectionReport] = useState<any>(null);
  const [outstandingReport, setOutstandingReport] = useState<any>(null);
  const [groupReport, setGroupReport] = useState<any>(null);
  const [pnlReport, setPnlReport] = useState<any>(null);
  const [joiningGroupingReport, setJoiningGroupingReport] = useState<any[]>([]);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('all');
  const [groups, setGroups] = useState<ChitGroup[]>([]);

  // In-UI Delete Scheme state for Tab 4
  const [deletingScheme, setDeletingScheme] = useState<any | null>(null);
  const [deleteSchemeLoading, setDeleteSchemeLoading] = useState(false);
  const [deleteSchemeError, setDeleteSchemeError] = useState<string | null>(null);

  useEffect(() => {
    api.getChitGroups().then(setGroups).catch(console.error);
  }, []);

  const loadReportData = async () => {
    try {
      setLoading(true);
      const params = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        groupId: selectedGroupId !== 'all' ? selectedGroupId : undefined
      };

      if (activeTab === 'collections') {
        const data = await api.getCollectionReport(params);
        setCollectionReport(data);
      } else if (activeTab === 'outstanding') {
        const data = await api.getOutstandingReport(params.groupId);
        setOutstandingReport(data);
      } else if (activeTab === 'groups') {
        const data = await api.getGroupPerformanceReport();
        setGroupReport(data);
      } else if (activeTab === 'joining_grouping') {
        // Fetch Chit Booking / Joining & Grouping Date Wise Report
        const data = await api.getChitBookingList();
        setJoiningGroupingReport(data || []);
      } else if (activeTab === 'pnl') {
        // Load collections, expenses, and auctions to compute company P&L
        const [dash, exps, aucs] = await Promise.all([
          api.getDashboardSummary(),
          api.getExpenses(),
          api.getAuctions()
        ]);
        const totalCommission = aucs.reduce((s: number, a: any) => s + (a.foremanCommission || 0), 0);
        const totalExpenses = exps.reduce((s: number, e: any) => s + (e.amount || 0), 0);
        const netProfit = totalCommission - totalExpenses;
        setPnlReport({
          totalCommission,
          totalExpenses,
          netProfit,
          expenses: exps,
          auctions: aucs,
          summary: dash
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [activeTab, selectedGroupId]);

  // Date and Currency Formatting Helpers
  const formatDate = (dateStr: any) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        return String(dateStr).split('T')[0];
      }
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return String(dateStr);
    }
  };

  const formatCurrency = (val: number | string | undefined | null) => {
    const num = Number(val || 0);
    return '₹' + num.toLocaleString('en-IN');
  };

  const selectedGroupObj = groups.find((g) => g.groupId === selectedGroupId);
  const selectedGroupName =
    selectedGroupId === 'all'
      ? 'All Chit Groups'
      : selectedGroupObj
      ? `${selectedGroupObj.groupName} (${selectedGroupObj.groupId})`
      : selectedGroupId;

  const periodText =
    startDate && endDate
      ? `${formatDate(startDate)} to ${formatDate(endDate)}`
      : startDate
      ? `From ${formatDate(startDate)}`
      : endDate
      ? `Up to ${formatDate(endDate)}`
      : 'All Recorded Dates';

  const getReportTitle = () => {
    switch (activeTab) {
      case 'collections':
        return 'DAILY & MONTHLY COLLECTIONS AUDIT REGISTER';
      case 'joining_grouping':
        return 'SUBSCRIBER JOINING & CHIT GROUP BOOKING REGISTER';
      case 'outstanding':
        return 'OUTSTANDING DUES & OVERDUE DEFAULTERS STATEMENT';
      case 'groups':
        return 'CHIT SCHEMES EFFICIENCY & RECOVERY MATRIX';
      case 'pnl':
        return 'COMPANY PROFIT & LOSS AUDIT STATEMENT';
      default:
        return 'FINANCIAL & OPERATIONAL AUDIT REPORT';
    }
  };

  // Filtered Joining / Grouping List
  const filteredJoiningGrouping = joiningGroupingReport.filter((item: any) => {
    const itemGroup = item.groupId || item.chitGroupCode || item.groupName;
    const matchesGroup =
      selectedGroupId === 'all' ||
      itemGroup === selectedGroupId ||
      (item.newGroupNo && item.newGroupNo.includes(selectedGroupId));
    let matchesDate = true;
    const dateVal = item.joiningDate || item.dueDate || item.groupingDate;
    if (startDate && dateVal && String(dateVal).split('T')[0] < startDate) matchesDate = false;
    if (endDate && dateVal && String(dateVal).split('T')[0] > endDate) matchesDate = false;
    return matchesGroup && matchesDate;
  });

  // CSV Export utility
  const exportToCSV = (filename: string, rows: any[]) => {
    if (!rows || rows.length === 0) {
      alert('No data to export');
      return;
    }
    const headers = Object.keys(rows[0]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        headers.join(','),
        ...rows.map((r) =>
          headers
            .map((h) => {
              const val = r[h] !== undefined && r[h] !== null ? String(r[h]) : '';
              return `"${val.replace(/"/g, '""')}"`;
            })
            .join(',')
        )
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const confirmDeleteScheme = async () => {
    if (!deletingScheme) return;
    setDeleteSchemeLoading(true);
    setDeleteSchemeError(null);
    try {
      await api.deleteChitGroup(deletingScheme.groupId || deletingScheme.id);
      setGroupReport((prev: any) =>
        prev
          ? {
              ...prev,
              groups: prev.groups.filter((x: any) => (x.groupId || x.id) !== (deletingScheme.groupId || deletingScheme.id))
            }
          : null
      );
      setDeletingScheme(null);
    } catch (err: any) {
      setDeleteSchemeError(err.message || 'Failed to delete scheme');
    } finally {
      setDeleteSchemeLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto print:p-0 print:m-0 print:max-w-none print:w-full print:space-y-3 font-sans">
      {/* ============================================================ */}
      {/* SCREEN HEADER & ACTION BAR (HIDDEN IN PRINT)                 */}
      {/* ============================================================ */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Financial & Operational Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit collection ledgers, defaulters tracking, scheme performance, joining dates, and company profit & loss
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="print-report-btn"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* TABS (HIDDEN IN PRINT) */}
      <div className="print:hidden flex overflow-x-auto gap-1 bg-slate-100 p-1.5 rounded-xl text-xs font-semibold whitespace-nowrap scrollbar-none">
        <button
          id="tab-report-collections"
          onClick={() => setActiveTab('collections')}
          className={`px-3.5 sm:px-4 py-2 rounded-lg transition shrink-0 ${
            activeTab === 'collections' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Daily / Monthly Collections
        </button>
        <button
          id="tab-report-joining-grouping"
          onClick={() => setActiveTab('joining_grouping')}
          className={`px-3.5 sm:px-4 py-2 rounded-lg transition shrink-0 ${
            activeTab === 'joining_grouping' ? 'bg-white text-slate-900 shadow-xs font-bold border border-amber-300' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Joining & Grouping Date Reports
        </button>
        <button
          id="tab-report-outstanding"
          onClick={() => setActiveTab('outstanding')}
          className={`px-3.5 sm:px-4 py-2 rounded-lg transition shrink-0 ${
            activeTab === 'outstanding' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Outstanding Dues & Defaulters
        </button>
        <button
          id="tab-report-groups"
          onClick={() => setActiveTab('groups')}
          className={`px-3.5 sm:px-4 py-2 rounded-lg transition shrink-0 ${
            activeTab === 'groups' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Chit Schemes Efficiency
        </button>
        <button
          id="tab-report-pnl"
          onClick={() => setActiveTab('pnl')}
          className={`px-3.5 sm:px-4 py-2 rounded-lg transition shrink-0 ${
            activeTab === 'pnl' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Company Profit & Loss
        </button>
      </div>

      {/* FILTER TOOLBAR (HIDDEN IN PRINT) */}
      {(activeTab === 'collections' || activeTab === 'outstanding' || activeTab === 'joining_grouping') && (
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Group:</span>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium"
              >
                <option value="all">All Chit Groups</option>
                {groups.map((g, idx) => (
                  <option key={g.groupId || idx} value={g.groupId}>
                    {g.groupName} ({g.groupId})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold">Date Range:</span>
              <input
                type="date"
                value={startDate ? String(startDate).split('T')[0] : ''}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate ? String(endDate).split('T')[0] : ''}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700"
              />
              <button
                onClick={loadReportData}
                className="px-3 py-1 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* OFFICIAL AUDIT PRINT HEADER (VISIBLE ONLY IN PRINT)          */}
      {/* ============================================================ */}
      <div className="hidden print:block border-b-2 border-black pb-3 text-black font-sans">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo className="w-14 h-14" />
            <div>
              <h1 className="text-xl font-black tracking-tight text-black uppercase font-serif">
                JIVAN CHIT FUNDS (INDIA) PVT. LTD.
              </h1>
              <p className="text-[10px] text-slate-700 font-sans tracking-wide">
                Regd. Non-Banking Financial Chit Fund Institution • Central Chit Funds Act, 1982
              </p>
              <p className="text-[9.5px] text-slate-600 font-sans">
                Corporate Office: No. 42, Gandhi Road, Chennai - 600001 • Phone: +91 44 2841 0099
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-0.5 bg-black text-white text-[10px] font-bold tracking-wider uppercase rounded">
              OFFICIAL AUDIT REPORT
            </span>
            <p className="text-[10px] text-slate-700 mt-1 font-mono">
              Date: <span className="font-bold text-black">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            </p>
            <p className="text-[9.5px] text-slate-600">
              Authority: <span className="font-bold text-black">{userRole === 'admin' ? 'Administrator / MD' : 'Audit Dept'}</span>
            </p>
          </div>
        </div>

        {/* Dynamic Statement Title & Parameters Strip */}
        <div className="mt-2.5 pt-2 border-t border-slate-300 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 text-[9px] uppercase font-bold tracking-wider block">Statement Ledger</span>
            <span className="text-sm font-black text-black uppercase tracking-wide">
              {getReportTitle()}
            </span>
          </div>
          <div className="text-right text-[10.5px] text-slate-800">
            <div>
              <span className="text-slate-500 font-medium">Scheme / Group:</span>{' '}
              <span className="font-bold text-black">{selectedGroupName}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Period / Range:</span>{' '}
              <span className="font-bold text-black">{periodText}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: COLLECTIONS REPORT                                    */}
      {/* ============================================================ */}
      {activeTab === 'collections' && (
        <div className="space-y-4 print:space-y-2">
          {/* Web Summary Cards (Hidden in Print) */}
          {collectionReport && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 print:hidden">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">Total Amount Collected</span>
                <span className="text-xl font-bold font-mono text-emerald-800 mt-1 block">
                  ₹{collectionReport.totalCollected.toLocaleString()}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">{collectionReport.paymentCount} receipts issued</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">Cash Receipts</span>
                <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                  ₹{(collectionReport.byPaymentMode?.Cash || 0).toLocaleString()}
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">UPI Transfers</span>
                <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                  ₹{(collectionReport.byPaymentMode?.UPI || 0).toLocaleString()}
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">Bank Transfers</span>
                <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                  ₹{(collectionReport.byPaymentMode?.['Bank Transfer'] || 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Clean Print Summary Strip (Visible Only in Print) */}
          {collectionReport && (
            <div className="hidden print:grid grid-cols-4 gap-2 border border-black p-2 text-xs bg-slate-50">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-600 block">Total Collections</span>
                <span className="text-sm font-bold text-black font-mono">₹{collectionReport.totalCollected.toLocaleString()}</span>
                <span className="text-[9px] text-slate-500 block">({collectionReport.paymentCount} Receipts)</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-600 block">Cash Mode</span>
                <span className="text-sm font-bold text-black font-mono">₹{(collectionReport.byPaymentMode?.Cash || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-600 block">UPI Transfers</span>
                <span className="text-sm font-bold text-black font-mono">₹{(collectionReport.byPaymentMode?.UPI || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-600 block">Bank Accounts</span>
                <span className="text-sm font-bold text-black font-mono">₹{(collectionReport.byPaymentMode?.['Bank Transfer'] || 0).toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden print:border-none print:shadow-none print:rounded-none">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm">Detailed Collection Transactions</h3>
              <button
                onClick={() =>
                  exportToCSV(
                    `chitfund_collections_${new Date().toISOString().split('T')[0]}`,
                    collectionReport?.payments || []
                  )
                }
                className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-800 font-semibold text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-left text-xs report-table-print">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-300">
                  <tr>
                    <th className="py-2.5 px-3">Receipt #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Subscriber</th>
                    <th className="py-2.5 px-3">Scheme & Ticket</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-3 text-center">Mode</th>
                    <th className="py-2.5 px-3">Cashier</th>
                    <th className="py-2.5 px-3 text-center print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400 font-sans">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
                        Loading collection transactions...
                      </td>
                    </tr>
                  ) : !collectionReport?.payments || collectionReport.payments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400 font-sans">
                        No collection transactions match the date and scheme filters.
                      </td>
                    </tr>
                  ) : (
                    collectionReport.payments.map((p: any, idx: number) => (
                      <tr key={p.receiptNumber || p.id || idx} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 font-bold text-slate-900">{p.receiptNumber}</td>
                        <td className="py-2 px-3 text-slate-700">{formatDate(p.paymentDate)}</td>
                        <td className="py-2 px-3 font-sans font-medium text-slate-900">{p.customerName}</td>
                        <td className="py-2 px-3 font-sans text-slate-700">{p.groupName} (T#{p.ticketNumber})</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-800 print:text-black">₹{p.amountPaid.toLocaleString()}</td>
                        <td className="py-2 px-3 font-sans text-center">{p.paymentMode}</td>
                        <td className="py-2 px-3 font-sans text-slate-600">{p.collectedByName}</td>
                        <td className="py-2 px-3 text-center font-sans print:hidden">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={async () => {
                                const newAmt = prompt('Edit payment amount (₹):', String(p.amountPaid));
                                if (newAmt && !isNaN(Number(newAmt))) {
                                  try {
                                    await api.updatePayment(p.id || p.receiptNumber, { amountPaid: Number(newAmt) });
                                    loadReportData();
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
                                    setCollectionReport((prev: any) => prev ? { ...prev, payments: prev.payments.filter((x: any) => (x.receiptNumber || x.id) !== (p.receiptNumber || p.id)) } : null);
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
                    ))
                  )}
                </tbody>
                {collectionReport?.payments && collectionReport.payments.length > 0 && (
                  <tfoot className="border-t-2 border-black font-bold bg-slate-50">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 text-right font-sans uppercase text-xs">
                        Total Collections Reconciled:
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-900 print:text-black font-mono font-bold">
                        ₹{(collectionReport.totalCollected || 0).toLocaleString()}
                      </td>
                      <td colSpan={2} className="py-2.5 px-3 text-slate-600 text-[11px] font-sans">
                        {collectionReport.payments.length} Transactions
                      </td>
                      <td className="print:hidden"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: JOINING DATE & GROUPING DATE WISE REPORTS             */}
      {/* ============================================================ */}
      {activeTab === 'joining_grouping' && (
        <div className="space-y-4 print:space-y-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden print:border-none print:shadow-none print:rounded-none">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
              <div>
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm">Subscriber Joining & Grouping Date Ledger</h3>
                <p className="text-[11px] text-slate-500 font-sans">Track subscriber enrollment dates, chit scheme group dates & installment schedules</p>
              </div>
              <button
                onClick={() =>
                  exportToCSV(
                    `joining_grouping_dates_${new Date().toISOString().split('T')[0]}`,
                    filteredJoiningGrouping
                  )
                }
                className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-800 font-semibold text-xs font-sans"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-left text-xs report-table-print">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-300 font-sans">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12">S.No</th>
                    <th className="py-2.5 px-3">Subscriber Name</th>
                    <th className="py-2.5 px-3">Contact Mobile</th>
                    <th className="py-2.5 px-3">Scheme & Group Code</th>
                    <th className="py-2.5 px-3 text-center">Ticket #</th>
                    <th className="py-2.5 px-3 text-center">Joining Date</th>
                    <th className="py-2.5 px-3 text-center">Grouping Date</th>
                    <th className="py-2.5 px-3 text-right">Chit Value (₹)</th>
                    <th className="py-2.5 px-3 text-right">Paid (₹)</th>
                    <th className="py-2.5 px-3 text-right">Pending (₹)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="text-center py-8 text-slate-400 font-sans">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
                        Loading joining and grouping date records...
                      </td>
                    </tr>
                  ) : filteredJoiningGrouping.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-8 text-slate-400 font-sans">
                        No joining date or grouping date records match the selected group and date filters.
                      </td>
                    </tr>
                  ) : (
                    filteredJoiningGrouping.map((item: any, idx: number) => {
                      const custName = item.name || item.customerName || 'Subscriber';
                      const phone = item.phoneNumber || item.phone || '-';
                      const grpCode = item.groupName ? `${item.groupName} (${item.newGroupNo || item.groupId})` : (item.newGroupNo || item.groupId || item.chitGroupCode || '-');
                      const ticketNum = item.ticketNumber ?? (item.newGroupNo ? item.newGroupNo.split('/').pop() : idx + 1);
                      const jDate = formatDate(item.joiningDate || item.dueDate);
                      const gDate = formatDate(item.groupingDate || item.startDate);
                      const chitVal = item.fullChitValue ? item.fullChitValue : (item.chitValue >= 1000 ? item.chitValue : item.chitValue * 100000);
                      const paidAmt = item.totalPaid ?? item.paidAmount ?? 0;
                      const pendAmt = item.totalPending ?? item.pendingBalance ?? (chitVal > paidAmt ? chitVal - paidAmt : 0);
                      const statusVal = item.status || 'Active';

                      return (
                        <tr key={item.membershipId || item.id || idx} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 text-center text-slate-500 font-sans">{idx + 1}</td>
                          <td className="py-2 px-3 font-sans font-bold text-slate-900">{custName}</td>
                          <td className="py-2 px-3 text-slate-700">{phone}</td>
                          <td className="py-2 px-3 font-sans text-slate-800">{grpCode}</td>
                          <td className="py-2 px-3 text-center font-bold text-amber-900 print:text-black">#{ticketNum}</td>
                          <td className="py-2 px-3 text-center text-slate-700 font-sans">{jDate}</td>
                          <td className="py-2 px-3 text-center text-slate-700 font-sans">{gDate}</td>
                          <td className="py-2 px-3 text-right text-slate-900 font-bold">{formatCurrency(chitVal)}</td>
                          <td className="py-2 px-3 text-right text-emerald-800 print:text-black font-bold">{formatCurrency(paidAmt)}</td>
                          <td className="py-2 px-3 text-right text-rose-800 print:text-black font-bold">{formatCurrency(pendAmt)}</td>
                          <td className="py-2 px-3 text-center font-sans">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase print:border print:border-black ${
                                statusVal === 'paid' || statusVal === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : statusVal === 'overdue'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {statusVal}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredJoiningGrouping.length > 0 && (
                  <tfoot className="border-t-2 border-black font-bold bg-slate-50">
                    <tr>
                      <td colSpan={7} className="py-2.5 px-3 text-right font-sans uppercase text-xs">
                        Grand Totals ({filteredJoiningGrouping.length} Bookings):
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(
                          filteredJoiningGrouping.reduce((sum: number, it: any) => {
                            const val = it.fullChitValue || (it.chitValue >= 1000 ? it.chitValue : it.chitValue * 100000);
                            return sum + (Number(val) || 0);
                          }, 0)
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-900 print:text-black">
                        {formatCurrency(
                          filteredJoiningGrouping.reduce((sum: number, it: any) => sum + (Number(it.totalPaid || it.paidAmount) || 0), 0)
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-900 print:text-black">
                        {formatCurrency(
                          filteredJoiningGrouping.reduce((sum: number, it: any) => sum + (Number(it.totalPending || it.pendingBalance) || 0), 0)
                        )}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: OUTSTANDING DUES & DEFAULTERS                         */}
      {/* ============================================================ */}
      {activeTab === 'outstanding' && (
        <div className="space-y-4 print:space-y-2">
          {/* Web Summary Cards (Hidden in Print) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-400 text-[10px] uppercase font-semibold block">Total Outstanding Dues</span>
              <span className="text-xl font-bold font-mono text-amber-900 mt-1 block">
                ₹{(outstandingReport?.totalOutstanding || 0).toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">{outstandingReport?.installmentsCount || 0} unpaid installments</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs">
              <span className="text-rose-700 text-[10px] uppercase font-semibold block">Critical Overdue Dues</span>
              <span className="text-xl font-bold font-mono text-rose-800 mt-1 block">
                ₹{(outstandingReport?.overdueAmount || 0).toLocaleString()}
              </span>
              <span className="text-[11px] text-rose-600 font-mono">{outstandingReport?.overdueCount || 0} installments past due date</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-400 text-[10px] uppercase font-semibold block">Defaulter Subscribers</span>
              <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                {outstandingReport?.defaulters?.length || 0} Members
              </span>
              <span className="text-[11px] text-slate-500">Requires follow-up calls</span>
            </div>
          </div>

          {/* Clean Print Summary Strip (Visible Only in Print) */}
          {outstandingReport && (
            <div className="hidden print:grid grid-cols-3 gap-2 border border-black p-2 text-xs bg-slate-50">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-600 block">Total Outstanding Dues</span>
                <span className="text-sm font-bold text-black font-mono">₹{(outstandingReport.totalOutstanding || 0).toLocaleString()}</span>
                <span className="text-[9px] text-slate-500 block">({outstandingReport.installmentsCount || 0} Unpaid Installments)</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-rose-700 block">Overdue Critical Dues</span>
                <span className="text-sm font-bold text-rose-900 font-mono">₹{(outstandingReport.overdueAmount || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-600 block">Total Defaulter Accounts</span>
                <span className="text-sm font-bold text-black font-mono">{outstandingReport.defaulters?.length || 0} Members</span>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden print:border-none print:shadow-none print:rounded-none">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm">Subscribers Outstanding Ledger</h3>
              <button
                onClick={() =>
                  exportToCSV(
                    `chitfund_outstanding_${new Date().toISOString().split('T')[0]}`,
                    outstandingReport?.defaulters || []
                  )
                }
                className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-800 font-semibold text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-left text-xs report-table-print">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-300">
                  <tr>
                    <th className="py-2.5 px-3">Subscriber</th>
                    <th className="py-2.5 px-3">Mobile</th>
                    <th className="py-2.5 px-3">Chit Scheme</th>
                    <th className="py-2.5 px-3 text-center">Ticket #</th>
                    <th className="py-2.5 px-3 text-center">Month #</th>
                    <th className="py-2.5 px-3 text-center">Due Date</th>
                    <th className="py-2.5 px-3 text-right">Net Due (₹)</th>
                    <th className="py-2.5 px-3 text-right">Remaining Balance (₹)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-slate-400 font-sans">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
                        Loading outstanding ledger...
                      </td>
                    </tr>
                  ) : !outstandingReport?.defaulters || outstandingReport.defaulters.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-slate-400 font-sans">
                        All members are up to date! No pending dues.
                      </td>
                    </tr>
                  ) : (
                    outstandingReport.defaulters.map((d: any) => (
                      <tr key={d.installmentId || d.id} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 font-sans">
                          <button
                            onClick={() => onNavigateToCustomer(d.customerId)}
                            className="font-bold text-slate-900 hover:text-amber-700 hover:underline block text-left print:pointer-events-none"
                          >
                            {d.customerName}
                          </button>
                        </td>
                        <td className="py-2 px-3 text-slate-700">{d.mobileNumber}</td>
                        <td className="py-2 px-3 font-sans">{d.groupName}</td>
                        <td className="py-2 px-3 text-center font-bold text-amber-900 print:text-black">#{d.ticketNumber}</td>
                        <td className="py-2 px-3 text-center">M#{d.monthNumber}</td>
                        <td className="py-2 px-3 text-center text-slate-700 font-sans">{formatDate(d.dueDate)}</td>
                        <td className="py-2 px-3 text-right font-mono">₹{d.netDueAmount.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-bold text-amber-900 print:text-black font-mono">₹{d.balanceAmount.toLocaleString()}</td>
                        <td className="py-2 px-3 text-center font-sans">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold print:border print:border-black ${
                              d.status === 'Overdue'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-sans print:hidden">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={async () => {
                                const newBal = prompt('Edit remaining balance (₹):', String(d.balanceAmount));
                                if (newBal && !isNaN(Number(newBal))) {
                                  try {
                                    await api.updateInstallment(d.installmentId || d.id, { balanceAmount: Number(newBal) });
                                    loadReportData();
                                  } catch (err: any) {
                                    alert(err.message || 'Failed to update installment');
                                  }
                                }
                              }}
                              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                              title="Edit Installment"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`Are you sure you want to delete installment record M#${d.monthNumber} for ${d.customerName}?`)) {
                                  try {
                                    await api.deleteInstallment(d.installmentId || d.id);
                                    setOutstandingReport((prev: any) => prev ? { ...prev, defaulters: prev.defaulters.filter((x: any) => (x.installmentId || x.id) !== (d.installmentId || d.id)) } : null);
                                  } catch (err: any) {
                                    alert(err.message || 'Failed to delete installment');
                                  }
                                }
                              }}
                              className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition"
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
                {outstandingReport?.defaulters && outstandingReport.defaulters.length > 0 && (
                  <tfoot className="border-t-2 border-black font-bold bg-slate-50">
                    <tr>
                      <td colSpan={6} className="py-2.5 px-3 text-right font-sans uppercase text-xs">
                        Total Outstanding Ledger Dues:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{outstandingReport.defaulters.reduce((s: number, d: any) => s + (d.netDueAmount || 0), 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-900 print:text-black">
                        ₹{outstandingReport.defaulters.reduce((s: number, d: any) => s + (d.balanceAmount || 0), 0).toLocaleString()}
                      </td>
                      <td colSpan={2} className="print:hidden"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: CHIT SCHEMES EFFICIENCY                               */}
      {/* ============================================================ */}
      {activeTab === 'groups' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden print:border-none print:shadow-none print:rounded-none">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
            <div>
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm">Chit Group Collection & Recovery Matrix</h3>
              <p className="text-[11px] text-slate-500">Expected vs Actual Collections across all running schemes</p>
            </div>
            <button
              onClick={() =>
                exportToCSV(
                  `chitfund_groups_matrix_${new Date().toISOString().split('T')[0]}`,
                  groupReport?.groups || []
                )
              }
              className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-800 font-semibold text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left text-xs report-table-print">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-300">
                <tr>
                  <th className="py-2.5 px-3">Scheme Code & Name</th>
                  <th className="py-2.5 px-3 text-right">Chit Value (₹)</th>
                  <th className="py-2.5 px-3 text-center">Enrollment</th>
                  <th className="py-2.5 px-3 text-right">Expected Dues (₹)</th>
                  <th className="py-2.5 px-3 text-right">Actual Collected (₹)</th>
                  <th className="py-2.5 px-3 text-right">Outstanding (₹)</th>
                  <th className="py-2.5 px-3 text-center">Recovery %</th>
                  <th className="py-2.5 px-3 text-center print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400 font-sans">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
                      Loading scheme matrix...
                    </td>
                  </tr>
                ) : !groupReport?.groups || groupReport.groups.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400 font-sans">
                      No chit schemes found.
                    </td>
                  </tr>
                ) : (
                  groupReport.groups.map((g: any) => (
                    <tr key={g.groupId || String(g.id)} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-sans">
                        <span className="font-bold text-slate-900 block">{g.groupName}</span>
                        <span className="text-slate-500 text-[10px] font-mono">{g.groupId}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium">₹{g.chitValue.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        {g.currentMembersCount} / {g.numMembers} Seats
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">₹{g.expectedCollection.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-800 print:text-black font-mono">
                        ₹{g.actualCollection.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-amber-900 print:text-black font-mono">
                        ₹{g.outstandingBalance.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-14 bg-slate-100 rounded-full h-2 overflow-hidden print:hidden">
                            <div
                              className="bg-emerald-600 h-2 rounded-full"
                              style={{ width: `${Math.min(100, g.collectionEfficiency)}%` }}
                            />
                          </div>
                          <span className="font-bold font-mono text-[11px] text-slate-800 print:text-black">
                            {g.collectionEfficiency}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans print:hidden">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={async () => {
                              const newName = prompt('Edit scheme name:', g.groupName);
                              if (newName) {
                                try {
                                  await api.updateChitGroup(g.groupId || g.id, { groupName: newName });
                                  loadReportData();
                                } catch (err: any) {
                                  alert(err.message || 'Failed to update group');
                                }
                              }
                            }}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Edit Scheme"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setDeletingScheme(g);
                              setDeleteSchemeError(null);
                            }}
                            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            title="Delete Scheme"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {groupReport?.groups && groupReport.groups.length > 0 && (
                <tfoot className="border-t-2 border-black font-bold bg-slate-50">
                  <tr>
                    <td className="py-2.5 px-3 font-sans uppercase text-xs">Total Across Schemes:</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      ₹{groupReport.groups.reduce((s: number, g: any) => s + (g.chitValue || 0), 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      {groupReport.groups.reduce((s: number, g: any) => s + (g.currentMembersCount || 0), 0)} Seats
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      ₹{groupReport.groups.reduce((s: number, g: any) => s + (g.expectedCollection || 0), 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-900 print:text-black">
                      ₹{groupReport.groups.reduce((s: number, g: any) => s + (g.actualCollection || 0), 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-900 print:text-black">
                      ₹{groupReport.groups.reduce((s: number, g: any) => s + (g.outstandingBalance || 0), 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                      {Math.round(
                        (groupReport.groups.reduce((s: number, g: any) => s + (g.actualCollection || 0), 0) /
                          Math.max(1, groupReport.groups.reduce((s: number, g: any) => s + (g.expectedCollection || 0), 0))) *
                          100
                      )}%
                    </td>
                    <td className="print:hidden"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 5: COMPANY PROFIT & LOSS                                 */}
      {/* ============================================================ */}
      {activeTab === 'pnl' && pnlReport && (
        <div className="space-y-4 print:space-y-3">
          {/* Web KPI Cards (Hidden in Print) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
            <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs">
              <span className="text-emerald-700 text-[10px] uppercase font-semibold block">Total Foreman Commission</span>
              <span className="text-2xl font-bold font-mono text-emerald-900 mt-1 block">
                ₹{pnlReport.totalCommission.toLocaleString()}
              </span>
              <p className="text-[11px] text-slate-500 mt-1">Company revenue earned from auctions</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs">
              <span className="text-rose-700 text-[10px] uppercase font-semibold block">Operational Expenses</span>
              <span className="text-2xl font-bold font-mono text-rose-900 mt-1 block">
                ₹{pnlReport.totalExpenses.toLocaleString()}
              </span>
              <p className="text-[11px] text-slate-500 mt-1">Rent, salaries, stationery, utilities</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-500 text-[10px] uppercase font-semibold block">Net Operating Profit</span>
              <span
                className={`text-2xl font-bold font-mono mt-1 block ${
                  pnlReport.netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'
                }`}
              >
                ₹{pnlReport.netProfit.toLocaleString()}
              </span>
              <p className="text-[11px] text-slate-500 mt-1">Foreman Commission minus Office Expenses</p>
            </div>
          </div>

          {/* Clean Official Profit & Loss Statement (Visible in Screen & Print) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs print:border-none print:shadow-none print:p-0">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-200 pb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 print:hidden" />
              <span>Chit Fund Company Operating Statement of Profit & Loss</span>
            </h3>

            <table className="w-full text-xs report-table-print">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-300">
                <tr>
                  <th className="py-2.5 px-3">Financial Line Item</th>
                  <th className="py-2.5 px-3 text-center">Accounting Code</th>
                  <th className="py-2.5 px-3 text-right">Debit (₹)</th>
                  <th className="py-2.5 px-3 text-right">Credit (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                <tr>
                  <td className="py-2 px-3 font-sans font-medium text-slate-900">
                    Gross Foreman Commission Earned (Chit Auctions)
                  </td>
                  <td className="py-2 px-3 text-center font-mono text-slate-500">REV-FC-101</td>
                  <td className="py-2 px-3 text-right text-slate-400">-</td>
                  <td className="py-2 px-3 text-right font-bold text-emerald-800 print:text-black">
                    ₹{pnlReport.totalCommission.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-sans font-medium text-slate-900">
                    Administrative & Branch Operational Overheads
                  </td>
                  <td className="py-2 px-3 text-center font-mono text-slate-500">EXP-OPS-201</td>
                  <td className="py-2 px-3 text-right font-bold text-rose-800 print:text-black">
                    ₹{pnlReport.totalExpenses.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-400">-</td>
                </tr>
              </tbody>
              <tfoot className="border-t-2 border-black font-bold bg-slate-50">
                <tr>
                  <td colSpan={2} className="py-2.5 px-3 font-sans uppercase text-xs">
                    Net Operating Surplus / (Deficit):
                  </td>
                  <td colSpan={2} className={`py-2.5 px-3 text-right font-mono text-sm ${pnlReport.netProfit >= 0 ? 'text-emerald-900' : 'text-rose-900'} print:text-black font-bold`}>
                    ₹{pnlReport.netProfit.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>

            <p className="text-slate-600 text-[10.5px] leading-relaxed pt-2">
              Note: This financial audit ledger reconciles all subscriber installment inflows, auction commission gains, and branch overheads. Governed under Section 21 of the Central Chit Funds Act, 1982, ensuring foreman commission adheres strictly to statutory ceilings.
            </p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* PRINT-ONLY OFFICIAL AUDIT SIGNATURES (VISIBLE ONLY IN PRINT)  */}
      {/* ============================================================ */}
      <div className="hidden print:flex justify-between items-end mt-12 pt-8 text-xs font-sans border-t border-slate-400">
        <div className="text-center w-48">
          <div className="h-10 border-b border-dashed border-slate-400 mb-1"></div>
          <span className="font-bold text-slate-900 block">Prepared By</span>
          <span className="text-[10px] text-slate-500">Accounts Assistant / Cashier</span>
        </div>
        <div className="text-center w-48">
          <div className="h-10 border-b border-dashed border-slate-400 mb-1"></div>
          <span className="font-bold text-slate-900 block">Audited By</span>
          <span className="text-[10px] text-slate-500">Internal Audit Officer</span>
        </div>
        <div className="text-center w-48">
          <div className="h-10 border-b border-dashed border-slate-400 mb-1"></div>
          <span className="font-bold text-slate-900 block">Authorized Signatory</span>
          <span className="text-[10px] text-slate-500">Managing Director / Foreman</span>
        </div>
      </div>
      <div className="hidden print:block text-center mt-5 text-[9px] text-slate-400 font-sans">
        This is a system-generated official audit document produced by Jivan Chit Funds Management System. Electronically authenticated record.
      </div>

      {/* IN-UI DELETE SCHEME CONFIRMATION MODAL */}
      {deletingScheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Delete Chit Scheme?
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Are you sure you want to permanently delete scheme <strong className="text-slate-900 font-semibold">{deletingScheme.groupName}</strong> (<span className="font-mono text-amber-800 font-bold">{deletingScheme.groupId || deletingScheme.id}</span>)?
              </p>
              <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3 mt-3.5 text-left leading-relaxed">
                ⚠️ <strong>Notice:</strong> This will permanently delete this scheme along with all associated enrollments, installments, and auction ledgers.
              </div>

              {deleteSchemeError && (
                <div className="mt-3 p-3 bg-rose-100 border border-rose-300 text-rose-800 text-xs rounded-lg text-left font-medium">
                  {deleteSchemeError}
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={deleteSchemeLoading}
                  onClick={() => {
                    setDeletingScheme(null);
                    setDeleteSchemeError(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteSchemeLoading}
                  onClick={confirmDeleteScheme}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  {deleteSchemeLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Yes, Delete Scheme</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
