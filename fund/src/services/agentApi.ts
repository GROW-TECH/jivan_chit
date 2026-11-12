import type {
  AgentCollectionFilters,
  AgentCollectionSummary,
  AgentCustomer,
  AgentDailySummary,
  AgentDueBill,
  AgentMonthlySummary,
  AgentMonthlyTrendPoint,
  AgentProfile,
  AgentReceipt,
  CollectPaymentInput,
  CollectionPayment,
  CollectionSheetItem
} from '../types/agent';
import { getStoredToken } from '../api/client';
import { generatePaymentReceiptPDF } from '../utils/pdfGenerator';

export const AGENT_ID = 'agent-001';
const COMMISSION_RATE = 0.05;

const pad2 = (n: number) => String(n).padStart(2, '0');
const toDateKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const monthKeyOf = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;

export const TODAY_KEY = toDateKey(new Date());
export const CURRENT_MONTH_KEY = monthKeyOf(new Date());

export function formatAmount(value: number): string {
  return `₹${(Number.isFinite(value) ? Math.round(value) : 0).toLocaleString('en-IN')}`;
}

export function formatDate(iso: string): string {
  if (!iso) return '-';
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return `${date}, ${time}`;
}

export function monthLabel(key: string): string {
  const [y, m] = (key || CURRENT_MONTH_KEY).split('-').map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

// -------------------------------------------------------------
// Live HTTP Client helper for Agent API
// -------------------------------------------------------------
async function agentRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let baseUrl = import.meta.env.VITE_API_URL || '';
  if (!baseUrl && typeof window !== 'undefined' && window.location.pathname.startsWith('/JivanChitFunds')) {
    baseUrl = '/JivanChitFunds';
  }
  const response = await fetch(`${baseUrl}/api${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || 'An error occurred while communicating with the server.');
  }

  if (data && typeof data === 'object' && 'data' in data && 'success' in data) {
    return data.data as T;
  }

  return data as T;
}

// -------------------------------------------------------------
// Primary Agent API Service (100% Live DB Integration, Zero Fake Mock Data)
// -------------------------------------------------------------
export const agentApi = {
  async getAgentProfile(agentId?: string): Promise<AgentProfile> {
    try {
      const res = await agentRequest<any>('/agent/profile');
      return {
        id: res?.id || agentId || 'agent-001',
        name: res?.name || 'Field Agent',
        phone: res?.phone || '',
        area: res?.area || 'No Route Assigned',
        assignedCustomers: Number(res?.assignedCustomers || 0)
      };
    } catch {
      return {
        id: agentId || 'agent-001',
        name: 'Field Agent',
        phone: '',
        area: 'No Route Assigned',
        assignedCustomers: 0
      };
    }
  },

  async getAgentCollectionSummary(month: string = CURRENT_MONTH_KEY): Promise<AgentCollectionSummary> {
    try {
      const res = await agentRequest<AgentCollectionSummary>(`/agent/summary?month=${encodeURIComponent(month)}`);
      return {
        todayCashCollection: Number(res?.todayCashCollection || 0),
        todayOnlineCollection: Number(res?.todayOnlineCollection || 0),
        todayTotalCollection: Number(res?.todayTotalCollection || 0),
        todayCustomersCollected: Number(res?.todayCustomersCollected || 0),
        todayPendingCollections: Number(res?.todayPendingCollections || 0),
        todayOverdueCollections: Number(res?.todayOverdueCollections || 0),
        monthlyCollection: Number(res?.monthlyCollection || 0),
        monthlyTarget: Number(res?.monthlyTarget || 0),
        pendingBalance: Number(res?.pendingBalance || 0),
        pendingCustomersCount: Number(res?.pendingCustomersCount || 0),
        commissionEarned: Number(res?.commissionEarned || 0),
        commissionRate: COMMISSION_RATE,
        collectedInstallments: Number(res?.collectedInstallments || 0),
        pendingInstallments: Number(res?.pendingInstallments || 0),
        overdueInstallments: Number(res?.overdueInstallments || 0),
        remainingTargetAmount: Number(res?.remainingTargetAmount || 0),
        targetAchievedPercent: Number(res?.targetAchievedPercent || 0),
        month: res?.month || month
      };
    } catch {
      return {
        todayCashCollection: 0,
        todayOnlineCollection: 0,
        todayTotalCollection: 0,
        todayCustomersCollected: 0,
        todayPendingCollections: 0,
        todayOverdueCollections: 0,
        monthlyCollection: 0,
        monthlyTarget: 0,
        pendingBalance: 0,
        pendingCustomersCount: 0,
        commissionEarned: 0,
        commissionRate: COMMISSION_RATE,
        collectedInstallments: 0,
        pendingInstallments: 0,
        overdueInstallments: 0,
        remainingTargetAmount: 0,
        targetAchievedPercent: 0,
        month
      };
    }
  },

  async getAgentMonthlyTrend(): Promise<AgentMonthlyTrendPoint[]> {
    try {
      const res = await agentRequest<any>('/agent/monthly-trend');
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    } catch {
      return [];
    }
  },

  async getAgentCollectionSheet(
    _agentId?: string,
    filters?: AgentCollectionFilters
  ): Promise<CollectionSheetItem[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.dateType) params.append('dateType', filters.dateType);
      if (filters?.customDate) params.append('customDate', filters.customDate);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.search) params.append('search', filters.search);

      const res = await agentRequest<any>(`/agent/collection-sheet?${params.toString()}`);
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.items)) return res.items;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    } catch {
      return [];
    }
  },

  async getAgentCustomers(agentId: string = AGENT_ID): Promise<AgentCustomer[]> {
    try {
      const sheet = await this.getAgentCollectionSheet(agentId, { dateType: 'today', customDate: '', status: 'all', search: '' });
      return (Array.isArray(sheet) ? sheet : []).map((s) => ({
        id: s.customerId,
        name: s.customerName,
        phone: s.phone,
        chitGroupCode: s.chitGroupCode,
        ticketNumber: s.ticketNumber,
        assignedAgentId: agentId,
        totalDueAmount: s.dueInstallmentAmount,
        totalPaidAmount: s.paidAmount,
        outstandingBalance: s.pendingBalance
      }));
    } catch {
      return [];
    }
  },

  async getAgentDueBills(_agentId: string = AGENT_ID): Promise<AgentDueBill[]> {
    try {
      const res = await agentRequest<any>('/agent/due-bills');
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      if (res && Array.isArray(res.bills)) return res.bills;
      return [];
    } catch {
      return [];
    }
  },

  async getAgentReceipts(_agentId: string = AGENT_ID): Promise<AgentReceipt[]> {
    try {
      const res = await agentRequest<any>('/agent/receipts');
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      if (res && Array.isArray(res.receipts)) return res.receipts;
      return [];
    } catch {
      return [];
    }
  },

  async collectAgentPayment(
    input: CollectPaymentInput
  ): Promise<{ payment: CollectionPayment; receipt: AgentReceipt }> {
    return agentRequest<{ payment: CollectionPayment; receipt: AgentReceipt }>(
      '/agent/collect-payment',
      {
        method: 'POST',
        body: JSON.stringify(input)
      }
    );
  },

  async generateAgentReceipt(receiptNumberOrId: string): Promise<AgentReceipt> {
    const receipts = await this.getAgentReceipts();
    const found = receipts.find(
      (r) => r.receiptNumber === receiptNumberOrId || (r as any).id === receiptNumberOrId
    );
    if (!found) {
      throw new Error('Receipt not found. Please try again.');
    }
    return found;
  }
};

export function getAgentCollectionSheet(
  agentId: string,
  filters: AgentCollectionFilters
): Promise<{ items: CollectionSheetItem[] }> {
  return agentApi.getAgentCollectionSheet(agentId, filters).then((items) => ({ items }));
}

export async function getAgentDailyCollectionSummary(date: string = TODAY_KEY): Promise<AgentDailySummary> {
  const summary = await agentApi.getAgentCollectionSummary(date.slice(0, 7));
  return {
    date,
    totalCustomers: summary.pendingCustomersCount + summary.todayCustomersCollected,
    collectedCustomers: summary.todayCustomersCollected,
    pendingCollections: summary.todayPendingCollections,
    overdueCollections: summary.todayOverdueCollections,
    cashCollection: summary.todayCashCollection,
    onlineCollection: summary.todayOnlineCollection,
    totalCollection: summary.todayTotalCollection
  };
}

export function getAgentMonthlyCollectionSummary(month: string = CURRENT_MONTH_KEY): Promise<AgentMonthlySummary> {
  return agentApi.getAgentCollectionSummary(month).then((s) => ({
    month: s.month,
    collected: s.monthlyCollection,
    target: s.monthlyTarget,
    targetAchievedPercent: s.targetAchievedPercent,
    remainingTargetAmount: s.remainingTargetAmount,
    collectedInstallments: s.collectedInstallments,
    pendingInstallments: s.pendingInstallments,
    overdueInstallments: s.overdueInstallments
  }));
}

export function downloadCollectionSheetCsv(items: CollectionSheetItem[], filename = 'collection_sheet.csv') {
  const headers = ['Customer ID', 'Customer Name', 'Phone', 'Address', 'Chit Group', 'Ticket #', 'Due Date', 'Due Amount', 'Paid Amount', 'Pending Balance', 'Status'];
  const rows = items.map((i) => [
    `"${i.customerId}"`,
    `"${i.customerName}"`,
    `"${i.phone}"`,
    `"${(i as any).address || ''}"`,
    `"${i.chitGroupCode}"`,
    `"${i.ticketNumber}"`,
    `"${i.dueDate}"`,
    i.dueInstallmentAmount,
    i.paidAmount,
    i.pendingBalance,
    `"${i.status}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadAgentReceipt(receipt: AgentReceipt) {
  generatePaymentReceiptPDF({
    receiptNumber: receipt.receiptNumber,
    collectedAt: receipt.collectedAt,
    customerName: receipt.customerName,
    customerId: receipt.customerId,
    phone: receipt.phone,
    chitGroupCode: receipt.chitGroupCode,
    ticketNumber: receipt.ticketNumber,
    amountCollected: receipt.amountCollected,
    paymentMethod: receipt.paymentMethod,
    remainingBalance: receipt.remainingBalance,
    agentName: receipt.agentName,
    notes: receipt.notes,
    companyName: 'JIVAN CHIT FUNDS (INDIA) PVT LTD.',
    companyAddress: 'Regd. Office: 123 Main Street, City Branch • Govt Registered Chit Funds',
    companyPhone: '+91-9876543210',
    companyEmail: 'info@chitfund.com'
  });
}