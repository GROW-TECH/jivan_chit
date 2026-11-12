import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  RefreshCw,
  DollarSign,
  Activity,
  PieChart,
  Edit2,
  Trash2,
  Printer,
  FileSpreadsheet,
  Download,
  Search,
  UserCheck,
  FileText,
  Building2,
  X,
  User as UserIcon,
  ShieldAlert
} from 'lucide-react';
import { api } from '../../api/client';
import { Logo } from '../../components/Logo';
import { SubscriberStatementModal } from '../../components/SubscriberStatementModal';
import { generateAgentMonthlyReportPDF } from '../../utils/pdfGenerator';
import type { ChitGroup, User } from '../../types';

interface AgentRecord {
  id: number;
  agentId: string;
  fullName: string;
  username: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
}

interface MonthlyCollectionViewProps {
  userRole: string;
  currentUser?: User;
}

export const MonthlyCollectionView: React.FC<MonthlyCollectionViewProps> = ({ userRole, currentUser }) => {
  const isAgent = userRole === 'agent' || userRole?.includes('agent');
  const isAdmin = userRole === 'admin';
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [dateFilterType, setDateFilterType] = useState<'month' | 'range'>('month');
  const [startDate, setStartDate] = useState(() => `${new Date().toISOString().slice(0, 7)}-01`);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Agent Selection State
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [agentSearchQuery, setAgentSearchQuery] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>(() => (isAgent && currentUser?.id ? String(currentUser.id) : 'ALL'));
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);

  // Payment Mode Filter State
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('ALL');

  // Status Filter State
  const [selectedStatus, setSelectedStatus] = useState<string>('active');

  // Route / Chit Group Filter State
  const [groups, setGroups] = useState<ChitGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('ALL');

  // Customer / Scheme Members Filter State (Dynamically linked to Chit Scheme)
  const [schemeMembers, setSchemeMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('ALL');

  // Individual Subscriber Statement Modal State
  const [selectedSubscriberCustomerId, setSelectedSubscriberCustomerId] = useState<string | null>(null);
  const [selectedSubscriberGroupId, setSelectedSubscriberGroupId] = useState<string | undefined>(undefined);

  // Company Settings for Reports
  const [companySettings, setCompanySettings] = useState<any>(null);

  // Lock agent selection to their own user id
  useEffect(() => {
    if (isAgent && currentUser?.id) {
      setSelectedAgentId(String(currentUser.id));
    }
  }, [isAgent, currentUser?.id]);

  // Load all agents from database (Admin only) or current agent
  const loadAgents = async () => {
    if (isAgent) {
      if (currentUser) {
        setAgents([{
          id: currentUser.id,
          agentId: `AGT-${String(currentUser.id).padStart(3, '0')}`,
          fullName: currentUser.fullName || currentUser.username,
          username: currentUser.username,
          email: currentUser.email || '',
          role: 'agent',
          status: 'active'
        }]);
      }
      return;
    }
    setLoadingAgents(true);
    try {
      const agentList = await api.getAgents();
      setAgents(agentList || []);
    } catch (err) {
      console.error('Failed to load agents:', err);
    } finally {
      setLoadingAgents(false);
    }
  };

  // Load groups for route filter
  const loadGroups = async () => {
    try {
      const grpList = await api.getChitGroups();
      setGroups(grpList || []);
    } catch (err) {
      console.error('Failed to load chit groups:', err);
    }
  };

  // Load members dynamically whenever Chit Scheme changes
  useEffect(() => {
    setLoadingMembers(true);
    api.getMemberships(selectedGroupId !== 'ALL' ? selectedGroupId : undefined)
      .then((mems) => {
        setSchemeMembers(mems || []);
      })
      .catch((err) => {
        console.error('Failed to load scheme memberships:', err);
      })
      .finally(() => {
        setLoadingMembers(false);
      });
    setSelectedCustomerId('ALL');
  }, [selectedGroupId]);

  // Load company settings
  const loadSettings = async () => {
    try {
      const settings = await api.getSettings();
      setCompanySettings(settings);
    } catch (err) {
      console.error('Failed to load company settings:', err);
    }
  };

  useEffect(() => {
    loadAgents();
    loadGroups();
    loadSettings();
  }, []);

  // Fetch monthly collections data with agent, route, customer, payment mode, date-range, and status filters
  const fetchData = async () => {
    setLoading(true);
    try {
      const effectiveAgent = isAgent ? String(currentUser?.id || '') : selectedAgentId;
      const sDate = dateFilterType === 'range' ? startDate : undefined;
      const eDate = dateFilterType === 'range' ? endDate : undefined;
      const res = await api.getMonthlyCollection(
        month,
        effectiveAgent,
        selectedGroupId,
        selectedCustomerId,
        selectedPaymentMode,
        sDate,
        eDate,
        selectedStatus
      );
      setData(res);
    } catch (err) {
      console.error('Failed to load monthly collection data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [month, selectedAgentId, selectedGroupId, selectedCustomerId, selectedPaymentMode, dateFilterType, startDate, endDate, selectedStatus]);

  // Filtered groups available for selection (restricted to authorized groups for agents)
  const displayGroups = useMemo(() => {
    if (!isAgent) return groups;
    const agentGroupIds = new Set([
      ...schemeMembers.map((m) => m.groupId),
      ...(data?.transactions || []).map((t: any) => t.groupId)
    ].filter(Boolean));
    if (agentGroupIds.size === 0) return groups;
    return groups.filter((g) => agentGroupIds.has(g.groupId));
  }, [isAgent, groups, schemeMembers, data?.transactions]);

  // Find currently selected agent details
  const selectedAgentObj = useMemo(() => {
    if (selectedAgentId === 'ALL') return null;
    return agents.find((a) => String(a.id) === selectedAgentId || a.username === selectedAgentId || a.agentId === selectedAgentId);
  }, [agents, selectedAgentId]);

  // Filtered agent list for the searchable dropdown
  const filteredAgentsList = useMemo(() => {
    if (!agentSearchQuery.trim()) return agents;
    const q = agentSearchQuery.toLowerCase().trim();
    return agents.filter(
      (a) =>
        a.fullName.toLowerCase().includes(q) ||
        a.username.toLowerCase().includes(q) ||
        a.agentId.toLowerCase().includes(q)
    );
  }, [agents, agentSearchQuery]);

  const transactions = data?.transactions || [];
  const totalCollected = data?.totalCollected || 0;
  const commissionEarned = data?.commissionEarned || totalCollected * 0.05;

  const OFFICIAL_COMPANY_NAME = 'JIVAN CHITS SALEM (P) LTD.,';
  const OFFICIAL_COMPANY_ADDRESS = 'No.463/8, Harish Tower, Ramasamy Nagar, East Thiruvagoundanur, Salem 636005.';

  const formatCurrency = (val: number) => {
    return (Number.isFinite(val) ? Math.round(val) : 0).toLocaleString('en-IN');
  };

  const cleanAgentName = (name?: string) => {
    if (!name) return 'Office';
    return name.replace(/\s*\([^)]*\)/g, '').trim();
  };

  const companyDisplayName = OFFICIAL_COMPANY_NAME;
  const dateRangeLabel = dateFilterType === 'range' ? `${startDate} to ${endDate}` : month;

  const handlePrint = () => {
    if (selectedCustomerId !== 'ALL') {
      setSelectedSubscriberCustomerId(selectedCustomerId);
      setSelectedSubscriberGroupId(selectedGroupId !== 'ALL' ? selectedGroupId : undefined);
      return;
    }
    const originalTitle = document.title;
    document.title = isAgent ? `My Monthly Collections - ${dateRangeLabel}` : `Agent Collection Statement - ${dateRangeLabel}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const handleDownloadPDF = () => {
    if (!data) return;

    const companyName = OFFICIAL_COMPANY_NAME;
    const companyAddress = OFFICIAL_COMPANY_ADDRESS;
    const companyPhone = '95855-57568';
    const companyEmail = 'info@jivanchits.com';

    const agentDisplayName = isAgent
      ? (currentUser?.fullName || currentUser?.username || data?.agentDetails?.fullName || 'Agent')
      : selectedAgentObj
      ? selectedAgentObj.fullName
      : selectedAgentId === 'ALL'
      ? 'All Agents Consolidated'
      : (data?.agentDetails?.fullName || selectedAgentId);

    const agentDisplayId = isAgent
      ? (currentUser ? `AGT-${String(currentUser.id).padStart(3, '0')}` : data?.agentDetails?.agentId || 'AGENT')
      : selectedAgentObj
      ? selectedAgentObj.agentId
      : (data?.agentDetails?.agentId || (selectedAgentId === 'ALL' ? 'ALL' : `AGT-${selectedAgentId}`));

    const selectedGroupObj = groups.find((g) => g.groupId === selectedGroupId);
    const routeName = selectedGroupId === 'ALL'
      ? (isAgent && data?.agentDetails?.assignedRouteName ? `${data.agentDetails.assignedRouteName} (All Groups)` : 'All Routes & Groups')
      : (selectedGroupObj?.groupName || selectedGroupId);

    const reportTitle = isAgent ? 'MY MONTHLY COLLECTION STATEMENT' : 'AGENT-WISE MONTHLY COLLECTION STATEMENT';

    generateAgentMonthlyReportPDF({
      reportTitle,
      companyName,
      companyAddress,
      companyPhone,
      companyEmail,
      reportingMonth: dateRangeLabel,
      agentName: agentDisplayName,
      agentId: agentDisplayId,
      route: routeName,
      totalCollected,
      commissionEarned,
      totalTransactions: transactions.length,
      transactions: transactions.map((t: any) => ({
        date: t.date,
        receiptNumber: t.receiptNumber || t.id,
        customerName: t.customerName,
        groupName: t.groupName,
        ticketNumber: t.ticketNumber || 1,
        amountPaid: t.amountPaid,
        paymentMode: t.paymentMode,
        commission: t.commission || (t.amountPaid * 0.05),
        outstandingBalance: t.outstandingBalance || 0
      }))
    });
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = [
      'S.No',
      'Date',
      'Time',
      'Receipt / Bill No',
      'Subscriber Name',
      'Phone',
      'Chit Group / Route',
      'Ticket No',
      'Agent Name',
      'Agent ID',
      'Payment Mode',
      'Status',
      'Collected Amount (INR)',
      'Agent Commission 5% (INR)',
      'Outstanding Due (INR)'
    ];

    const rows = transactions.map((t: any, idx: number) => [
      idx + 1,
      `"${t.date || ''}"`,
      `"${t.time || ''}"`,
      `"${t.receiptNumber || t.id || ''}"`,
      `"${t.customerName || ''}"`,
      `"${t.customerPhone || ''}"`,
      `"${t.groupName || ''}"`,
      `"#${t.ticketNumber || 1}"`,
      `"${t.agentName || 'Default Staff'}"`,
      `"${t.agentId || ''}"`,
      `"${t.paymentMode || 'Cash'}"`,
      `"${t.status || 'active'}"`,
      t.amountPaid || 0,
      t.commission || (t.amountPaid * 0.05),
      t.outstandingBalance || 0
    ]);

    const reportTitle = isAgent
      ? 'JIVAN CHIT FUNDS (INDIA) PVT LTD - MY MONTHLY COLLECTION REPORT'
      : 'JIVAN CHIT FUNDS (INDIA) PVT LTD - AGENT & ROUTE WISE COLLECTION REPORT';

    const csvContent = [
      reportTitle,
      `Reporting Period: ${dateRangeLabel}`,
      `Selected Agent: ${isAgent ? (currentUser?.fullName || currentUser?.username) : (selectedAgentObj?.fullName || selectedAgentId)}`,
      `Selected Route/Group: ${selectedGroupId}`,
      `Payment Mode Filter: ${selectedPaymentMode}`,
      `Status Filter: ${selectedStatus}`,
      `Generated On: ${new Date().toLocaleString()}`,
      `Total Collected: INR ${totalCollected}`,
      `Total Commission (5%): INR ${commissionEarned}`,
      '',
      headers.join(','),
      ...rows.map((r: any) => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', isAgent ? `My_Monthly_Collections_${dateRangeLabel}.csv` : `Agent_Monthly_Collection_${selectedAgentId}_${dateRangeLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto print:p-0 print:m-0 print:max-w-none print:w-full">
      {/* Printable Official Header (Visible ONLY when printing) */}
      <div id="printable-agent-report" className="hidden print:block mb-5 text-center font-sans">
        <h1 className="text-2xl font-black text-black tracking-wide uppercase font-sans">
          {OFFICIAL_COMPANY_NAME}
        </h1>
        <p className="text-xs text-black font-sans mt-0.5 font-medium">
          {OFFICIAL_COMPANY_ADDRESS}
        </p>

        <div className="mt-3 py-1.5 px-6 border-2 border-black inline-block text-xs font-bold uppercase tracking-wider">
          {isAgent ? `MY MONTHLY COLLECTION STATEMENT — ${dateRangeLabel}` : `AGENT-WISE MONTHLY COLLECTION STATEMENT — ${dateRangeLabel}`}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-3 text-xs text-left border border-black p-3">
          <div className="space-y-1">
            <p><strong>Agent Name:</strong> {isAgent ? `${cleanAgentName(currentUser?.fullName || currentUser?.username)} (AGT-${String(currentUser?.id).padStart(3, '0')})` : selectedAgentObj ? `${cleanAgentName(selectedAgentObj.fullName)} (${selectedAgentObj.agentId})` : selectedAgentId === 'ALL' ? 'All Agents Consolidated' : selectedAgentId}</p>
            <p><strong>Route / Group:</strong> {selectedGroupId === 'ALL' ? (isAgent && data?.agentDetails?.assignedRouteName ? `${data.agentDetails.assignedRouteName} (All Groups)` : 'All Routes & Groups') : (groups.find(g => g.groupId === selectedGroupId)?.groupName || selectedGroupId)}</p>
            <p><strong>Reporting Period:</strong> {dateRangeLabel}</p>
          </div>
          <div className="text-right space-y-1">
            <p><strong>Total Transactions:</strong> {transactions.length}</p>
            <p><strong>Total Collection:</strong> ₹{formatCurrency(totalCollected)}</p>
            <p><strong>Agent Commission (5%):</strong> ₹{formatCurrency(commissionEarned)}</p>
          </div>
        </div>
      </div>

      {/* Screen Page Header (Hidden when printing) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-600" />
            <span>{isAgent ? 'My Monthly Collections' : 'Monthly Transactions & Agent Breakdown'}</span>
          </h1>
          <p className="text-sm text-slate-500">
            {isAgent
              ? 'Your verified collection records, monthly earnings, and 5% commission breakdown'
              : 'Dynamic agent filtering, commission statements (5%), and subscriber passbooks'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Toggle Month vs Date Range */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setDateFilterType('month')}
              className={`px-2.5 py-1.5 rounded-md transition ${dateFilterType === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setDateFilterType('range')}
              className={`px-2.5 py-1.5 rounded-md transition ${dateFilterType === 'range' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Date Range
            </button>
          </div>

          {dateFilterType === 'month' ? (
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium"
            />
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium"
              />
            </div>
          )}

          <button
            onClick={fetchData}
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
            title="Export CSV / Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
            title="Download Official Formatted PDF"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-xs transition"
            title="Print Official Statement (A4)"
          >
            <Printer className="w-4 h-4" />
            <span>Print A4</span>
          </button>
        </div>
      </div>

      {/* Dynamic Searchable Filter Bar (Hidden when printing) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-xs flex flex-wrap items-center gap-4 print:hidden">
        {/* Agent Selector or Locked Agent Card */}
        {isAgent ? (
          <div className="min-w-[240px]">
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Field Agent:
            </label>
            <div className="flex items-center gap-2 px-3 py-2 border border-emerald-300 bg-emerald-50/70 rounded-lg text-sm font-semibold text-emerald-950">
              <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="truncate">
                <span className="truncate block">
                  {currentUser?.fullName || currentUser?.username} ({`AGT-${String(currentUser?.id).padStart(3, '0')}`})
                </span>
                {data?.agentDetails?.assignedRouteName && (
                  <span className="text-[11px] text-emerald-700 font-medium block">
                    Route: {data.agentDetails.assignedRouteId ? `${data.agentDetails.assignedRouteId} - ` : ''}{data.agentDetails.assignedRouteName}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="relative min-w-[280px]">
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Agent Name / Unique ID:
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                className="w-full flex items-center justify-between px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white hover:bg-slate-50 transition text-left font-medium"
              >
                <div className="flex items-center gap-2 truncate">
                  <UserCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="truncate">
                    {selectedAgentId === 'ALL'
                      ? 'All Agents Consolidated'
                      : selectedAgentObj
                      ? `${selectedAgentObj.fullName} (${selectedAgentObj.agentId})`
                      : `Agent #${selectedAgentId}`}
                  </span>
                </div>
                <span className="text-xs text-slate-400">▼</span>
              </button>

              {/* Dropdown Popover */}
              {showAgentDropdown && (
                <div className="absolute left-0 top-full mt-1.5 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 text-xs">
                  {/* Search as you type */}
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={agentSearchQuery}
                      onChange={(e) => setAgentSearchQuery(e.target.value)}
                      placeholder="Search by name, ID (AGT-001)..."
                      className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-amber-500"
                      autoFocus
                    />
                    {agentSearchQuery && (
                      <button
                        onClick={() => setAgentSearchQuery('')}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1 divide-y divide-slate-50">
                    {/* Option: All Agents */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAgentId('ALL');
                        setShowAgentDropdown(false);
                        setAgentSearchQuery('');
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg font-bold flex items-center justify-between ${
                        selectedAgentId === 'ALL' ? 'bg-amber-50 text-amber-900' : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <span>All Agents Consolidated</span>
                      <span className="text-[10px] text-slate-400">({agents.length} agents)</span>
                    </button>

                    {/* List of Agents from DB */}
                    {filteredAgentsList.length === 0 ? (
                      <div className="p-3 text-center text-slate-400">No agents found</div>
                    ) : (
                      filteredAgentsList.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            setSelectedAgentId(String(a.id));
                            setShowAgentDropdown(false);
                            setAgentSearchQuery('');
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition ${
                            selectedAgentId === String(a.id)
                              ? 'bg-amber-50 text-amber-900 font-bold'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div>
                            <p className="font-semibold text-slate-900">{a.fullName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {a.agentId} • @{a.username}
                            </p>
                          </div>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${
                              a.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            {a.status}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Route / Chit Group Filter */}
        <div className="min-w-[220px]">
          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
            Route / Chit Scheme:
          </label>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium text-slate-800"
            >
              <option value="ALL">{isAgent ? 'All My Chit Groups' : 'All Routes & Chit Groups'}</option>
              {displayGroups.map((g) => (
                <option key={g.groupId} value={g.groupId}>
                  {g.groupName} ({g.groupId})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Customer / Member Filter (Dynamically linked to Chit Scheme) */}
        <div className="min-w-[240px] flex-1">
          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
            Customer / Subscriber:
          </label>
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              disabled={loadingMembers}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium text-slate-800 disabled:opacity-50"
            >
              <option value="ALL">
                {selectedGroupId !== 'ALL'
                  ? `All Members in this Scheme (${schemeMembers.length})`
                  : 'All Customers / Subscribers'}
              </option>
              {schemeMembers.map((m) => (
                <option key={m.membershipId || `${m.customerId}-${m.ticketNumber}`} value={m.customerId}>
                  {m.ticketNumber ? `[#${String(m.ticketNumber).padStart(2, '0')}] ` : ''}
                  {m.customerName || m.customerId}
                  {m.customerMobile ? ` (${m.customerMobile})` : ''}
                </option>
              ))}
            </select>

            {/* Direct Passbook Statement button when customer is selected */}
            {selectedCustomerId !== 'ALL' && (
              <button
                type="button"
                onClick={() => {
                  setSelectedSubscriberCustomerId(selectedCustomerId);
                  setSelectedSubscriberGroupId(selectedGroupId !== 'ALL' ? selectedGroupId : undefined);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg text-xs font-bold transition shadow-xs shrink-0 whitespace-nowrap"
                title="Open Individual Monthly Collection Statement (Passbook)"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Passbook</span>
              </button>
            )}
          </div>
        </div>

        {/* Payment Mode Filter */}
        <div className="min-w-[150px]">
          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
            Payment Mode:
          </label>
          <select
            value={selectedPaymentMode}
            onChange={(e) => setSelectedPaymentMode(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium text-slate-800"
          >
            <option value="ALL">All Modes</option>
            <option value="Cash">Cash</option>
            <option value="GPay">GPay / UPI</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="min-w-[140px]">
          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
            Status:
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium text-slate-800"
          >
            <option value="active">Active (Standard)</option>
            <option value="ALL">All Statuses</option>
            <option value="reversed">Reversed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Reset Filter Button */}
        {((!isAgent && selectedAgentId !== 'ALL') || selectedGroupId !== 'ALL' || selectedCustomerId !== 'ALL' || selectedPaymentMode !== 'ALL' || selectedStatus !== 'active' || dateFilterType !== 'month') && (
          <button
            onClick={() => {
              if (!isAgent) setSelectedAgentId('ALL');
              setSelectedGroupId('ALL');
              setSelectedCustomerId('ALL');
              setSelectedPaymentMode('ALL');
              setSelectedStatus('active');
              setDateFilterType('month');
            }}
            className="text-xs text-amber-700 font-semibold hover:underline mt-4 sm:ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Summary Metric Cards (Hidden when printing) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Collection</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 font-mono">
                  ₹{totalCollected.toLocaleString('en-IN')}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">For period {dateRangeLabel}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Agent Commission (5%)</p>
                <p className="text-2xl sm:text-3xl font-bold text-amber-600 mt-1 font-mono">
                  ₹{commissionEarned.toLocaleString('en-IN')}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Configured rate: 5.0%</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
                <PieChart className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Transactions</p>
                <p className="text-2xl sm:text-3xl font-bold text-indigo-600 mt-1 font-mono">
                  {transactions.length}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Verified payment receipts</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                <Activity className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Interactive Screen Transactions Table (Hidden in Print to avoid cramped layout) */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs print:hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-800 flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <span>{isAgent ? 'My Transactions' : 'Monthly Transactions & Agent Breakdown'} ({transactions.length})</span>
                {isAgent && (
                  <span className="text-xs bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded font-mono">
                    {currentUser?.fullName || currentUser?.username} ({`AGT-${String(currentUser?.id).padStart(3, '0')}`})
                  </span>
                )}
                {!isAgent && selectedAgentObj && (
                  <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded font-mono">
                    {selectedAgentObj.fullName} ({selectedAgentObj.agentId})
                  </span>
                )}
              </div>
              <span className="text-xs font-normal text-slate-500">
                Route: {selectedGroupId === 'ALL' ? (isAgent && data?.agentDetails?.assignedRouteName ? `${data.agentDetails.assignedRouteName} (All Groups)` : 'All Routes') : selectedGroupId}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
                <thead className="bg-slate-50 font-bold text-slate-700">
                  <tr>
                    <th className="px-3.5 py-3 text-left">Date & Bill #</th>
                    <th className="px-3.5 py-3 text-left">Subscriber Details</th>
                    <th className="px-3.5 py-3 text-left">Route / Group</th>
                    <th className="px-3.5 py-3 text-left">Agent Name</th>
                    <th className="px-3.5 py-3 text-center">Mode</th>
                    <th className="px-3.5 py-3 text-right">Collected (₹)</th>
                    <th className="px-3.5 py-3 text-right">Comm 5% (₹)</th>
                    <th className="px-3.5 py-3 text-right">Due (₹)</th>
                    <th className="px-3.5 py-3 text-center print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {transactions.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition">
                      {/* Date & Bill # */}
                      <td className="px-3.5 py-3 font-mono">
                        <p className="font-bold text-slate-900">{t.date}</p>
                        <p className="text-[11px] text-amber-800 font-semibold">Bill: {t.receiptNumber}</p>
                        <p className="text-[10px] text-slate-400">{t.time}</p>
                      </td>

                      {/* Subscriber Details */}
                      <td className="px-3.5 py-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSubscriberCustomerId(t.customerId);
                            setSelectedSubscriberGroupId(t.groupId);
                          }}
                          className="font-bold text-slate-900 hover:text-amber-700 hover:underline text-left block"
                          title="Open Subscriber Passbook Statement"
                        >
                          {t.customerName}
                        </button>
                        <p className="text-xs text-slate-500 font-mono">{t.customerPhone}</p>
                      </td>

                      {/* Route / Group */}
                      <td className="px-3.5 py-3">
                        <p className="font-semibold text-slate-800">{t.groupName}</p>
                        <p className="text-[11px] text-slate-500 font-mono">Ticket #{t.ticketNumber}</p>
                      </td>

                      {/* Agent Name */}
                      <td className="px-3.5 py-3">
                        <p className="font-medium text-slate-900">{t.agentName}</p>
                        {t.agentId && t.agentId !== 'N/A' && (
                          <span className="text-[10px] text-slate-400 font-mono block">{t.agentId}</span>
                        )}
                      </td>

                      {/* Payment Mode */}
                      <td className="px-3.5 py-3 text-center font-mono">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {t.paymentMode}
                        </span>
                      </td>

                      {/* Collected Amount */}
                      <td className="px-3.5 py-3 text-right font-bold text-emerald-700 font-mono">
                        ₹{t.amountPaid?.toLocaleString('en-IN')}
                      </td>

                      {/* Commission */}
                      <td className="px-3.5 py-3 text-right font-semibold text-amber-700 font-mono">
                        ₹{(t.commission || (t.amountPaid * 0.05))?.toLocaleString('en-IN')}
                      </td>

                      {/* Outstanding Due */}
                      <td className="px-3.5 py-3 text-right font-mono">
                        <span className={`font-semibold ${t.outstandingBalance > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                          ₹{t.outstandingBalance?.toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-3.5 py-3 text-center print:hidden">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Individual Statement Trigger */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSubscriberCustomerId(t.customerId);
                              setSelectedSubscriberGroupId(t.groupId);
                            }}
                            className="p-1.5 text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition"
                            title="View / Print Subscriber Statement"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-800" />
                          </button>

                          {/* Edit payment (Admin only) */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={async () => {
                                const newAmt = prompt('Edit collected amount (₹):', String(t.amountPaid));
                                if (newAmt && !isNaN(Number(newAmt))) {
                                  try {
                                    await api.updatePayment(t.id, { amountPaid: Number(newAmt) });
                                    fetchData();
                                  } catch (err: any) {
                                    alert(err.message || 'Failed to update transaction');
                                  }
                                }
                              }}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Edit Transaction Amount"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete payment (Admin only) */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm(`Are you sure you want to delete transaction #${t.id}?`)) {
                                  try {
                                    await api.deletePayment(t.id);
                                    fetchData();
                                  } catch (err: any) {
                                    alert(err.message || 'Failed to delete transaction');
                                  }
                                }
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Transaction"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* Empty state */}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-500 font-sans">
                        <p className="font-medium text-slate-700">No collection transactions found for this selection.</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {isAgent
                            ? `You have not recorded any collections in ${month} matching the selected filters.`
                            : selectedAgentObj
                            ? `Agent "${selectedAgentObj.fullName}" has not recorded collections in ${month}.`
                            : 'Try selecting a different month or clearing filters.'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* Grand Totals Footer */}
                {transactions.length > 0 && (
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={5} className="px-3.5 py-3 text-right uppercase text-slate-800">
                        Grand Totals ({transactions.length} Transactions)
                      </td>
                      <td className="px-3.5 py-3 text-right text-emerald-800 font-mono text-sm">
                        ₹{totalCollected.toLocaleString('en-IN')}
                      </td>
                      <td className="px-3.5 py-3 text-right text-amber-800 font-mono text-sm">
                        ₹{commissionEarned.toLocaleString('en-IN')}
                      </td>
                      <td colSpan={2} className="px-3.5 py-3 text-right print:hidden"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Dedicated Clean Printable Agent Statement (Visible ONLY in print, spacious, no fighting for space) */}
          <div className="hidden print:block w-full">
            <table className="w-full border-collapse border border-black text-[11px] table-fixed">
              <colgroup>
                <col style={{ width: '4%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '19%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '6%' }} />
                <col style={{ width: '15%' }} />
              </colgroup>
              <thead>
                <tr className="bg-slate-100 text-black border-b border-black font-bold">
                  <th className="py-2 px-1 border border-black text-center font-bold">S.No</th>
                  <th className="py-2 px-1 border border-black text-center font-bold">Date</th>
                  <th className="py-2 px-1 border border-black text-center font-bold">Bill No</th>
                  <th className="py-2 px-2 border border-black text-left font-bold">Subscriber Name</th>
                  <th className="py-2 px-2 border border-black text-left font-bold">Group / Ticket</th>
                  <th className="py-2 px-1.5 border border-black text-left font-bold">Agent</th>
                  <th className="py-2 px-1 border border-black text-center font-bold">Mode</th>
                  <th className="py-2 px-2.5 border border-black text-right font-bold">Collected (₹)</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-500 border border-black font-sans">
                      No collection transactions recorded for this period.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t: any, idx: number) => (
                    <tr key={t.id || idx} className="text-black">
                      <td className="py-1.5 px-1 border border-black text-center font-mono text-[10.5px]">{idx + 1}</td>
                      <td className="py-1.5 px-1 border border-black text-center font-mono text-[10.5px] whitespace-nowrap">{t.date}</td>
                      <td className="py-1.5 px-1 border border-black text-center font-mono text-[10.5px] whitespace-nowrap overflow-hidden text-ellipsis">{t.receiptNumber || t.id}</td>
                      <td className="py-1.5 px-2 border border-black text-left font-medium overflow-hidden text-ellipsis whitespace-nowrap">{t.customerName}</td>
                      <td className="py-1.5 px-2 border border-black text-left overflow-hidden text-ellipsis whitespace-nowrap">{t.groupName} #{t.ticketNumber || 1}</td>
                      <td className="py-1.5 px-1.5 border border-black text-left whitespace-nowrap overflow-hidden text-ellipsis">{cleanAgentName(t.agentName)}</td>
                      <td className="py-1.5 px-1 border border-black text-center whitespace-nowrap">{t.paymentMode}</td>
                      <td className="py-1.5 px-2.5 border border-black text-right font-mono font-medium whitespace-nowrap overflow-hidden">₹{formatCurrency(t.amountPaid)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {transactions.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-black bg-slate-100 font-bold text-black">
                    <td colSpan={7} className="py-2 px-3 border border-black text-right tracking-wide text-xs">
                      TOTAL COLLECTION ({transactions.length} Transactions)
                    </td>
                    <td className="py-2 px-2.5 border border-black text-right font-mono font-bold text-xs whitespace-nowrap overflow-hidden">
                      ₹{formatCurrency(totalCollected)}
                    </td>
                  </tr>
                  <tr className="border-t border-black bg-slate-50 font-bold text-black">
                    <td colSpan={7} className="py-1.5 px-3 border border-black text-right text-xs">
                      AGENT COMMISSION (5.0%)
                    </td>
                    <td className="py-1.5 px-2.5 border border-black text-right font-mono font-bold text-xs whitespace-nowrap overflow-hidden">
                      ₹{formatCurrency(commissionEarned)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>

            {/* Official Signatures */}
            <div className="grid grid-cols-3 gap-8 mt-16 pt-8 text-xs text-black">
              <div className="text-left">
                <div className="w-36 border-b border-black mb-2" />
                <p className="font-bold">Prepared By</p>
              </div>
              <div className="text-center flex flex-col items-center">
                <div className="w-36 border-b border-black mb-2" />
                <p className="font-bold">Agent Signature</p>
              </div>
              <div className="text-right flex flex-col items-end">
                <div className="w-36 border-b border-black mb-2" />
                <p className="font-bold">Authorized Signatory</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500">Failed to load data</div>
      )}

      {/* Individual Subscriber Statement Modal */}
      {selectedSubscriberCustomerId && (
        <SubscriberStatementModal
          customerId={selectedSubscriberCustomerId}
          groupId={selectedSubscriberGroupId}
          onClose={() => {
            setSelectedSubscriberCustomerId(null);
            setSelectedSubscriberGroupId(undefined);
          }}
        />
      )}
    </div>
  );
};
