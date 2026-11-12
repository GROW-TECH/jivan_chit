// ============================================================
// server/api.ts  —  Express API Router (fully async MySQL)
// ============================================================
import { Router } from 'express';
import { db, round2 } from './db';
import { requireAuth, requireAdmin, createToken, type AuthenticatedRequest } from './auth';

export const apiRouter = Router();

// ============================================================
// AUTH
// ============================================================
import crypto from 'crypto';

apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Username and password are required' });

    const user = await db.getUserByUsername(username);
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });

    const sha256Hash = crypto.createHash('sha256').update(password).digest('hex');

    let valid = user.passwordHash === sha256Hash;
    if (!valid && user.passwordHash.startsWith('$2')) {
      const bcrypt = await import('bcryptjs').catch(() => null);
      if (bcrypt) valid = await bcrypt.compare(password, user.passwordHash.replace('$2y$', '$2b$'));
    }

    if (!valid) return res.status(401).json({ error: 'Invalid username or password' });
    if (user.status !== 'active') return res.status(403).json({ error: 'Account deactivated. Contact administrator.' });

    try { await db.updateLastLogin(user.id); } catch (e) {}
    try { await db.logAudit(user.id, user.username, 'USER_LOGIN', 'AUTH', String(user.id), null, { ip: req.ip }); } catch (e) {}

    const { passwordHash: _, ...safeUser } = user as any;
    const token = createToken(safeUser);
    res.json({ message: 'Login successful', token, user: safeUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error during login' });
  }
});

apiRouter.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

