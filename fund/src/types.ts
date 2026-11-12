 export type UserRole = 'admin' | 'staff' | 'agent';

export interface User {
  id: number;
  userId?: number | string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
  assignedRouteId?: string;
  assignedRouteName?: string;
  lastLogin?: string;
  lastLoginAt?: string;
  createdAt: string;
}

export interface CompanySettings {
  id?: number;
  companyName: string;
  registrationNumber?: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  currencySymbol: string;
  financialYear?: string;
  defaultCommissionPercent?: number;
  defaultForemanCommissionPercent?: number;
  receiptPrefix?: string;
  customerIdPrefix?: string;
  membershipIdPrefix?: string;
  updatedAt?: string;
}

export type IdProofType = 'Aadhaar' | 'PAN' | 'Voter ID' | 'Passport' | 'Driving License';
export type CustomerStatus = 'active' | 'inactive';
export type Gender = 'Male' | 'Female' | 'Other';

export interface Customer {
  id: number;
  customerId: string;
  fullName: string;
  mobileNumber: string;
  alternateMobile?: string;
  email?: string;
  dob?: string;
  gender: Gender;
  address: string;
  city: string;
  pincode: string;
  idProofType: IdProofType;
  idProofNumber: string;
  nomineeName: string;
  nomineeRelationship: string;
  nomineeMobile: string;
  status: CustomerStatus;
  googleMapLink?: string;
  coApplicantName?: string;
  coApplicantMobile?: string;
  coApplicantAddress?: string;
  coApplicantMapLink?: string;
  security1Name?: string;
  security1Mobile?: string;
  security1Address?: string;
  security1MapLink?: string;
  security1Photo?: string;
  security2Name?: string;
  security2Mobile?: string;
  security2Address?: string;
  security2MapLink?: string;
  security2Photo?: string;
  joiningDate?: string;
  remarks?: string;
  totalMemberships?: number;
  totalChitValue?: number;
  totalPaid?: number;
  totalPending?: number;
  routeId?: string;
  routeName?: string;
  assignedAgentId?: number;
  assignedAgentName?: string;
  createdAt: string;
  updatedAt: string;
}

export type ChitGroupStatus = 'Upcoming' | 'Active' | 'Completed' | 'Cancelled';

