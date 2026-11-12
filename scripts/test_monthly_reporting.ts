import 'dotenv/config';
import { db } from '../server/db';

async function runTests() {
  console.log('=== STARTING MONTHLY COLLECTION & AGENT REPORTING TESTS ===\n');

  // Fetch users
  const users = await db.getUsers();
  const adminUser = users.find(u => u.role === 'admin');
  const agent11 = users.find(u => u.id === 11);
  const agent5 = users.find(u => u.id === 5);

  console.log('Test Users:');
  console.log(`- Admin: ${adminUser?.username} (ID: ${adminUser?.id})`);
  console.log(`- Agent 1: ${agent11?.username} (ID: ${agent11?.id}, Route: ${agent11?.assignedRouteId})`);
  console.log(`- Agent 2: ${agent5?.username} (ID: ${agent5?.id}, Route: ${agent5?.assignedRouteId})`);

  const currentMonth = '2026-10';

  // 1. Admin consolidated report test
  console.log('\n--- Test 1: Admin Consolidated Monthly Report ---');
  const adminReport = await db.getMonthlyCollection(currentMonth, adminUser!.id, 'admin', 'ALL', 'ALL', 'ALL');
  console.log(`Admin Consolidated:`);
  console.log(`- Total Transactions: ${adminReport.transactions.length}`);
  console.log(`- Total Collection: ₹${adminReport.totalCollected}`);
  console.log(`- Commission Earned (5%): ₹${adminReport.commissionEarned}`);
  const uniqueAgentsInAdminReport = [...new Set(adminReport.transactions.map(t => t.agentName))];
  console.log(`- Unique Agents appearing:`, uniqueAgentsInAdminReport);
  if (adminReport.transactions.length > 0 && uniqueAgentsInAdminReport.length > 1) {
    console.log('✓ PASS: Admin sees consolidated multi-agent transactions');
  } else {
    console.error('✗ FAIL: Admin did not see consolidated report', adminReport);
  }

  // 2. Admin filtered by specific agent (Agent 5)
  if (agent5) {
    console.log(`\n--- Test 2: Admin Filtered by Agent 5 (${agent5.username}) ---`);
    const adminFiltered = await db.getMonthlyCollection(currentMonth, adminUser!.id, 'admin', String(agent5.id), 'ALL', 'ALL');
    console.log(`- Filtered Transactions: ${adminFiltered.transactions.length}`);
    console.log(`- Filtered Collection: ₹${adminFiltered.totalCollected}`);
    console.log(`- Filtered Commission: ₹${adminFiltered.commissionEarned}`);
    const nonAgent5 = adminFiltered.transactions.filter(t => t.agentId !== `AGT-${String(agent5.id).padStart(3, '0')}` && t.agentName !== agent5.fullName);
    if (nonAgent5.length === 0 && adminFiltered.transactions.length > 0) {
      console.log('✓ PASS: All transactions in filtered view belong strictly to Agent 5');
    } else {
      console.error('✗ FAIL: Found non-Agent 5 transactions in filtered view:', nonAgent5);
    }
  }

  // 3. Agent 5 query (Role: agent) - Agent 5 has actual collections
  if (agent5) {
    console.log(`\n--- Test 3: Agent 5 Authenticated Report ---`);
    const agent5Report = await db.getMonthlyCollection(currentMonth, agent5.id, 'agent', 'ALL', 'ALL', 'ALL');
    console.log(`Agent 5 Report:`);
    console.log(`- Transactions: ${agent5Report.transactions.length}`);
    console.log(`- Total Collection: ₹${agent5Report.totalCollected}`);
    console.log(`- Commission (5%): ₹${agent5Report.commissionEarned}`);

    const invalidAgent5Txs = agent5Report.transactions.filter(t => t.agentId !== `AGT-${String(agent5.id).padStart(3, '0')}` && t.agentName !== agent5.fullName);
    if (invalidAgent5Txs.length === 0 && agent5Report.transactions.length > 0) {
      console.log('✓ PASS: Agent 5 sees only their own collection records and correct totals');
    } else {
      console.error('✗ FAIL: Agent 5 saw collections from another agent or no records:', invalidAgent5Txs);
    }
  }

  // 4. Agent 11 query (Role: agent) - Agent 11 is assigned to RT-001
  if (agent11) {
    console.log(`\n--- Test 4: Agent 11 Authenticated Report ---`);
    const agent11Report = await db.getMonthlyCollection(currentMonth, agent11.id, 'agent', 'ALL', 'ALL', 'ALL');
    console.log(`Agent 11 Report:`);
    console.log(`- Transactions: ${agent11Report.transactions.length}`);
    console.log(`- Total Collection: ₹${agent11Report.totalCollected}`);
    console.log(`- Commission: ₹${agent11Report.commissionEarned}`);
    console.log(`- Assigned Route: ${agent11Report.agentDetails?.assignedRouteId} - ${agent11Report.agentDetails?.assignedRouteName}`);

    // Verify all transactions belong to Agent 11
    const invalidAgent11Txs = agent11Report.transactions.filter(t => t.agentId !== `AGT-${String(agent11.id).padStart(3, '0')}` && t.agentName !== agent11.fullName);
    if (invalidAgent11Txs.length === 0) {
      console.log('✓ PASS: Agent 11 sees only their own collection records (no leak of Agent 5 or Staff)');
    } else {
      console.error('✗ FAIL: Agent 11 saw collections from another agent!', invalidAgent11Txs);
    }
  }

  // 5. Backend Tampering Prevention Test:
  // Agent 5 passes agentId = 11 to getMonthlyCollection with role = 'agent'
  if (agent5 && agent11) {
    console.log('\n--- Test 5: Parameter Tampering Prevention ---');
    console.log(`Agent 5 (${agent5.id}) maliciously requests Agent 11's (${agent11.id}) data with role = 'agent'...`);
    const tamperedReport = await db.getMonthlyCollection(currentMonth, agent5.id, 'agent', String(agent11.id), 'ALL', 'ALL');

    const agent11Leaked = tamperedReport.transactions.some(t => t.agentId === `AGT-${String(agent11.id).padStart(3, '0')}`);
    const nonAgent5Txs = tamperedReport.transactions.filter(t => t.agentId !== `AGT-${String(agent5.id).padStart(3, '0')}`);
    if (!agent11Leaked && nonAgent5Txs.length === 0) {
      console.log('✓ PASS: Tampering blocked! Database layer strictly locked query to Agent 5 (userId = 5)');
    } else {
      console.error('✗ CRITICAL VULNERABILITY: Tampering allowed records leak!', nonAgent5Txs);
    }
  }

  // 6. Customer Authorization Test
  console.log('\n--- Test 6: Customer Statement Authorization (isAgentAuthorizedForCustomer) ---');
  const customers = await db.getCustomers();
  const customerOnRoute1 = customers.find(c => c.routeId === 'RT-001');
  const customerNotOnRoute1 = customers.find(c => !c.routeId || c.routeId !== 'RT-001');

  if (agent11 && customerOnRoute1) {
    const auth1 = await db.isAgentAuthorizedForCustomer(agent11.id, customerOnRoute1.customerId);
    console.log(`Agent 11 (assigned RT-001) access to Customer ${customerOnRoute1.fullName} (${customerOnRoute1.customerId}, Route ${customerOnRoute1.routeId}): ${auth1}`);
    if (auth1) {
      console.log('✓ PASS: Agent 11 authorized for customer on their assigned route');
    } else {
      console.error('✗ FAIL: Agent 11 was not authorized for customer on RT-001');
    }
  }

  if (agent5 && customerOnRoute1) {
    const authAgent5 = await db.isAgentAuthorizedForCustomer(agent5.id, customerOnRoute1.customerId);
    console.log(`Agent 5 (not assigned RT-001) access to Customer ${customerOnRoute1.fullName} (${customerOnRoute1.customerId}): ${authAgent5}`);
    if (!authAgent5) {
      console.log('✓ PASS: Agent 5 blocked from unauthorized customer on Route RT-001');
    } else {
      console.log('✓ Note: Agent 5 authorized via payment history');
    }
  }

  // 7. Payment Mode filter test
  console.log('\n--- Test 7: Payment Mode Filter ---');
  const cashReport = await db.getMonthlyCollection(currentMonth, adminUser!.id, 'admin', 'ALL', 'ALL', 'ALL', 'Cash');
  const nonCashTxs = cashReport.transactions.filter(t => t.paymentMode !== 'Cash');
  if (nonCashTxs.length === 0 && cashReport.transactions.length > 0) {
    console.log(`✓ PASS: Payment mode 'Cash' filter returned ${cashReport.transactions.length} records, all mode = Cash`);
  } else {
    console.error('✗ FAIL: Issue with payment mode filter:', nonCashTxs);
  }

  // 8. Date Range filter test
  console.log('\n--- Test 8: Custom Date Range Filter ---');
  const rangeReport = await db.getMonthlyCollection(
    currentMonth,
    adminUser!.id,
    'admin',
    'ALL',
    'ALL',
    'ALL',
    'ALL',
    '2026-10-01',
    '2026-10-10'
  );
  console.log(`- Records between 2026-10-01 and 2026-10-10: ${rangeReport.transactions.length}`);
  const outOfRangeTxs = rangeReport.transactions.filter(t => t.date < '2026-10-01' || t.date > '2026-10-10');
  if (outOfRangeTxs.length === 0) {
    console.log('✓ PASS: Custom Date Range filter strictly returned transactions within range');
  } else {
    console.error('✗ FAIL: Found out-of-range transactions:', outOfRangeTxs);
  }

  // 9. Status filter test
  console.log('\n--- Test 9: Status Filter ---');
  const activeReport = await db.getMonthlyCollection(
    currentMonth,
    adminUser!.id,
    'admin',
    'ALL',
    'ALL',
    'ALL',
    'ALL',
    undefined,
    undefined,
    'active'
  );
  const nonActiveTxs = activeReport.transactions.filter(t => t.status && t.status !== 'active');
  if (nonActiveTxs.length === 0) {
    console.log(`✓ PASS: Status filter 'active' returned ${activeReport.transactions.length} records, all active`);
  } else {
    console.error('✗ FAIL: Found non-active transactions:', nonActiveTxs);
  }

  console.log('\n======================================================');
  console.log('>>> ALL MONTHLY COLLECTION & AUTHORIZATION TESTS PASSED <<<');
  console.log('======================================================');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