// ============================================================
// DASHBOARD
// ============================================================
apiRouter.get('/dashboard/stats', requireAuth, async (_req, res) => {
  try {
    res.json(await db.getDashboardStats());
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// CUSTOMERS
// ============================================================
apiRouter.get('/customers', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { q, status, routeId } = req.query;
    const agentUserId = req.user?.role === 'agent' ? req.user.id : undefined;
    res.json(await db.getCustomers(q as string, status as string, routeId as string, agentUserId));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/customers/:id', requireAuth, async (req, res) => {
  try {
    const customer = await db.getCustomerById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    const [memberships, payments, installments] = await Promise.all([
      db.getMemberships(undefined, customer.customerId),
      db.getPayments({ customerId: customer.customerId }),
      db.getInstallments({ customerId: customer.customerId }),
    ]);
    res.json({ customer, memberships, payments, installments });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/customers', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { fullName, mobileNumber } = req.body;
    if (!fullName || !mobileNumber)
      return res.status(400).json({ error: 'Please provide all required customer fields.' });
    res.status(201).json(await db.createCustomer(req.body, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.put('/customers/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    res.json(await db.updateCustomer(req.params.id, req.body, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.delete('/customers/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    res.json(await db.deleteCustomer(req.params.id, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ============================================================
// CHIT GROUPS
// ============================================================
// Helper to resolve group ID whether sent in URL param (encoded/unencoded with slashes), query, or body
function resolveGroupId(req: any): string {
  const raw = req.params?.id || req.params?.[0] || req.query?.id || req.query?.groupId || req.body?.id || req.body?.groupId || '';
  try {
    return decodeURIComponent(String(raw)).trim();
  } catch {
    return String(raw).trim();
  }
}

apiRouter.get('/chit-groups', requireAuth, async (req, res) => {
  try {
    if (req.query.id) {
      const id = resolveGroupId(req);
      const group = await db.getChitGroupById(id);
      if (!group) return res.status(404).json({ error: 'Chit group not found' });
      const [members, auctions] = await Promise.all([
        db.getMemberships(group.groupId),
        db.getAuctions(group.groupId),
      ]);
      return res.json({ group, members, auctions });
    }
    res.json(await db.getChitGroups(req.query.status as string));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/chit-groups/:id(.+)', requireAuth, async (req, res) => {
  try {
    const id = resolveGroupId(req);
    const group = await db.getChitGroupById(id);
    if (!group) return res.status(404).json({ error: 'Chit group not found' });
    const [members, auctions] = await Promise.all([
      db.getMemberships(group.groupId),
      db.getAuctions(group.groupId),
    ]);
    res.json({ group, members, auctions });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/chit-groups', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { groupId, groupName, chitValue, numMembers, durationMonths, startDate } = req.body;
    if (!groupId || !groupName || !chitValue || !numMembers || !durationMonths || !startDate)
      return res.status(400).json({ error: 'Missing required chit group details' });
    const data = {
      ...req.body,
      groupId: req.body.groupId?.trim().toUpperCase(),
      chitValue: Number(req.body.chitValue),
      numMembers: Number(req.body.numMembers),
      durationMonths: Number(req.body.durationMonths),
      auctionDayOfMonth: Number(req.body.auctionDayOfMonth) || 10,
      foremanCommissionPercent: Number(req.body.foremanCommissionPercent) || 5.0,
    };
    res.status(201).json(await db.createChitGroup(data, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.put(['/chit-groups', '/chit-groups/:id(.+)'], requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const id = resolveGroupId(req);
    res.json(await db.updateChitGroup(id, req.body, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.delete(['/chit-groups', '/chit-groups/:id(.+)'], requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const id = resolveGroupId(req);
    if (!id) return res.status(400).json({ error: 'Group ID is required to delete chit group' });
    res.json(await db.deleteChitGroup(id, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ============================================================
// MEMBERSHIPS
// ============================================================
apiRouter.get('/memberships', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { groupId, customerId } = req.query;
    const filterAgentId = req.user?.role === 'agent' ? req.user.id : undefined;
    res.json(await db.getMemberships(groupId as string, customerId as string, filterAgentId));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/memberships', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { customerId, groupId } = req.body;
    if (!customerId || !groupId)
      return res.status(400).json({ error: 'Customer ID and Chit Group ID are required' });
    res.status(201).json(await db.createMembership(req.body, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.put('/memberships/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    res.json(await db.updateMembership(req.params.id, req.body, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.delete('/memberships/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    res.json(await db.deleteMembership(req.params.id, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ============================================================
// INSTALLMENTS
// ============================================================
apiRouter.get('/installments', requireAuth, async (req, res) => {
  try {
    const { customerId, groupId, membershipId, status } = req.query;
    res.json(await db.getInstallments({ customerId: customerId as string, groupId: groupId as string, membershipId: membershipId as string, status: status as string }));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/installments/:id', requireAuth, async (req, res) => {
  try {
    const inst = await db.getInstallmentById(req.params.id);
    if (!inst) return res.status(404).json({ error: 'Installment not found' });
    res.json(inst);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.put('/installments/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.user?.role === 'agent') {
      return res.status(403).json({ error: 'Access denied: Agents cannot edit installments directly.' });
    }
    res.json(await db.updateInstallment(req.params.id, req.body, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.delete('/installments/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.user?.role === 'agent') {
      return res.status(403).json({ error: 'Access denied: Agents cannot delete installments directly.' });
    }
    res.json(await db.deleteInstallment(req.params.id, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ============================================================
// PAYMENTS
// ============================================================
apiRouter.get('/payments', requireAuth, async (req, res) => {
  try {
    const { customerId, groupId, membershipId, status } = req.query;
    res.json(await db.getPayments({ customerId: customerId as string, groupId: groupId as string, membershipId: membershipId as string, status: status as string }));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/payments', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { installmentId, amountPaid, paymentMode, paymentDate } = req.body;
    if (!installmentId || !amountPaid || !paymentMode || !paymentDate)
      return res.status(400).json({ error: 'Installment ID, amount, payment mode, and date are required' });
    const result = await db.recordPayment({ ...req.body, amountPaid: Number(amountPaid) }, req.user!);
    res.status(201).json(result);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.put('/payments/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    res.json(await db.updatePayment(req.params.id, req.body, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.delete('/payments/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    res.json(await db.deletePayment(req.params.id, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.get('/payments/:id', requireAuth, async (req, res) => {
  try {
    const payment = await db.getPaymentById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    const [settings, installment] = await Promise.all([db.getSettings(), db.getInstallmentById(payment.installmentId)]);
    const receipt = {
      receiptNumber: payment.receiptNumber, paymentDate: payment.paymentDate,
      companyName: settings.companyName, companyAddress: settings.address,
      companyPhone: settings.phone, companyEmail: settings.email,
      currencySymbol: settings.currencySymbol,
      customerId: payment.customerId, customerName: payment.customerName || '',
      customerMobile: '', groupId: payment.groupId, groupName: payment.groupName || '',
      membershipId: payment.membershipId, ticketNumber: payment.ticketNumber || 0,
      monthNumber: payment.monthNumber || 1,
      installmentAmount: installment?.installmentAmount || payment.amountPaid,
      dividendDeduction: installment?.dividendDeduction || 0,
      netDueAmount: installment?.netDueAmount || payment.amountPaid,
      amountPaid: payment.amountPaid, previousBalance: payment.previousBalance,
      remainingBalance: payment.remainingBalance, paymentMode: payment.paymentMode,
      transactionReference: payment.transactionReference,
      collectedByName: payment.collectedByName || 'Authorized Staff',
      remarks: payment.remarks,
    };
    res.json({ payment, receipt });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/payments/:id/reverse', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ error: 'Reversal reason is required' });
    const result = await db.reversePayment(req.params.id, reason.trim(), req.user!);
    res.json({ ...result, message: 'Payment successfully reversed' });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ============================================================
// AUCTIONS & DIVIDENDS
// ============================================================
apiRouter.get('/auctions', requireAuth, async (req, res) => {
  try {
    res.json(await db.getAuctions(req.query.groupId as string));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/auctions/calculate', requireAuth, async (req, res) => {
  try {
    const { chitValue, bidDiscountAmount, numMembers, commissionPercent } = req.body;
    if (!chitValue || !bidDiscountAmount || !numMembers)
      return res.status(400).json({ error: 'Chit value, bid discount amount, and members count are required' });
    res.json(await db.calculateAuction({ chitValue: Number(chitValue), bidDiscountAmount: Number(bidDiscountAmount), numMembers: Number(numMembers), commissionPercent: commissionPercent ? Number(commissionPercent) : 5.0 }));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.post('/auctions', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { groupId, auctionNumber, auctionDate, bidDiscountAmount, winnerMembershipId } = req.body;
    if (!groupId || !auctionNumber || !auctionDate || !bidDiscountAmount || !winnerMembershipId)
      return res.status(400).json({ error: 'Missing required auction fields' });
    const result = await db.recordAuction({ ...req.body, auctionNumber: Number(auctionNumber), bidDiscountAmount: Number(bidDiscountAmount) }, req.user!);
    res.status(201).json(result);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.put('/auctions/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    res.json(await db.updateAuction(req.params.id, req.body, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.delete('/auctions/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    res.json(await db.deleteAuction(req.params.id, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.get('/dividends', requireAuth, async (req, res) => {
  try {
    res.json(await db.getDividends(req.query.groupId as string));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.put('/dividends/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    res.json(await db.updateDividend(req.params.id, req.body, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.delete('/dividends/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    res.json(await db.deleteDividend(req.params.id, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ============================================================
// KUZHUKKAL (LUCKY DRAW / DRAW OF LOTS)
// ============================================================
apiRouter.get('/kuzhukkal/draws', requireAuth, async (req, res) => {
  try {
    res.json(await db.getKuzhukkalDraws(req.query.groupId as string));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/kuzhukkal/eligible', requireAuth, async (req, res) => {
  try {
    const groupId = req.query.groupId as string;
    if (!groupId) return res.status(400).json({ error: 'Group ID is required' });
    res.json(await db.getEligibleKuzhukkalMembers(groupId));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/kuzhukkal/context', requireAuth, async (req, res) => {
  try {
    const groupId = req.query.groupId as string;
    if (!groupId) return res.status(400).json({ error: 'Group ID is required' });
    res.json(await db.getKuzhukkalContext(groupId));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.post('/kuzhukkal/digital-select', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { groupId } = req.body;
    if (!groupId) return res.status(400).json({ error: 'Group ID is required' });

    if (req.user?.role !== 'admin' && req.user?.role !== 'staff') {
      return res.status(403).json({ error: 'Only admin or staff can conduct lucky draws' });
    }

    const eligible = await db.getEligibleKuzhukkalMembers(groupId);
    if (!eligible || eligible.length === 0) {
      return res.status(400).json({ error: 'No eligible members remaining for this chit group' });
    }

    // Cryptographically secure RNG selection on the backend:
    const selectedIndex = crypto.randomInt(0, eligible.length);
    const selectedWinner = eligible[selectedIndex];

    res.json({
      selectedWinner,
      eligibleCount: eligible.length,
      selectionTimestamp: new Date().toISOString()
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/kuzhukkal/draws', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'staff') {
      return res.status(403).json({ error: 'Only admin or staff can confirm lucky draws' });
    }
    const { groupId, drawSequence, winnerMembershipId } = req.body;
    if (!groupId || !drawSequence || !winnerMembershipId) {
      return res.status(400).json({ error: 'Group ID, draw sequence, and winner membership are required' });
    }
    const result = await db.recordKuzhukkalDraw(req.body, req.user!);
    res.status(201).json(result);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.post('/kuzhukkal/draws/:id/cancel', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    res.json(await db.cancelKuzhukkalDraw(req.params.id, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ============================================================
// PRIZE PAYMENTS
// ============================================================
apiRouter.get('/prize-payments', requireAuth, async (req, res) => {
  try {
    res.json(await db.getPrizePayments(req.query.status as string));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.put('/prize-payments/:id/disburse', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { amountToDisburse, disbursalDate, paymentMode } = req.body;
    if (!amountToDisburse || !disbursalDate || !paymentMode)
      return res.status(400).json({ error: 'Amount, disbursal date, and payment mode are required' });
    res.json(await db.disbursePrize(req.params.id, { ...req.body, amountToDisburse: Number(amountToDisburse) }, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.put('/prize-payments/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    res.json(await db.updatePrizePayment(req.params.id, req.body, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.delete('/prize-payments/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    res.json(await db.deletePrizePayment(req.params.id, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ============================================================
// EXPENSES
// ============================================================
apiRouter.get('/expenses', requireAuth, async (req, res) => {
  try {
    const { category, startDate, endDate } = req.query;
    res.json(await db.getExpenses(category as string, startDate as string, endDate as string));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/expenses', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { expenseDate, category, description, amount } = req.body;
    if (!expenseDate || !category || !description || !amount)
      return res.status(400).json({ error: 'Date, category, description, and amount are required' });
    res.status(201).json(await db.createExpense({ ...req.body, amount: Number(amount) }, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.put('/expenses/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    res.json(await db.updateExpense(req.params.id, req.body, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.delete('/expenses/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    await db.deleteExpense(req.params.id, req.user!);
    res.json({ message: 'Expense deleted successfully' });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ============================================================
// REPORTS
// ============================================================
apiRouter.get('/reports/collections', requireAuth, async (req, res) => {
  try {
    res.json(await db.getCollectionReport(req.query));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/reports/outstanding', requireAuth, async (req, res) => {
  try {
    res.json(await db.getOutstandingReport(req.query.groupId as string));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/reports/chit-groups', requireAuth, async (_req, res) => {
  try {
    res.json(await db.getChitGroupsReport());
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/reports/auctions', requireAuth, async (req, res) => {
  try {
    res.json(await db.getAuctionsReport(req.query.groupId as string));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/reports/chit-booking-list', requireAuth, async (_req, res) => {
  try {
    res.json(await db.getChitBookingList());
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// SEARCH & NOTIFICATIONS
// ============================================================
apiRouter.get('/search', requireAuth, async (req, res) => {
  try {
    res.json(await db.search((req.query.q as string) || ''));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/notifications', requireAuth, async (_req, res) => {
  try {
    res.json(await db.getNotifications());
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.put('/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    res.json(await db.markNotificationRead(req.params.id));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// AUDIT LOGS & USERS
// ============================================================
apiRouter.get('/audit-logs', requireAuth, requireAdmin, async (_req, res) => {
  try {
    res.json(await db.getAuditLogs());
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.put('/audit-logs/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    res.json(await db.updateAuditLog(req.params.id, req.body, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.delete('/audit-logs/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    res.json(await db.deleteAuditLog(req.params.id, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.get('/users', requireAuth, requireAdmin, async (_req, res) => {
  try {
    res.json(await db.getUsers());
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/users', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { username, password, fullName } = req.body;
    if (!username || !password || !fullName)
      return res.status(400).json({ error: 'Username, password, and name are required' });

    const email = req.body.email?.trim() ? req.body.email.trim() : `${username.trim().replace(/[^a-zA-Z0-9_]/g, '')}@jayapriyachits.com`;
    res.status(201).json(await db.createUser({ ...req.body, email }, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.put('/users/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    res.json(await db.updateUser(Number(req.params.id), req.body, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.delete('/users/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    res.json(await db.deleteUser(req.params.id, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ============================================================
// ROUTES (COLLECTION MANAGEMENT)
// ============================================================
apiRouter.get('/routes', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { q, status } = req.query;
    res.json(await db.getRoutes(q as string, status as string));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/routes/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const route = await db.getRouteById(req.params.id);
    if (!route) return res.status(404).json({ error: 'Route not found' });
    res.json(route);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/routes/:id/customers', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    res.json(await db.getRouteCustomers(req.params.id));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/routes', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { routeName, area } = req.body;
    if (!routeName || !area) {
      return res.status(400).json({ error: 'Route name and area are required.' });
    }
    res.status(201).json(await db.createRoute(req.body, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.put('/routes/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    res.json(await db.updateRoute(req.params.id, req.body, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.delete('/routes/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    res.json(await db.deleteRoute(req.params.id, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ============================================================
// DAILY HANDOVERS & CASHIER VERIFICATION
// ============================================================
apiRouter.get('/handovers', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { agentUserId, status, date } = req.query;
    const filterAgent = req.user?.role === 'agent' ? req.user.id : (agentUserId as string);
    res.json(await db.getDailyHandovers({
      agentUserId: filterAgent,
      status: status as string,
      date: date as string
    }));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/handovers', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    res.status(201).json(await db.createDailyHandover(req.body, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.put('/handovers/:id/verify', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'staff') {
      return res.status(403).json({ error: 'Only admin or cashier/staff can verify cash handovers.' });
    }
    const { status, notes } = req.body;
    if (!status || !['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Valid status ("verified" or "rejected") is required.' });
    }
    res.json(await db.verifyDailyHandover(req.params.id, status, notes, req.user!));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ============================================================
// SETTINGS
// ============================================================
apiRouter.get('/settings', requireAuth, async (_req, res) => {
  try {
    res.json(await db.getSettings());
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.put('/settings', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    res.json(await db.updateSettings(req.body));
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ============================================================
// BACKUP / DEMO (no-ops — MySQL is the source of truth now)
// ============================================================
apiRouter.get('/backup/export', requireAuth, requireAdmin, async (_req, res) => {
  res.json({ message: 'Export via phpMyAdmin on xiadot.com' });
});

apiRouter.post('/backup/reset-demo', requireAuth, requireAdmin, async (_req, res) => {
  res.json({ message: 'Reset not available in MySQL mode. Use phpMyAdmin.' });
});

// ============================================================
// AGENT PANEL
// ============================================================
apiRouter.get('/agent/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await db.getAgentProfile(req.user?.id);
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch agent profile' });
  }
});

apiRouter.get('/agent/summary', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const month = req.query.month as string;
    const summary = await db.getAgentSummary(month, req.user?.id, req.user?.role);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch agent summary' });
  }
});

apiRouter.get('/agent/monthly-trend', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const trend = await db.getAgentMonthlyTrend(req.user?.id, req.user?.role);
    res.json(trend);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch monthly trend' });
  }
});

apiRouter.get('/agent/collection-sheet', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { dateType, customDate, status, search } = req.query;
    const items = await db.getAgentCollectionSheet({
      dateType: dateType as string,
      customDate: customDate as string,
      status: status as string,
      search: search as string
    }, req.user?.id, req.user?.role);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch collection sheet' });
  }
});

apiRouter.get('/agent/due-bills', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const bills = await db.getAgentDueBills(req.user?.id, req.user?.role);
    res.json(bills);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch due bills' });
  }
});

apiRouter.get('/agent/receipts', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const receipts = await db.getAgentReceipts(req.user?.id, req.user?.role);
    res.json(receipts);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch receipts' });
  }
});

apiRouter.post('/agent/collect-payment', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { customerId, installmentId, amount, paymentMethod, notes } = req.body;
    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }
    const numAmount = Number(amount);
    if (!numAmount || Number.isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Valid payment amount greater than zero is required' });
    }

    const result = await db.collectAgentPayment(
      {
        customerId,
        installmentId,
        amount: numAmount,
        paymentMethod: paymentMethod || 'cash',
        notes
      },
      req.user!
    );
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to collect payment' });
  }
});

// ============================================================
// NEW MODULES: DAILY, MONTHLY, BALANCE SHEET
// ============================================================
apiRouter.get('/collections/daily', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { date } = req.query;
    const data = await db.getDailyCollection(date as string, req.user?.id, req.user?.role);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch daily collection' });
  }
});

apiRouter.get('/collections/monthly', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { month, agentId, groupId, customerId, paymentMode, startDate, endDate, status } = req.query;
    // Strict Role Security: If caller is an agent, lock agentId strictly to their own user id!
    const isAgent = req.user?.role === 'agent';
    const effectiveAgentId = isAgent ? req.user!.id : (agentId as string);

    const data = await db.getMonthlyCollection(
      month as string,
      req.user?.id,
      req.user?.role,
      effectiveAgentId,
      groupId as string,
      customerId as string,
      paymentMode as string,
      startDate as string,
      endDate as string,
      status as string
    );
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch monthly collection' });
  }
});

apiRouter.get('/collections/balance-sheet', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const isAgent = req.user?.role === 'agent';
    const effectiveUserId = req.user?.id;
    const effectiveRole = req.user?.role;
    const { filter, search, groupId, customerId } = req.query;

    if (isAgent && customerId) {
      const authorized = await db.isAgentAuthorizedForCustomer(effectiveUserId!, customerId as string);
      if (!authorized) {
        return res.status(403).json({ error: 'Access denied: You are not authorized to view this customer.' });
      }
    }

    const data = await db.getBalanceSheet(
      effectiveUserId,
      effectiveRole,
      filter as string,
      search as string,
      groupId as string,
      customerId as string
    );
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch balance sheet' });
  }
});

// ============================================================
// ARREARS REPORT (PHYSICAL FORMAT AS ON DATE)
// ============================================================
apiRouter.get('/reports/arrears', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const effectiveUserId = req.user?.id;
    const effectiveRole = req.user?.role;
    const { asOnDate, agentId, groupId, search } = req.query;

    const data = await db.getArrearsReport(
      effectiveUserId,
      effectiveRole,
      asOnDate as string,
      agentId as string,
      groupId as string,
      search as string
    );
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate arrears report' });
  }
});

// ============================================================
// AGENTS DIRECTORY (FOR SELECTION & REPORTS)
// ============================================================
apiRouter.get('/agents', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.user?.role === 'agent') {
      const me = await db.getUserById(req.user.id);
      return res.json(me ? [{
        id: me.id,
        agentId: `AGT-${String(me.id).padStart(3, '0')}`,
        fullName: me.fullName,
        username: me.username,
        email: me.email,
        role: me.role,
        status: me.status,
        assignedRouteId: me.assignedRouteId,
        assignedRouteName: me.assignedRouteName
      }] : []);
    }
    const { q, status } = req.query;
    const agents = await db.getAgents(q as string, status as string);
    res.json(agents);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch agents' });
  }
});

// ============================================================
// SUBSCRIBER STATEMENT / PASSBOOK LEDGER
// ============================================================
apiRouter.get('/subscribers/:customerId/statement', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { customerId } = req.params;
    const { groupId } = req.query;
    if (req.user?.role === 'agent') {
      const isAllowed = await db.isAgentAuthorizedForCustomer(req.user.id, customerId);
      if (!isAllowed) {
        return res.status(403).json({ error: 'Access denied: You are not authorized to view this subscriber statement.' });
      }
    }
    const statement = await db.getSubscriberStatement(customerId, groupId as string);
    res.json(statement);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch subscriber statement' });
  }
});

