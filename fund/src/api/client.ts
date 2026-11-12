import type {
  User,
  CompanySettings,
  Customer,
  ChitGroup,
  Membership,
  ChitBookingItem,
  Installment,
  Payment,
  PaymentReceipt,
  Auction,
  DividendDistribution,
  PrizePayment,
  Expense,
  NotificationItem,
  AuditLog,
  DashboardStats,
  Route,
  DailyHandover,
  KuzhukkalDraw,
  KuzhukkalContext
} from '../types';

const TOKEN_KEY = 'chitfund_token';
const USER_KEY = 'chitfund_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  const u = localStorage.getItem(USER_KEY);
  if (!u) return null;
  try {
    return JSON.parse(u);
  } catch {
    return null;
  }
}

export function setStoredSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let baseUrl = import.meta.env.VITE_API_URL || '';
  if (!baseUrl && typeof window !== 'undefined' && window.location.pathname.startsWith('/JivanChitFunds')) {
    baseUrl = '/JivanChitFunds';
  }
  const url = `${baseUrl}/api${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401) {
    clearStoredSession();
    window.dispatchEvent(new Event('auth:unauthorized'));
    throw new Error('Session expired. Please log in again.');
  }

  // Handle empty or non-JSON responses (like DELETE 204 No Content) safely
  const text = await response.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    let cleanMessage = text;
    const preMatch = text.match(/<pre>(.*?)<\/pre>/i);
    if (preMatch && preMatch[1]) {
      cleanMessage = preMatch[1].replace(/<[^>]+>/g, '').trim();
    } else if (text.includes('<html') || text.includes('<!DOCTYPE')) {
      cleanMessage = `Request failed (${response.status}: ${response.statusText || 'Error'})`;
    }
    data = { error: cleanMessage || 'An error occurred while processing your request.' };
  }

  if (!response.ok) {
    throw new Error(data.error || 'An error occurred while processing your request.');
  }

  return data;
}

export const api = {
  // Auth
  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    const data = await request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    setStoredSession(data.token, data.user);
    return data;
  },

  async getMe(): Promise<{ user: User }> {
    return request<{ user: User }>('/auth/me');
  },

  async getCurrentUser(): Promise<User> {
    const res = await request<{ user: User }>('/auth/me');
    return res.user;
  },

  logout() {
    clearStoredSession();
  },

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    return request<DashboardStats>('/dashboard/stats');
  },

  async getDashboardSummary(): Promise<DashboardStats> {
    return request<DashboardStats>('/dashboard/stats');
  },

  // Customers
  async getCustomers(query?: string, status?: string, routeId?: string): Promise<Customer[]> {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (status) params.append('status', status);
    if (routeId) params.append('routeId', routeId);
    return request<Customer[]>(`/customers?${params.toString()}`);
  },

  async getCustomerById(id: string): Promise<{
    customer: Customer;
    memberships: Membership[];
    payments: Payment[];
    installments: Installment[];
  }> {
    return request(`/customers/${id}`);
  },

  async createCustomer(customer: Partial<Customer>): Promise<Customer> {
    return request<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(customer)
    });
  },

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    return request<Customer>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  // Chit Groups
  async getChitGroups(status?: string): Promise<ChitGroup[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    return request<ChitGroup[]>(`/chit-groups?${params.toString()}`);
  },

  async getChitGroupById(id: string): Promise<{
    group: ChitGroup;
    members: Membership[];
    auctions: Auction[];
  }> {
    const encodedId = encodeURIComponent(id);
    return request(`/chit-groups?id=${encodedId}`);
  },

  async createChitGroup(group: Partial<ChitGroup>): Promise<ChitGroup> {
    return request<ChitGroup>('/chit-groups', {
      method: 'POST',
      body: JSON.stringify(group)
    });
  },

  async updateChitGroup(id: string, updates: Partial<ChitGroup>): Promise<ChitGroup> {
    const encodedId = encodeURIComponent(id);
    return request<ChitGroup>(`/chit-groups?id=${encodedId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  // Memberships
  async getMemberships(groupId?: string, customerId?: string): Promise<Membership[]> {
    const params = new URLSearchParams();
    if (groupId) params.append('groupId', groupId);
    if (customerId) params.append('customerId', customerId);
    return request<Membership[]>(`/memberships?${params.toString()}`);
  },

  async createMembership(data: {
    customerId: string;
    groupId: string;
    ticketNumber?: number;
    joiningDate?: string;
    isDuplicateAllowed?: boolean;
  }): Promise<Membership> {
    return request<Membership>('/memberships', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Installments
  async getInstallments(filters?: {
    customerId?: string;
    groupId?: string;
    membershipId?: string;
    status?: string;
  }): Promise<Installment[]> {
    const params = new URLSearchParams();
    if (filters?.customerId) params.append('customerId', filters.customerId);
    if (filters?.groupId) params.append('groupId', filters.groupId);
    if (filters?.membershipId) params.append('membershipId', filters.membershipId);
    if (filters?.status) params.append('status', filters.status);
    return request<Installment[]>(`/installments?${params.toString()}`);
  },

  // Payments
  async getPayments(filters?: {
    customerId?: string;
    groupId?: string;
    membershipId?: string;
    status?: string;
  }): Promise<Payment[]> {
    const params = new URLSearchParams();
    if (filters?.customerId) params.append('customerId', filters.customerId);
    if (filters?.groupId) params.append('groupId', filters.groupId);
    if (filters?.membershipId) params.append('membershipId', filters.membershipId);
    if (filters?.status) params.append('status', filters.status);
    return request<Payment[]>(`/payments?${params.toString()}`);
  },

  async recordPayment(data: {
    installmentId: string;
    amountPaid: number;
    paymentMode: string;
    transactionReference?: string;
    paymentDate: string;
    remarks?: string;
  }): Promise<{ payment: Payment; receipt: PaymentReceipt }> {
    return request<{ payment: Payment; receipt: PaymentReceipt }>('/payments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getPaymentReceipt(receiptNumberOrId: string): Promise<{ payment: Payment; receipt: PaymentReceipt }> {
    return request<{ payment: Payment; receipt: PaymentReceipt }>(`/payments/${receiptNumberOrId}`);
  },

  async reversePayment(receiptNumber: string, reason: string): Promise<{ message: string; payment: Payment }> {
    return request<{ message: string; payment: Payment }>(`/payments/${receiptNumber}/reverse`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  },

  // Auctions & Dividends
  async getAuctions(groupId?: string): Promise<Auction[]> {
    const params = new URLSearchParams();
    if (groupId) params.append('groupId', groupId);
    return request<Auction[]>(`/auctions?${params.toString()}`);
  },

  async calculateAuction(data: {
    chitValue: number;
    bidDiscountAmount: number;
    numMembers: number;
    commissionPercent?: number;
  }): Promise<{
    chitValue: number;
    bidDiscountAmount: number;
    prizeAmount: number;
    foremanCommission: number;
    distributableDividend: number;
    numMembers: number;
    dividendPerMember: number;
  }> {
    return request('/auctions/calculate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async recordAuction(data: {
    groupId: string;
    auctionNumber: number;
    auctionDate: string;
    bidDiscountAmount: number;
    winnerMembershipId: string;
    commissionPercent?: number;
    applyDividendToNextMonth?: boolean;
    remarks?: string;
  }): Promise<{ auction: Auction; dividend: DividendDistribution; prizePayment: PrizePayment }> {
    return request('/auctions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getDividends(groupId?: string): Promise<DividendDistribution[]> {
    const params = new URLSearchParams();
    if (groupId) params.append('groupId', groupId);
    return request<DividendDistribution[]>(`/dividends?${params.toString()}`);
  },

  // Kuzhukkal (Lucky Draw / Draw of Lots)
  async getKuzhukkalDraws(groupId?: string): Promise<KuzhukkalDraw[]> {
    const params = new URLSearchParams();
    if (groupId && groupId !== 'all') params.append('groupId', groupId);
    return request<KuzhukkalDraw[]>(`/kuzhukkal/draws?${params.toString()}`);
  },

  async getEligibleKuzhukkalMembers(groupId: string): Promise<(Membership & { customerName?: string; customerMobile?: string })[]> {
    return request<(Membership & { customerName?: string; customerMobile?: string })[]>(`/kuzhukkal/eligible?groupId=${encodeURIComponent(groupId)}`);
  },

  async getKuzhukkalContext(groupId: string): Promise<KuzhukkalContext> {
    return request<KuzhukkalContext>(`/kuzhukkal/context?groupId=${encodeURIComponent(groupId)}`);
  },

  async selectDigitalKuzhukkalWinner(groupId: string): Promise<{
    selectedWinner: Membership & { customerName?: string; customerMobile?: string };
    eligibleCount: number;
    selectionTimestamp: string;
  }> {
    return request('/kuzhukkal/digital-select', {
      method: 'POST',
      body: JSON.stringify({ groupId })
    });
  },

  async recordKuzhukkalDraw(data: {
    groupId: string;
    drawSequence: number;
    drawMethod: 'physical' | 'digital';
    winnerMembershipId: string;
    drawDate?: string;
    prizeTitle?: string;
    prizeAmount?: number;
    remarks?: string;
  }): Promise<KuzhukkalDraw> {
    return request('/kuzhukkal/draws', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async cancelKuzhukkalDraw(drawId: string): Promise<KuzhukkalDraw> {
    return request(`/kuzhukkal/draws/${encodeURIComponent(drawId)}/cancel`, {
      method: 'POST'
    });
  },

  // Prize Payments
  async getPrizePayments(status?: string): Promise<PrizePayment[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    return request<PrizePayment[]>(`/prize-payments?${params.toString()}`);
  },

  async disbursePrize(
    prizePaymentId: string,
    data: {
      amountToDisburse: number;
      disbursalDate: string;
      paymentMode: string;
      transactionReference?: string;
      remarks?: string;
    }
  ): Promise<PrizePayment> {
    return request<PrizePayment>(`/prize-payments/${prizePaymentId}/disburse`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // Expenses
  async getExpenses(category?: string, startDate?: string, endDate?: string): Promise<Expense[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return request<Expense[]>(`/expenses?${params.toString()}`);
  },

  async createExpense(expense: Partial<Expense>): Promise<Expense> {
    return request<Expense>('/expenses', {
      method: 'POST',
      body: JSON.stringify(expense)
    });
  },

  async deleteExpense(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/expenses/${id}`, {
      method: 'DELETE'
    });
  },

  // Reports
  async getCollectionReport(filters: {
    startDate?: string;
    endDate?: string;
    paymentMode?: string;
    groupId?: string;
  }): Promise<{
    totalCount: number;
    totalCollected: number;
    byMode: Record<string, number>;
    payments: Payment[];
  }> {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.paymentMode) params.append('paymentMode', filters.paymentMode);
    if (filters.groupId) params.append('groupId', filters.groupId);
    return request(`/reports/collections?${params.toString()}`);
  },

  async getOutstandingReport(groupId?: string): Promise<{
    totalOutstanding: number;
    pendingCount: number;
    overdueCount: number;
    records: Installment[];
  }> {
    const params = new URLSearchParams();
    if (groupId) params.append('groupId', groupId);
    return request(`/reports/outstanding?${params.toString()}`);
  },

  async getChitGroupsReport(): Promise<(ChitGroup & { totalExpected: number; totalCollected: number; totalPending: number })[]> {
    return request('/reports/chit-groups');
  },

  async getChitBookingList(): Promise<ChitBookingItem[]> {
    return request('/reports/chit-booking-list');
  },

  async getGroupPerformanceReport(): Promise<{ groups: (ChitGroup & { expectedCollection: number; actualCollection: number; outstandingBalance: number; collectionEfficiency: number })[] }> {
    const grps = await request<(ChitGroup & { totalExpected: number; totalCollected: number; totalPending: number })[]>('/reports/chit-groups');
    return {
      groups: grps.map((g) => ({
        ...g,
        expectedCollection: g.totalExpected || (g.chitValue || 0),
        actualCollection: g.totalCollected || 0,
        outstandingBalance: g.totalPending || 0,
        collectionEfficiency: (g.totalExpected && g.totalExpected > 0) ? Math.round(((g.totalCollected || 0) / g.totalExpected) * 100) : 0
      }))
    };
  },

  async getAuctionsReport(groupId?: string): Promise<{
    auctions: Auction[];
    totalPrizeDisbursed: number;
    totalForemanCommission: number;
    totalDividendDistributed: number;
  }> {
    const params = new URLSearchParams();
    if (groupId) params.append('groupId', groupId);
    return request(`/reports/auctions?${params.toString()}`);
  },

  // New Collection Modules
  async getDailyCollection(date?: string): Promise<any> {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    return request(`/collections/daily?${params.toString()}`);
  },

  async getMonthlyCollection(
    month?: string,
    agentId?: string,
    groupId?: string,
    customerId?: string,
    paymentMode?: string,
    startDate?: string,
    endDate?: string,
    status?: string
  ): Promise<any> {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (agentId && agentId !== 'ALL') params.append('agentId', agentId);
    if (groupId && groupId !== 'ALL') params.append('groupId', groupId);
    if (customerId && customerId !== 'ALL') params.append('customerId', customerId);
    if (paymentMode && paymentMode !== 'ALL') params.append('paymentMode', paymentMode);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (status && status !== 'ALL') params.append('status', status);
    return request(`/collections/monthly?${params.toString()}`);
  },

  async getAgents(search?: string, status?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (search) params.append('q', search);
    if (status) params.append('status', status);
    return request<any[]>(`/agents?${params.toString()}`);
  },

  async getSubscriberStatement(customerId: string, groupId?: string): Promise<any> {
    const params = new URLSearchParams();
    if (groupId && groupId !== 'ALL') params.append('groupId', groupId);
    return request(`/subscribers/${customerId}/statement?${params.toString()}`);
  },

  async getBalanceSheet(params?: {
    filter?: string;
    search?: string;
    groupId?: string;
    customerId?: string;
  }): Promise<any> {
    const q = new URLSearchParams();
    if (params?.filter) q.append('filter', params.filter);
    if (params?.search) q.append('search', params.search);
    if (params?.groupId && params.groupId !== 'ALL') q.append('groupId', params.groupId);
    if (params?.customerId && params.customerId !== 'ALL') q.append('customerId', params.customerId);
    const qs = q.toString();
    return request(`/collections/balance-sheet${qs ? `?${qs}` : ''}`);
  },

  async getArrearsReport(params?: {
    asOnDate?: string;
    agentId?: string;
    groupId?: string;
    search?: string;
  }): Promise<{
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
  }> {
    const q = new URLSearchParams();
    if (params?.asOnDate) q.append('asOnDate', params.asOnDate);
    if (params?.agentId && params.agentId !== 'ALL') q.append('agentId', params.agentId);
    if (params?.groupId && params.groupId !== 'ALL') q.append('groupId', params.groupId);
    if (params?.search) q.append('search', params.search);
    const qs = q.toString();
    return request(`/reports/arrears${qs ? `?${qs}` : ''}`);
  },

  // Search & Notifications
  async search(query: string) {
    return request<{
      customers: Customer[];
      groups: ChitGroup[];
      memberships: Membership[];
      payments: Payment[];
    }>(`/search?q=${encodeURIComponent(query)}`);
  },

  async getNotifications(): Promise<NotificationItem[]> {
    return request<NotificationItem[]>('/notifications');
  },

  async markNotificationRead(id: string | number): Promise<NotificationItem> {
    return request<NotificationItem>(`/notifications/${id}/read`, {
      method: 'PUT'
    });
  },

  // Audit Logs & Users
  async getAuditLogs(): Promise<AuditLog[]> {
    return request<AuditLog[]>('/audit-logs');
  },

  async getUsers(): Promise<User[]> {
    return request<User[]>('/users');
  },

  async createUser(user: { username: string; password: string; fullName: string; email: string; role: string }): Promise<User> {
    return request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(user)
    });
  },

  async updateUser(id: number | string, updates: Partial<User & { password?: string }>): Promise<User> {
    return request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deleteUser(id: number | string): Promise<{ message: string }> {
    return request<{ message: string }>(`/users/${id}`, {
      method: 'DELETE'
    });
  },

  async deleteCustomer(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/customers/${id}`, {
      method: 'DELETE'
    });
  },

  async deleteChitGroup(id: string): Promise<{ message: string }> {
    const encodedId = encodeURIComponent(id);
    return request<{ message: string }>(`/chit-groups?id=${encodedId}`, {
      method: 'DELETE',
      body: JSON.stringify({ id })
    });
  },

  async updateMembership(id: string, updates: any): Promise<{ message: string }> {
    return request<{ message: string }>(`/memberships/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deleteMembership(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/memberships/${id}`, {
      method: 'DELETE'
    });
  },

  async updateInstallment(id: string, updates: any): Promise<{ message: string }> {
    return request<{ message: string }>(`/installments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deleteInstallment(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/installments/${id}`, {
      method: 'DELETE'
    });
  },

  async updatePayment(id: string, updates: any): Promise<{ message: string }> {
    return request<{ message: string }>(`/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deletePayment(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/payments/${id}`, {
      method: 'DELETE'
    });
  },

  async updateAuction(id: string, updates: any): Promise<{ message: string }> {
    return request<{ message: string }>(`/auctions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deleteAuction(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/auctions/${id}`, {
      method: 'DELETE'
    });
  },

  async updateDividend(id: string, updates: any): Promise<{ message: string }> {
    return request<{ message: string }>(`/dividends/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deleteDividend(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/dividends/${id}`, {
      method: 'DELETE'
    });
  },

  async updatePrizePayment(id: string, updates: any): Promise<{ message: string }> {
    return request<{ message: string }>(`/prize-payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deletePrizePayment(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/prize-payments/${id}`, {
      method: 'DELETE'
    });
  },

  async updateExpense(id: string, updates: any): Promise<{ message: string }> {
    return request<{ message: string }>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async updateAuditLog(id: number | string, updates: any): Promise<{ message: string }> {
    return request<{ message: string }>(`/audit-logs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deleteAuditLog(id: number | string): Promise<{ message: string }> {
    return request<{ message: string }>(`/audit-logs/${id}`, {
      method: 'DELETE'
    });
  },

  // Settings & Backups
  async getSettings(): Promise<CompanySettings> {
    return request<CompanySettings>('/settings');
  },

  async updateSettings(settings: Partial<CompanySettings>): Promise<CompanySettings> {
    return request<CompanySettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  },

  async resetDemoData(): Promise<{ message: string }> {
    return request<{ message: string }>('/backup/reset-demo', {
      method: 'POST'
    });
  },

  // Routes (Collection Management)
  async getRoutes(query?: string, status?: string): Promise<Route[]> {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (status) params.append('status', status);
    return request<Route[]>(`/routes?${params.toString()}`);
  },

  async getRoute(id: string | number): Promise<Route> {
    return request<Route>(`/routes/${id}`);
  },

  async getRouteCustomers(id: string | number): Promise<Customer[]> {
    return request<Customer[]>(`/routes/${id}/customers`);
  },

  async createRoute(route: Partial<Route>): Promise<Route> {
    return request<Route>('/routes', {
      method: 'POST',
      body: JSON.stringify(route)
    });
  },

  async updateRoute(id: string | number, updates: Partial<Route>): Promise<Route> {
    return request<Route>(`/routes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deleteRoute(id: string | number): Promise<{ message: string }> {
    return request<{ message: string }>(`/routes/${id}`, {
      method: 'DELETE'
    });
  },

  // Daily Handovers
  async getDailyHandovers(filters?: { agentUserId?: number | string; status?: string; date?: string }): Promise<DailyHandover[]> {
    const params = new URLSearchParams();
    if (filters?.agentUserId) params.append('agentUserId', String(filters.agentUserId));
    if (filters?.status) params.append('status', filters.status);
    if (filters?.date) params.append('date', filters.date);
    return request<DailyHandover[]>(`/handovers?${params.toString()}`);
  },

  async createDailyHandover(data: Partial<DailyHandover>): Promise<DailyHandover> {
    return request<DailyHandover>('/handovers', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async verifyDailyHandover(id: string | number, status: 'verified' | 'rejected', notes?: string): Promise<DailyHandover> {
    return request<DailyHandover>(`/handovers/${id}/verify`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes })
    });
  }
};