export type AgentUserRole = 'agent' | 'staff' | 'admin';

export type AgentTab = 'dashboard' | 'collection-sheet' | 'due-bills' | 'receipts';

export type CollectionStatus = 'paid' | 'pending' | 'overdue';

export type PaymentMethod = 'cash' | 'online';

export interface AgentProfile {
  id: string;
  name: string;
  phone: string;
  area: string;
  assignedCustomers: number;
}

export interface AgentCollectionSummary {
  todayCashCollection: number;
  todayOnlineCollection: number;
  todayTotalCollection: number;
  todayCustomersCollected: number;
  todayPendingCollections: number;
  todayOverdueCollections: number;
  monthlyCollection: number;
  monthlyTarget: number;
  pendingBalance: number;
  pendingCustomersCount: number;
  commissionEarned: number;
  commissionRate: number;
  collectedInstallments: number;
  pendingInstallments: number;
  overdueInstallments: number;
  remainingTargetAmount: number;
  targetAchievedPercent: number;
  month: string;
}

export interface AgentMonthlyTrendPoint {
  month: string;
  label: string;
  collected: number;
  target: number;
}

export interface AgentCustomer {
  id: string;
  name: string;
  phone: string;
  chitGroupCode: string;
  ticketNumber: string;
  assignedAgentId: string;
  totalDueAmount: number;
  totalPaidAmount: number;
  outstandingBalance: number;
}

export interface CollectionSheetItem {
  id: string;
  customerId: string;
  customerName: string;
  phone: string;
  address?: string;
  city?: string;
  googleMapLink?: string;
  chitGroupCode: string;
  ticketNumber: string;
  dueDate: string;
  dueInstallmentAmount: number;
  paidAmount: number;
  pendingBalance: number;
  status: CollectionStatus;
  currentInstallment: number;
}

export interface AgentDueBill {
  id: string;
  customerId: string;
  customerName: string;
  phone: string;
  chitGroupCode: string;
  ticketNumber: string;
  currentInstallment: number;
  dueAmount: number;
  paidAmount: number;
  outstandingBalance: number;
  arrears: number;
  dueDate: string;
  status: CollectionStatus;
}

export interface CollectionPayment {
  id: string;
  customerId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  collectedAt: string;
  receiptNumber: string;
  notes?: string;
}

export interface CollectPaymentInput {
  customerId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface AgentReceipt {
  receiptNumber: string;
  customerId: string;
  customerName: string;
  phone: string;
  chitGroupCode: string;
  ticketNumber: string;
  amountCollected: number;
  paymentMethod: PaymentMethod;
  collectedAt: string;
  agentName: string;
  remainingBalance: number;
  notes?: string;
}

export interface AgentCollectionFilters {
  dateType: 'today' | 'custom';
  customDate: string;
  status: 'all' | CollectionStatus;
  search: string;
}

export type PayableCustomer = {
  customerId: string;
  customerName: string;
  phone: string;
  chitGroupCode: string;
  ticketNumber: string;
  dueDate: string;
  dueAmount: number;
  outstandingBalance: number;
};

export interface AgentDailySummary {
  date: string;
  totalCustomers: number;
  collectedCustomers: number;
  pendingCollections: number;
  overdueCollections: number;
  cashCollection: number;
  onlineCollection: number;
  totalCollection: number;
}

export interface AgentMonthlySummary {
  month: string;
  collected: number;
  target: number;
  targetAchievedPercent: number;
  remainingTargetAmount: number;
  collectedInstallments: number;
  pendingInstallments: number;
  overdueInstallments: number;
}

export interface CollectPaymentResult {
  payment: CollectionPayment;
  receipt: AgentReceipt;
}