export interface ChitGroup {
  id: number;
  groupId: string;
  groupName: string;
  groupCode?: string;
  batchNumber?: string;
  chitValue: number;
  chitValueLakhs?: number;
  numMembers: number;
  monthlyInstallment: number;
  durationMonths: number;
  startDate: string;
  endDate: string;
  auctionDayOfMonth: number;
  auctionFrequency: string;
  foremanCommissionPercent: number;
  status: ChitGroupStatus;
  description?: string;
  currentMembersCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type MembershipStatus = 'active' | 'prized' | 'completed' | 'cancelled';

export interface Membership {
  id: number;
  membershipId: string;
  customerId: string;
  customerName?: string;
  customerMobile?: string;
  groupId: string;
  groupName?: string;
  groupCode?: string;
  batchNumber?: string;
  formattedGroupNo?: string;
  chitValue?: number;
  chitValueLakhs?: number;
  durationMonths?: number;
  ticketNumber: number;
  joiningDate: string;
  installmentAmount: number;
  totalInstallments: number;
  paidInstallments: number;
  pendingInstallments: number;
  totalPaid: number;
  totalPending: number;
  status: MembershipStatus;
  isDuplicateAllowed?: boolean;
  isPrized?: boolean;
  prizedAuctionNumber?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChitBookingItem {
  sNo: number;
  newGroupNo: string;
  name: string;
  phoneNumber: string;
  chitValue: number;
  fullChitValue?: number;
  month: number;
  customerId: string;
  groupId: string;
  membershipId: string;
  ticketNumber?: number;
  groupName?: string;
  joiningDate?: string;
  groupingDate?: string;
  installmentAmount?: number;
  paidInstallments?: number;
  pendingInstallments?: number;
  totalPaid?: number;
  totalPending?: number;
  status?: string;
}

export type InstallmentStatus = 'Pending' | 'Partially Paid' | 'Paid' | 'Overdue';
export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Other';

export interface Installment {
  id: number;
  installmentId: string;
  membershipId: string;
  customerId: string;
  customerName?: string;
  groupId: string;
  groupName?: string;
  ticketNumber?: number;
  monthNumber: number;
  dueDate: string;
  installmentAmount: number;
  dividendDeduction: number;
  netDueAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentDate?: string;
  paymentMode?: PaymentMode;
  receiptNumber?: string;
  status: InstallmentStatus;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = 'active' | 'reversed' | 'cancelled';

export interface Payment {
  id: number;
  receiptNumber: string;
  installmentId: string;
  membershipId: string;
  customerId: string;
  customerName?: string;
  groupId: string;
  groupName?: string;
  ticketNumber?: number;
  monthNumber?: number;
  amountPaid: number;
  previousBalance: number;
  remainingBalance: number;
  paymentMode: PaymentMode;
  transactionReference?: string;
  paymentDate: string;
  collectedByUserId: number;
  collectedByName?: string;
  status: PaymentStatus;
  reversalReason?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentReceipt {
  receiptNumber: string;
  paymentDate: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  currencySymbol: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  groupId: string;
  groupName: string;
  membershipId: string;
  ticketNumber: number;
  monthNumber: number;
  installmentAmount: number;
  dividendDeduction: number;
  netDueAmount: number;
  amountPaid: number;
  previousBalance: number;
  remainingBalance: number;
  paymentMode: PaymentMode;
  transactionReference?: string;
  collectedByName: string;
  remarks?: string;
}

export type AuctionStatus = 'Scheduled' | 'Completed' | 'Cancelled';

export interface Auction {
  id: number;
  auctionId: string;
  groupId: string;
  groupName?: string;
  auctionNumber: number;
  auctionDate: string;
  chitValue: number;
  bidDiscountAmount: number;
  prizeAmount: number;
  foremanCommission: number;
  dividendAmount: number;
  dividendPerMember: number;
  winnerMembershipId: string;
  winnerCustomerId: string;
  winnerCustomerName?: string;
  ticketNumber: number;
  winnerTicketNumber?: number;
  status: AuctionStatus;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DividendDistribution {
  id: number;
  dividendId: string;
  auctionId: string;
  groupId: string;
  groupName?: string;
  totalDiscount: number;
  foremanCommission: number;
  distributableDividend: number;
  numEligibleMembers: number;
  dividendPerMember: number;
  monthNumber: number;
  status: 'Pending Review' | 'Confirmed' | 'Distributed';
  confirmedByUserId: number;
  createdAt: string;
}

export type PrizePaymentStatus = 'Pending' | 'Partially Paid' | 'Paid';

export interface PrizePayment {
  id: number;
  prizePaymentId: string;
  auctionId: string;
  groupId: string;
  groupName?: string;
  winnerCustomerId: string;
  winnerCustomerName?: string;
  winnerMembershipId: string;
  ticketNumber: number;
  auctionNumber: number;
  chitValue: number;
  discountAmount: number;
  prizeAmount: number;
  paidAmount: number;
  remainingAmount: number;
  disbursalDate?: string;
  paymentStatus: PrizePaymentStatus;
  paymentMode?: PaymentMode;
  transactionReference?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export type ExpenseCategory =
  | 'Office Expense'
  | 'Salary'
  | 'Rent'
  | 'Travel'
  | 'Marketing'
  | 'Bank Charges'
  | 'Other';

export interface Expense {
  id: number;
  expenseId: string;
  expenseDate: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  remarks?: string;
  createdByUserId: number;
  createdByName?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: number;
  notificationId: string;
  type: 'upcoming_installment' | 'overdue_installment' | 'upcoming_auction' | 'pending_prize_payment' | 'general';
  title: string;
  message: string;
  relatedId?: string;
  dueDate?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: number;
  logId?: string;
  userId: number;
  username: string;
  action: string;
  module: string;
  recordId: string;
  entityType?: string;
  entityId?: string;
  details?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  timestamp: string;
}

export interface DashboardStats {
  totalCustomers: number;
  activeChitGroups: number;
  totalChitValue: number;
  monthlyCollectionExpected: number;
  totalCollectedAmount: number;
  pendingAmount: number;
  upcomingAuctionsCount: number;
  recentPayments: Payment[];
  recentCustomers: Customer[];
  monthlyCollectionTrend: { month: string; collected: number; target: number }[];
  pendingCollectionByGroup: { groupName: string; pending: number; collected: number }[];
  groupPerformance: { groupName: string; membersCount: number; totalValue: number; completionRate: number }[];
}

export interface Route {
  id: number;
  routeId: string;
  code?: string;
  routeName: string;
  name?: string;
  city: string;
  area: string;
  subLocalities?: string | null;
  assignedAgentId?: number | null;
  assignedAgentName?: string | null;
  assignedAgentUsername?: string | null;
  status: 'active' | 'inactive';
  customerCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DailyHandover {
  id: number;
  handoverId: string;
  agentUserId: number;
  agentName?: string;
  handoverDate: string;
  totalCash: number;
  totalOnline: number;
  receiptsCount: number;
  declaredCash: number;
  discrepancy: number;
  commissionAmount: number;
  status: 'submitted' | 'verified' | 'rejected';
  verifiedByUserId?: number | null;
  verifiedByName?: string | null;
  verifiedAt?: string | null;
  notes?: string | null;
  remarks?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export type KuzhukkalDrawMethod = 'physical' | 'digital';
export type KuzhukkalDrawStatus = 'Draft' | 'Confirmed' | 'Cancelled';

export interface KuzhukkalDraw {
  id: number;
  drawId: string;
  groupId: string;
  groupName?: string;
  drawSequence: number;
  drawDate: string;
  drawMethod: KuzhukkalDrawMethod;
  winnerMembershipId: string;
  winnerCustomerId: string;
  winnerCustomerName?: string;
  winnerCustomerMobile?: string;
  ticketNumber: number;
  prizeTitle?: string;
  prizeAmount: number;
  status: KuzhukkalDrawStatus;
  conductedByUserId: number;
  conductedByName?: string;
  confirmedByUserId: number;
  confirmedByName?: string;
  confirmedAt: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KuzhukkalContext {
  groupId: string;
  groupName: string;
  chitValue: number;
  numMembers: number;
  durationMonths: number;
  currentDrawSequence: number;
  totalMembersCount: number;
  eligibleMembersCount: number;
  previousWinnersCount: number;
  previousWinners: KuzhukkalDraw[];
  eligibleMembers: (Membership & { customerName?: string; customerMobile?: string })[];
}

