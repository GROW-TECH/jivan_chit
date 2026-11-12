import 'dotenv/config';
import express from 'express';
import { apiRouter } from '../server/api';
import { db } from '../server/db';
import { createToken } from '../server/auth';
import http from 'http';

async function runBalanceSheetTests() {
  console.log('===============================================================');
  console.log(' STARTING BALANCE SHEET & PENDING DUES ROLE AUTHORIZATION TESTS');
  console.log('===============================================================\n');

  // Start internal test server on ephemeral port
  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}/api`;
  console.log(`Test API Server running on ${baseUrl}\n`);

  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${desc}`);
      passCount++;
    } else {
      console.error(`  ✗ FAIL: ${desc}`);
      failCount++;
    }
  }

  try {
    // -------------------------------------------------------------
    // STEP 1: Fetch users and tokens
    // -------------------------------------------------------------
    console.log('--- Step 1: User & Route Setup ---');
    const users = await db.getUsers();
    const adminUser = users.find(u => u.role === 'admin')!;
    const agent11 = users.find(u => u.id === 11)!; // vijay_chit, RT-001
    const agent5 = users.find(u => u.id === 5)!;   // agent, RT-002

    assert(!!adminUser, `Admin found: ${adminUser.username} (ID: ${adminUser.id})`);
    assert(agent11.assignedRouteId === 'RT-001', `Agent 11 assigned to RT-001: ${agent11.username}`);
    assert(agent5.assignedRouteId === 'RT-002', `Agent 5 assigned to RT-002: ${agent5.username}`);

    const adminToken = createToken(adminUser);
    const agent11Token = createToken(agent11);
    const agent5Token = createToken(agent5);

    // -------------------------------------------------------------
    // STEP 2: Admin View - Company-Wide Balance Sheet
    // -------------------------------------------------------------
    console.log('\n--- Step 2: Admin Company-Wide Balance Sheet ---');
    const adminRes = await fetch(`${baseUrl}/collections/balance-sheet`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminData = await adminRes.json();

    assert(adminRes.status === 200, 'Admin API returns status 200');
    assert(adminData.records?.length === 153, `Admin sees all 153 company-wide pending installments (got ${adminData.records?.length})`);
    assert(adminData.totalOutstanding === 2556466.02, `Admin total outstanding is ₹25,56,466.02 (got ₹${adminData.totalOutstanding})`);
    assert(typeof adminData.totalArrears === 'number', `Admin total arrears is computed: ₹${adminData.totalArrears}`);

    // Verify Admin can see customers from multiple routes
    const adminCustomerIds = new Set(adminData.records.map((r: any) => r.customerId));
    assert(adminCustomerIds.has('CUST-1015'), 'Admin sees RT-001 customer CUST-1015');
    assert(adminCustomerIds.has('CUST-1014'), 'Admin sees RT-002 customer CUST-1014');
    assert(adminCustomerIds.has('CUST-1002'), 'Admin sees multi-group customer CUST-1002');

    // -------------------------------------------------------------
    // STEP 3: Agent 11 View - Scoped to RT-001
    // -------------------------------------------------------------
    console.log('\n--- Step 3: Agent 11 View (RT-001: Fairlands & Meyyanur) ---');
    const agent11Res = await fetch(`${baseUrl}/collections/balance-sheet`, {
      headers: { Authorization: `Bearer ${agent11Token}` }
    });
    const agent11Data = await agent11Res.json();

    assert(agent11Res.status === 200, 'Agent 11 API returns status 200');
    assert(agent11Data.records?.length === 4, `Agent 11 sees only 4 pending records for RT-001 (got ${agent11Data.records?.length})`);

    const agent11Custs = Array.from(new Set(agent11Data.records.map((r: any) => r.customerId)));
    assert(agent11Custs.length === 1 && agent11Custs[0] === 'CUST-1015', `Agent 11 strictly restricted to CUST-1015 (got ${agent11Custs.join(', ')})`);

    // Verify summary cards for Agent 11
    assert(agent11Data.totalOutstanding > 0, `Agent 11 Total Outstanding: ₹${agent11Data.totalOutstanding}`);
    assert(typeof agent11Data.dueTodayAmount === 'number', `Agent 11 Due Today: ₹${agent11Data.dueTodayAmount} (${agent11Data.dueTodayCount} recs)`);
    assert(typeof agent11Data.overdueAmount === 'number', `Agent 11 Overdue: ₹${agent11Data.overdueAmount} (${agent11Data.overdueCount} recs)`);
    assert(typeof agent11Data.upcomingAmount === 'number', `Agent 11 Upcoming: ₹${agent11Data.upcomingAmount} (${agent11Data.upcomingCount} recs)`);

    // Verify mathematical consistency: Total = Overdue + Due Today + Upcoming
    const agent11Sum = Math.round(agent11Data.overdueAmount + agent11Data.dueTodayAmount + agent11Data.upcomingAmount);
    assert(Math.round(agent11Data.totalOutstanding) === agent11Sum, `Agent 11 summary cards add up exactly: Total (${agent11Data.totalOutstanding}) == Overdue (${agent11Data.overdueAmount}) + DueToday (${agent11Data.dueTodayAmount}) + Upcoming (${agent11Data.upcomingAmount})`);

    // Verify record fields
    const r11 = agent11Data.records[0];
    assert(!!r11.customerName, `Customer name present: ${r11.customerName}`);
    assert(!!r11.phone, `Phone number present: ${r11.phone}`);
    assert(!!r11.address, `Address present: ${r11.address}`);
    assert(!!r11.groupName, `Chit group present: ${r11.groupName}`);
    assert(!!r11.dueDate, `Due date present: ${r11.dueDate}`);
    assert(typeof r11.targetAmount === 'number', `Target amount present: ₹${r11.targetAmount}`);
    assert(typeof r11.paidAmount === 'number', `Paid amount present: ₹${r11.paidAmount}`);
    assert(typeof r11.outstandingBalance === 'number', `Remaining balance present: ₹${r11.outstandingBalance}`);
    assert(!!r11.paymentStatus, `Payment status present: ${r11.paymentStatus}`);

    // Verify future installments are not counted as overdue
    const upcomingRecords = agent11Data.records.filter((r: any) => r.isUpcoming);
    assert(upcomingRecords.every((r: any) => !r.isOverdue && r.overdueStatus !== 'Overdue'), 'Future installments are NOT marked as overdue');

    // -------------------------------------------------------------
    // STEP 4: Agent 5 View - Scoped to RT-002
    // -------------------------------------------------------------
    console.log('\n--- Step 4: Agent 5 View (RT-002: Hasthampatti & Gorimedu) ---');
    const agent5Res = await fetch(`${baseUrl}/collections/balance-sheet`, {
      headers: { Authorization: `Bearer ${agent5Token}` }
    });
    const agent5Data = await agent5Res.json();

    assert(agent5Res.status === 200, 'Agent 5 API returns status 200');
    assert(agent5Data.records?.length === 4, `Agent 5 sees only 4 pending records for RT-002 (got ${agent5Data.records?.length})`);

    const agent5Custs = Array.from(new Set(agent5Data.records.map((r: any) => r.customerId)));
    assert(agent5Custs.length === 1 && agent5Custs[0] === 'CUST-1014', `Agent 5 strictly restricted to CUST-1014 (got ${agent5Custs.join(', ')})`);

    // Cross-isolation check
    assert(!agent11Custs.includes('CUST-1014'), 'Agent 11 cannot see Agent 5 customer CUST-1014');
    assert(!agent5Custs.includes('CUST-1015'), 'Agent 5 cannot see Agent 11 customer CUST-1015');

    // -------------------------------------------------------------
    // STEP 5: Security & Anti-Tampering Checks
    // -------------------------------------------------------------
    console.log('\n--- Step 5: Backend Security & Anti-Tampering ---');

    // Tampering test A: Agent 11 tries to pass userId=1 to see company-wide data
    const tamperA = await fetch(`${baseUrl}/collections/balance-sheet?userId=1&role=admin`, {
      headers: { Authorization: `Bearer ${agent11Token}` }
    });
    const tamperAData = await tamperA.json();
    assert(tamperAData.records?.length === 4, 'Tampering query params (userId=1, role=admin) ignored; still returns Agent 11 scoped records');

    // Tampering test B: Agent 11 tries to query CUST-1014 (unauthorized customer)
    const tamperB = await fetch(`${baseUrl}/collections/balance-sheet?customerId=CUST-1014`, {
      headers: { Authorization: `Bearer ${agent11Token}` }
    });
    assert(tamperB.status === 403, `Agent 11 accessing unauthorized customer CUST-1014 returns 403 Forbidden (got ${tamperB.status})`);

    // Tampering test C: Agent tries to edit installment directly
    const tamperC = await fetch(`${baseUrl}/installments/INST-MEM-001-01`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${agent11Token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ balanceAmount: 100 })
    });
    assert(tamperC.status === 403, `Agent attempting direct installment update returns 403 Forbidden (got ${tamperC.status})`);

    // Tampering test D: Agent tries to delete installment
    const tamperD = await fetch(`${baseUrl}/installments/INST-MEM-001-01`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${agent11Token}` }
    });
    assert(tamperD.status === 403, `Agent attempting direct installment deletion returns 403 Forbidden (got ${tamperD.status})`);

    // -------------------------------------------------------------
    // STEP 6: Multi-Group Customer Support
    // -------------------------------------------------------------
    console.log('\n--- Step 6: Multi-Group Customer Support ---');
    const cust1002Records = adminData.records.filter((r: any) => r.customerId === 'CUST-1002');
    const groupsForCust1002 = Array.from(new Set(cust1002Records.map((r: any) => r.groupId)));
    assert(groupsForCust1002.length >= 2, `Customer CUST-1002 belongs to multiple groups: [${groupsForCust1002.join(', ')}]`);
    assert(cust1002Records.every((r: any) => !!r.groupName && !!r.groupId), 'Each multi-group record correctly indicates its specific chit group');

    // -------------------------------------------------------------
    // STEP 7: Filtering Capabilities
    // -------------------------------------------------------------
    console.log('\n--- Step 7: Filters Verification ---');
    const dueTodayRes = await fetch(`${baseUrl}/collections/balance-sheet?filter=due-today`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const dueTodayData = await dueTodayRes.json();
    assert(dueTodayRes.status === 200, 'filter=due-today works cleanly');

    const overdueRes = await fetch(`${baseUrl}/collections/balance-sheet?filter=overdue`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const overdueData = await overdueRes.json();
    assert(overdueRes.status === 200, 'filter=overdue works cleanly');

    const upcomingRes = await fetch(`${baseUrl}/collections/balance-sheet?filter=upcoming`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const upcomingData = await upcomingRes.json();
    assert(upcomingRes.status === 200, 'filter=upcoming works cleanly');

    const paidRes = await fetch(`${baseUrl}/collections/balance-sheet?filter=paid`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const paidData = await paidRes.json();
    assert(paidRes.status === 200, 'filter=paid works cleanly');

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n===============================================================');
    console.log(`TEST SUITE COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('===============================================================');

  } catch (err) {
    console.error('Test execution error:', err);
    failCount++;
  } finally {
    server.close();
    process.exit(failCount > 0 ? 1 : 0);
  }
}

runBalanceSheetTests();
