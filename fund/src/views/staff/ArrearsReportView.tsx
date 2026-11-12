import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Printer,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Calendar,
  User,
  Layers,
  Search,
  AlertCircle
} from 'lucide-react';
import { api } from '../../api/client';
import { generateArrearsReportPDF } from '../../utils/pdfGenerator';

interface ArrearsReportViewProps {
  onBack: () => void;
  userRole?: string;
}

export const ArrearsReportView: React.FC<ArrearsReportViewProps> = ({
  onBack,
  userRole
}) => {
  const isAgent = userRole === 'agent';

  // Filters State
  const todayStr = new Date().toISOString().slice(0, 10);
  const [asOnDate, setAsOnDate] = useState<string>(todayStr);
  const [selectedAgent, setSelectedAgent] = useState<string>('ALL');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dropdown Lists
  const [agentsList, setAgentsList] = useState<Array<{ id: number; fullName: string; agentId?: string }>>([]);
  const [groupsList, setGroupsList] = useState<Array<{ groupId: string; groupName: string }>>([]);

  // Data State
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
    api.getAgents()
      .then((agents: any[]) => setAgentsList(agents || []))
      .catch((e) => console.error('Failed to load agents list:', e));

    api.getChitGroups()
      .then((groups: any[]) => setGroupsList(groups || []))
      .catch((e) => console.error('Failed to load groups list:', e));
  }, []);

  // Fetch report data
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
        throw new Error((res as any)?.error || 'Invalid report response received from server.');
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
    fetchReport();
  }, [asOnDate, selectedAgent, selectedGroup]);

  // Clean Landscape Print matching Physical Register
  const handlePrint = () => {
    let styleEl = document.getElementById('arrears-print-page-style') as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'arrears-print-page-style';
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `@page { size: landscape !important; margin: 6mm 4mm !important; }`;

    document.body.classList.add('printing-arrears-view');

    const cleanup = () => {
      document.body.classList.remove('printing-arrears-view');
      const el = document.getElementById('arrears-print-page-style');
      if (el) el.remove();
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);

    window.print();
    setTimeout(cleanup, 2000);
  };

  // PDF Download matching Physical Register
  const handleDownloadPDF = () => {
    if (!reportData) return;

    let displayDate = asOnDate;
    if (asOnDate && asOnDate.includes('-')) {
      const parts = asOnDate.split('-');
      if (parts.length === 3) displayDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    const agentObj = agentsList.find((a) => String(a.id) === selectedAgent);
    const groupObj = groupsList.find((g) => g.groupId === selectedGroup);

    generateArrearsReportPDF({
      companyName: 'JIVAN CHIT FUNDS (INDIA) PVT LTD',
      asOnDate: displayDate,
      agentFilterName: selectedAgent !== 'ALL' ? (agentObj?.fullName || selectedAgent) : 'All Agents',
      groupFilterName: selectedGroup !== 'ALL' ? (groupObj?.groupName || selectedGroup) : 'All Groups',
      records: reportData.records,
      summary: reportData.summary
    });
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!reportData || !reportData.records.length) return;

    let displayDate = asOnDate;
    if (asOnDate && asOnDate.includes('-')) {
      const parts = asOnDate.split('-');
      if (parts.length === 3) displayDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
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

    const rows = reportData.records.map((r) => [
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

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Arrears_Report_As_On_${displayDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Date format for report header: DD-MM-YYYY
  const formattedTitleDate = (() => {
    if (!asOnDate) return '';
    const parts = asOnDate.split('-');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return asOnDate;
  })();

  return (
    <div className="space-y-6">
      
      {/* Top Navigation & Action Header (Screen Only) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition text-xs font-semibold shadow-sm"
            title="Return to Balance Sheet"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Balance Sheet</span>
          </button>
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span>Arrears Report</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                As On Register
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Dedicated subscriber-level physical arrears register • Matches company paper format
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePrint}
            disabled={loading || !reportData}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition shadow-sm disabled:opacity-50"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Print Report (A4 Landscape)</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={loading || !reportData}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={loading || !reportData}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition shadow-sm disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Operational Filter Controls (Screen Only) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm print:hidden">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchReport();
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5"
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

          {/* 2. Collection Agent */}
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

          {/* 3. Chit Group / Scheme */}
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
                className="px-3.5 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition text-xs font-medium shrink-0 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Apply</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Summary Metric Cards (Screen Only) */}
      {reportData && reportData.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Payable</span>
            <p className="text-xl font-bold text-slate-900 mt-1">
              ₹{(reportData.summary.totalPayableAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-xs text-slate-400 font-medium">{reportData.summary.totalSubscribers ?? 0} active accounts</span>
          </div>

          <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Total Collection</span>
            <p className="text-xl font-bold text-emerald-800 mt-1">
              ₹{(reportData.summary.totalCollectionAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-xs text-emerald-600 font-medium">As on {formattedTitleDate}</span>
          </div>

          <div className="p-4 bg-rose-50/70 rounded-xl border border-rose-200 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-700">Balance Amount</span>
            <p className="text-xl font-bold text-rose-800 mt-1">
              ₹{(reportData.summary.totalBalanceAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-xs text-rose-600 font-medium">Total remaining dues</span>
          </div>

          <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">Last Coll. Amount Sum</span>
            <p className="text-xl font-bold text-amber-800 mt-1">
              ₹{(reportData.summary.totalLastCollectionAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-xs text-amber-600 font-medium">Sum of latest receipt amounts</span>
          </div>
        </div>
      )}

      {/* Main Report View Area */}
      {loading && !reportData ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-600">Generating arrears register as on {formattedTitleDate}...</p>
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
        
        /* THE EXACT PHYSICAL REPORT CONTAINER (Printed exactly like the photo) */
        <div
          id="arrears-physical-print-area"
          className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-slate-200 overflow-x-auto"
        >
          {/* Centered Title Exactly Matching the Uploaded Physical Document */}
          <div className="text-center pb-3">
            <h2 className="text-base sm:text-lg md:text-xl font-bold tracking-wider text-black uppercase">
              ARREARS REPORT AS ON {formattedTitleDate}
            </h2>
          </div>

          {/* Exact 12-Column Ledger Table matching Physical Document */}
          <table
            className="w-full text-black border-collapse"
            style={{
              border: '1.5px solid #000',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#fff' }}>
                <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontSize: '10.5px', fontWeight: 'bold', width: '3%' }}>
                  S.NO
                </th>
                <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontSize: '10.5px', fontWeight: 'bold', width: '9%' }}>
                  GROUP NO
                </th>
                <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontSize: '10.5px', fontWeight: 'bold', width: '13%' }}>
                  NAME
                </th>
                <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontSize: '10.5px', fontWeight: 'bold', width: '7.5%' }}>
                  CD
                </th>
                <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontSize: '10.5px', fontWeight: 'bold', width: '7.5%' }}>
                  TD
                </th>
                <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontSize: '10.5px', fontWeight: 'bold', width: '11%' }}>
                  TOTAL PAYABLE<br />AMOUNT
                </th>
                <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontSize: '10.5px', fontWeight: 'bold', width: '11%' }}>
                  TOTAL COLLECTION<br />AMOUNT
                </th>
                <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontSize: '10.5px', fontWeight: 'bold', width: '10%' }}>
                  BALANCE<br />AMOUNT
                </th>
                <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontSize: '10.5px', fontWeight: 'bold', width: '8.5%' }}>
                  LAST COLLECTION<br />DATE
                </th>
                <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontSize: '10.5px', fontWeight: 'bold', width: '8.5%' }}>
                  LASTE COLLECTION<br />AMOUNT
                </th>
                <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontSize: '10.5px', fontWeight: 'bold', width: '9%' }}>
                  PH NO
                </th>
                <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontSize: '10.5px', fontWeight: 'bold', width: '10%' }}>
                  AGENT NAME
                </th>
              </tr>
            </thead>
            <tbody>
              {reportData.records.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    style={{ border: '1px solid #000', padding: '16px', textAlign: 'center', color: '#666', fontSize: '11px' }}
                  >
                    No arrears records found for the selected criteria as on {formattedTitleDate}.
                  </td>
                </tr>
              ) : (
                reportData.records.map((r) => (
                  <tr key={`${r.membershipId}-${r.sNo}`}>
                    <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontSize: '10.5px' }}>
                      {r.sNo}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontSize: '10.5px' }}>
                      {r.groupNo}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'left', fontSize: '10.5px' }}>
                      {r.name}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontSize: '10px' }}>
                      {r.cd}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontSize: '10px' }}>
                      {r.td}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'right', fontSize: '10.5px' }}>
                      {Number(r.totalPayableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'right', fontSize: '10.5px' }}>
                      {Number(r.totalCollectionAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'right', fontSize: '10.5px' }}>
                      {Number(r.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontSize: '10px' }}>
                      {r.lastCollectionDate}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'right', fontSize: '10.5px' }}>
                      {Number(r.lastCollectionAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontSize: '10px' }}>
                      {r.phone}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'left', fontSize: '10.5px' }}>
                      {r.agentName}
                    </td>
                  </tr>
                ))
              )}

              {/* Exact Total Summary Row matching Physical Document */}
              <tr style={{ fontWeight: 'bold', borderTop: '1.5px solid #000' }}>
                <td colSpan={5} style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                  Total
                </td>
                <td style={{ border: '1px solid #000', padding: '6px 6px', textAlign: 'right', fontSize: '11px', fontWeight: 'bold' }}>
                  {Number(reportData.summary.totalPayableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </td>
                <td style={{ border: '1px solid #000', padding: '6px 6px', textAlign: 'right', fontSize: '11px', fontWeight: 'bold' }}>
                  {Number(reportData.summary.totalCollectionAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </td>
                <td style={{ border: '1px solid #000', padding: '6px 6px', textAlign: 'right', fontSize: '11px', fontWeight: 'bold' }}>
                  {Number(reportData.summary.totalBalanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </td>
                <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center' }}></td>
                <td style={{ border: '1px solid #000', padding: '6px 6px', textAlign: 'right', fontSize: '11px', fontWeight: 'bold' }}>
                  {Number(reportData.summary.totalLastCollectionAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </td>
                <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center' }}></td>
                <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center' }}></td>
              </tr>

              {/* Empty Ledger Rows Matching Physical Blank Lines */}
              {[1, 2, 3].map((emptyIdx) => (
                <tr key={`empty-${emptyIdx}`} style={{ height: '24px' }}>
                  <td style={{ border: '1px solid #000' }}></td>
                  <td style={{ border: '1px solid #000' }}></td>
                  <td style={{ border: '1px solid #000' }}></td>
                  <td style={{ border: '1px solid #000' }}></td>
                  <td style={{ border: '1px solid #000' }}></td>
                  <td style={{ border: '1px solid #000' }}></td>
                  <td style={{ border: '1px solid #000' }}></td>
                  <td style={{ border: '1px solid #000' }}></td>
                  <td style={{ border: '1px solid #000' }}></td>
                  <td style={{ border: '1px solid #000' }}></td>
                  <td style={{ border: '1px solid #000' }}></td>
                  <td style={{ border: '1px solid #000' }}></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

    </div>
  );
};
