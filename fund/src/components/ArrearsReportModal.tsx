import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download, FileSpreadsheet, RefreshCw, AlertCircle, Calendar, User, Layers, Search, ArrowLeft } from 'lucide-react';
import { api } from '../api/client';
import { Logo } from './Logo';
import { generateArrearsReportPDF } from '../utils/pdfGenerator';

interface ArrearsReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
}

export const ArrearsReportModal: React.FC<ArrearsReportModalProps> = ({
  isOpen,
  onClose,
  userRole
}) => {
  const isAgent = userRole === 'agent';

  // Filters state
  const todayStr = new Date().toISOString().slice(0, 10);
  const [asOnDate, setAsOnDate] = useState<string>(todayStr);
  const [selectedAgent, setSelectedAgent] = useState<string>('ALL');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dropdown options
  const [agentsList, setAgentsList] = useState<Array<{ id: number; fullName: string; agentId?: string }>>([]);
  const [groupsList, setGroupsList] = useState<Array<{ groupId: string; groupName: string }>>([]);

  // Report Data
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<{
    asOnDate: string;
    summary: {
      totalSubscribers: number;
      totalPayableAmount: number;
      totalCollectionAmount: number;
      totalBalanceAmount: number;
      totalLastCollectionAmount: number;
    };
    records: Array<{
      sNo: number;
      membershipId: string;
      customerId: string;
      groupId: string;
      groupNo: string;
      groupName: string;
      ticketNumber: number;
      name: string;
      cd: string;
      td: string;
      totalPayableAmount: number;
      totalCollectionAmount: number;
      balanceAmount: number;
      lastCollectionDate: string;
      lastCollectionAmount: number;
      phone: string;
      agentId?: number;
      agentName: string;
    }>;
  } | null>(null);

  // Load dropdown lists on mount
  useEffect(() => {
    if (!isOpen) return;

    // Fetch agents
    api.getAgents()
      .then((agents: any[]) => {
        setAgentsList(agents || []);
      })
      .catch((e) => console.error('Failed to load agents list:', e));

    // Fetch groups
    api.getChitGroups()
      .then((groups: any[]) => {
        setGroupsList(groups || []);
      })
      .catch((e) => console.error('Failed to load groups list:', e));
  }, [isOpen]);

  // Fetch report data whenever filters change
  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getArrearsReport({
        asOnDate,
        agentId: selectedAgent,
        groupId: selectedGroup,
        search: searchQuery.trim() || undefined
      });
      if (!res || !res.summary || !Array.isArray(res.records)) {
        throw new Error((res as any)?.error || 'Invalid report response received from server. Please refresh.');
      }
      setReportData(res);
    } catch (err: any) {
      console.error('Failed to load arrears report:', err);
      setError(err.message || 'Failed to generate arrears report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReport();
    }
  }, [isOpen, asOnDate, selectedAgent, selectedGroup]);

  // Clean print handler
  const handlePrint = () => {
    document.body.classList.add('printing-modal', 'printing-landscape');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-modal', 'printing-landscape');
    }, 1000);
  };

  // PDF Download handler
  const handleDownloadPDF = () => {
    if (!reportData) return;

    // Format display date to DD-MM-YYYY
    let displayDate = asOnDate;
    if (asOnDate && asOnDate.includes('-')) {
      const parts = asOnDate.split('-');
      if (parts.length === 3) {
        displayDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    const agentObj = agentsList.find(a => String(a.id) === selectedAgent);
    const groupObj = groupsList.find(g => g.groupId === selectedGroup);

    generateArrearsReportPDF({
      companyName: 'JIVAN CHIT FUNDS (INDIA) PVT LTD',
      asOnDate: displayDate,
      agentFilterName: selectedAgent !== 'ALL' ? (agentObj?.fullName || selectedAgent) : 'All Agents',
      groupFilterName: selectedGroup !== 'ALL' ? (groupObj?.groupName || selectedGroup) : 'All Groups',
      records: reportData.records,
      summary: reportData.summary
    });
  };

  // CSV Export handler
  const handleExportCSV = () => {
    if (!reportData || !reportData.records.length) return;

    let displayDate = asOnDate;
    if (asOnDate && asOnDate.includes('-')) {
      const parts = asOnDate.split('-');
      if (parts.length === 3) {
        displayDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    const headers = [
      'S.No',
      'Group No',
      'Name',
      'CD',
      'TD',
      'Total Payable Amount',
      'Total Collection Amount',
      'Balance Amount',
      'Last Collection Date',
      'Last Collection Amount',
      'PH No',
      'Agent Name'
    ];

    const rows = reportData.records.map(r => [
      r.sNo,
      `"${r.groupNo}"`,
      `"${r.name.replace(/"/g, '""')}"`,
      r.cd,
      r.td,
      r.totalPayableAmount.toFixed(2),
      r.totalCollectionAmount.toFixed(2),
      r.balanceAmount.toFixed(2),
      r.lastCollectionDate,
      r.lastCollectionAmount.toFixed(2),
      `"${r.phone}"`,
      `"${r.agentName.replace(/"/g, '""')}"`
    ]);

    // Total summary row
    rows.push([
      '',
      '',
      '',
      '',
      'Total',
      reportData.summary.totalPayableAmount.toFixed(2),
      reportData.summary.totalCollectionAmount.toFixed(2),
      reportData.summary.totalBalanceAmount.toFixed(2),
      '',
      reportData.summary.totalLastCollectionAmount.toFixed(2),
      '',
      ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Arrears_Report_As_On_${displayDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  // Format date helper for Title: "ARREARS REPORT AS ON DD-MM-YYYY"
  const formattedTitleDate = (() => {
    if (!asOnDate) return '';
    const parts = asOnDate.split('-');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return asOnDate;
  })();

  const modalContent = (
    <div
      id="arrears-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4 md:p-6 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[98vw] 2xl:max-w-7xl max-h-[96vh] flex flex-col border border-slate-200 overflow-hidden">
        
        {/* Top Operational Bar (Hidden during Print) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-medium"
              title="Return to Balance Sheet"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Balance Sheet</span>
            </button>
            <div className="h-5 w-px bg-slate-700" />
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Arrears Report</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  As On Register
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Official physical register format • Subscriber & Chit Membership Level
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handlePrint}
              disabled={loading || !reportData}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition border border-slate-700 shadow-sm disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Print (A4 Landscape)</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={loading || !reportData}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition shadow-sm disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={handleExportCSV}
              disabled={loading || !reportData}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition shadow-sm disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar (Hidden during Print) */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 shrink-0 print:hidden">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchReport();
            }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
          >
            {/* 1. As On Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>As On Date</span>
              </label>
              <input
                type="date"
                value={asOnDate}
                onChange={(e) => setAsOnDate(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition"
              />
            </div>

            {/* 2. Agent Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span>Collection Agent</span>
              </label>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                disabled={isAgent}
                className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition disabled:bg-slate-100 disabled:text-slate-500"
              >
                {!isAgent && <option value="ALL">All Agents (Company-Wide)</option>}
                {agentsList.map((a) => (
                  <option key={a.id} value={String(a.id)}>
                    {a.fullName} {a.agentId ? `(${a.agentId})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Chit Group / Scheme Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                <span>Chit Group / Scheme</span>
              </label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition"
              >
                <option value="ALL">All Chit Groups</option>
                {groupsList.map((g) => (
                  <option key={g.groupId} value={g.groupId}>
                    {g.groupName} ({g.groupId})
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Search Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <span>Search Subscriber / Group / Phone</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Sundar Raj, 99403, J2E"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition text-xs font-medium shrink-0 flex items-center gap-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Apply</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Scrollable Report Canvas (Printable Area) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100">
          
          {loading && !reportData ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
              <p className="text-sm font-medium">Generating official arrears register as on {formattedTitleDate}...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-semibold text-sm">Failed to generate arrears report</p>
                <p className="text-xs">{error}</p>
              </div>
            </div>
          ) : reportData && reportData.summary ? (
            <div
              id="printable-arrears-report"
              className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-slate-200 mx-auto max-w-[1200px]"
            >
              
              {/* Official Report Header */}
              <div className="flex items-start justify-between pb-4 border-b-2 border-slate-900 mb-6">
                <div className="flex items-center gap-4">
                  <Logo size={52} className="shrink-0" />
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-wide uppercase">
                      JIVAN CHIT FUNDS (INDIA) PVT LTD
                    </h1>
                    <p className="text-sm sm:text-base font-extrabold text-amber-800 tracking-wider uppercase mt-0.5">
                      ARREARS REPORT AS ON {formattedTitleDate}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Scope: {selectedAgent !== 'ALL' ? (agentsList.find(a => String(a.id) === selectedAgent)?.fullName || 'Selected Agent') : 'Company Wide'} • 
                      Scheme: {selectedGroup !== 'ALL' ? (groupsList.find(g => g.groupId === selectedGroup)?.groupName || selectedGroup) : 'All Chit Groups'}
                    </p>
                  </div>
                </div>

                <div className="text-right text-xs text-slate-500 font-mono hidden sm:block">
                  <p className="font-semibold text-slate-800">OFFICIAL REGISTER</p>
                  <p>Generated: {new Date().toLocaleDateString('en-IN')}</p>
                  <p>Subscribers: {reportData.summary?.totalSubscribers ?? 0}</p>
                </div>
              </div>

              {/* Summary Stats Cards (Screen Only) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 print:hidden">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Payable</span>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">
                    ₹{(reportData.summary?.totalPayableAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <span className="text-[10px] text-slate-400 font-medium">{reportData.summary?.totalSubscribers ?? 0} active accounts</span>
                </div>

                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Total Collection</span>
                  <p className="text-lg font-bold text-emerald-800 mt-0.5">
                    ₹{(reportData.summary?.totalCollectionAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <span className="text-[10px] text-emerald-600 font-medium">As on {formattedTitleDate}</span>
                </div>

                <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-700">Balance Amount</span>
                  <p className="text-lg font-bold text-rose-800 mt-0.5">
                    ₹{(reportData.summary?.totalBalanceAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <span className="text-[10px] text-rose-600 font-medium">Net remaining receivables</span>
                </div>

                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">Last Coll. Amount Sum</span>
                  <p className="text-lg font-bold text-amber-800 mt-0.5">
                    ₹{(reportData.summary?.totalLastCollectionAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <span className="text-[10px] text-amber-600 font-medium">Sum of latest receipt amounts</span>
                </div>
              </div>

              {/* 12-Column Table Matching Physical Jivan Chit Funds Report */}
              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold tracking-tight text-[11px]">
                      <th className="py-2.5 px-2 border border-slate-700 text-center w-10">S.NO</th>
                      <th className="py-2.5 px-2 border border-slate-700 text-center">GROUP NO</th>
                      <th className="py-2.5 px-3 border border-slate-700">NAME</th>
                      <th className="py-2.5 px-2 border border-slate-700 text-center">CD</th>
                      <th className="py-2.5 px-2 border border-slate-700 text-center">TD</th>
                      <th className="py-2.5 px-2.5 border border-slate-700 text-right">TOTAL PAYABLE<br />AMOUNT</th>
                      <th className="py-2.5 px-2.5 border border-slate-700 text-right">TOTAL COLLECTION<br />AMOUNT</th>
                      <th className="py-2.5 px-2.5 border border-slate-700 text-right">BALANCE<br />AMOUNT</th>
                      <th className="py-2.5 px-2 border border-slate-700 text-center">LAST COLLECTION<br />DATE</th>
                      <th className="py-2.5 px-2.5 border border-slate-700 text-right">LASTE COLLECTION<br />AMOUNT</th>
                      <th className="py-2.5 px-2 border border-slate-700 text-center">PH NO</th>
                      <th className="py-2.5 px-3 border border-slate-700">AGENT NAME</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                    {reportData.records.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-8 text-center text-slate-400 font-normal">
                          No subscriber arrears records found for the selected criteria as on {formattedTitleDate}.
                        </td>
                      </tr>
                    ) : (
                      reportData.records.map((r, idx) => (
                        <tr
                          key={`${r.membershipId}-${idx}`}
                          className={`hover:bg-amber-50/40 transition ${
                            idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'
                          }`}
                        >
                          <td className="py-2 px-2 border border-slate-200 text-center font-mono text-[11px]">
                            {r.sNo}
                          </td>
                          <td className="py-2 px-2 border border-slate-200 text-center font-semibold text-slate-900 font-mono text-[11px]">
                            {r.groupNo}
                          </td>
                          <td className="py-2 px-3 border border-slate-200 font-bold text-slate-900">
                            {r.name}
                          </td>
                          <td className="py-2 px-2 border border-slate-200 text-center font-mono text-[11px] text-slate-600">
                            {r.cd}
                          </td>
                          <td className="py-2 px-2 border border-slate-200 text-center font-mono text-[11px] text-slate-600">
                            {r.td}
                          </td>
                          <td className="py-2 px-2.5 border border-slate-200 text-right font-bold text-slate-900 font-mono">
                            ₹{r.totalPayableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-2.5 border border-slate-200 text-right font-bold text-emerald-800 font-mono">
                            ₹{r.totalCollectionAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-2.5 border border-slate-200 text-right font-extrabold text-rose-800 font-mono">
                            ₹{r.balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-2 border border-slate-200 text-center font-mono text-[11px] text-slate-600">
                            {r.lastCollectionDate}
                          </td>
                          <td className="py-2 px-2.5 border border-slate-200 text-right font-semibold text-slate-900 font-mono">
                            ₹{r.lastCollectionAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-2 border border-slate-200 text-center font-mono text-[11px] text-slate-700">
                            {r.phone}
                          </td>
                          <td className="py-2 px-3 border border-slate-200 text-slate-800 font-medium">
                            {r.agentName}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  
                  {/* Bottom Grand Total Row */}
                  <tfoot>
                    <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-900">
                      <td colSpan={5} className="py-3 px-3 border border-slate-300 text-right text-xs uppercase tracking-wider">
                        Total
                      </td>
                      <td className="py-3 px-2.5 border border-slate-300 text-right font-mono text-xs">
                        ₹{(reportData.summary?.totalPayableAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-2.5 border border-slate-300 text-right font-mono text-xs text-emerald-800">
                        ₹{(reportData.summary?.totalCollectionAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-2.5 border border-slate-300 text-right font-mono text-xs text-rose-800">
                        ₹{(reportData.summary?.totalBalanceAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-2 border border-slate-300 text-center"></td>
                      <td className="py-3 px-2.5 border border-slate-300 text-right font-mono text-xs text-slate-900">
                        ₹{(reportData.summary?.totalLastCollectionAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td colSpan={2} className="py-3 px-3 border border-slate-300 text-center"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signatures & Verification Block (Printable on landscape) */}
              <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-end text-xs text-slate-600">
                <div className="text-center w-40">
                  <div className="h-10 border-b border-slate-400 mb-1" />
                  <p className="font-semibold text-slate-800">Prepared By</p>
                  <p className="text-[10px] text-slate-400">Accountant / Clerk</p>
                </div>
                <div className="text-center w-40">
                  <div className="h-10 border-b border-slate-400 mb-1" />
                  <p className="font-semibold text-slate-800">Collection Officer</p>
                  <p className="text-[10px] text-slate-400">Field Supervisor</p>
                </div>
                <div className="text-center w-44">
                  <div className="h-10 border-b border-slate-400 mb-1" />
                  <p className="font-semibold text-slate-800">Authorized Signatory</p>
                  <p className="text-[10px] text-slate-400">Jivan Chit Funds</p>
                </div>
              </div>

            </div>
          ) : null}

        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
