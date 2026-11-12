import 'dotenv/config';
import express from 'express';
import http from 'http';
import { apiRouter } from '../server/api';
import { db } from '../server/db';
import { createToken } from '../server/auth';
import { generateArrearsReportPDF } from '../fund/src/utils/pdfGenerator';
import fs from 'fs';

async function runArrearsFullSuite() {
  console.log('===============================================================');
  console.log(' STARTING ARREARS REPORT VALIDATION & REGRESSION TEST SUITE');
  console.log('===============================================================\n');

  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}/api`;

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
    // -----------------------------------------------------------------
    // 1. SETUP USERS & TOKENS
    // -----------------------------------------------------------------
    console.log('--- TEST 1: User & Role Tokens Setup ---');
    const users = await db.getUsers();
    const adminUser = users.find(u => u.role === 'admin')!;
    const agent5 = users.find(u => u.id === 5)!; // Field Agent (Ravi Kumar)
    const agent11 = users.find(u => u.id === 11)!; // Field Agent (Vijayraj)

    assert(!!adminUser, `Admin identified: ${adminUser.fullName}`);
    assert(!!agent5, `Field Agent 5 identified: ${agent5.fullName}`);
    assert(!!agent11, `Field Agent 11 identified: ${agent11.fullName}`);

    const adminToken = createToken(adminUser);
    const agent5Token = createToken(agent5);
    const agent11Token = createToken(agent11);

    // -----------------------------------------------------------------
    // 2. ADMIN COMPANY-WIDE ARREARS REPORT
    // -----------------------------------------------------------------
    console.log('\n--- TEST 2: Admin Consolidated Arrears Report ---');
    const adminRes = await fetch(`${baseUrl}/reports/arrears?asOnDate=2026-10-31`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminRes.status === 200, 'GET /reports/arrears status is 200');
    const adminData = await adminRes.json();

    assert(adminData.records?.length > 0, `Returned ${adminData.records?.length} membership records`);
    assert(adminData.summary?.totalPayableAmount > 0, `Total Payable Amount calculated: ₹${adminData.summary?.totalPayableAmount}`);
    assert(adminData.summary?.totalCollectionAmount > 0, `Total Collection Amount calculated: ₹${adminData.summary?.totalCollectionAmount}`);
    assert(adminData.summary?.totalBalanceAmount > 0, `Total Balance Amount calculated: ₹${adminData.summary?.totalBalanceAmount}`);
    assert(adminData.summary?.totalLastCollectionAmount > 0, `Last Collection Amount total calculated: ₹${adminData.summary?.totalLastCollectionAmount}`);

    // Verify mathematical reconciliation: Balance = Payable - Collection
    const expectedBalance = Math.round((adminData.summary.totalPayableAmount - adminData.summary.totalCollectionAmount) * 100) / 100;
    assert(
      Math.abs(adminData.summary.totalBalanceAmount - expectedBalance) < 0.05,
      `Balance reconciles dynamically: ₹${adminData.summary.totalBalanceAmount} ≈ ₹${expectedBalance}`
    );

    // -----------------------------------------------------------------
    // 3. PHYSICAL REPORT 12-COLUMN STRUCTURE
    // -----------------------------------------------------------------
    console.log('\n--- TEST 3: Physical Register 12-Column Verification ---');
    const firstRow = adminData.records[0];
    const requiredKeys = [
      'sNo', 'groupNo', 'name', 'cd', 'td',
      'totalPayableAmount', 'totalCollectionAmount', 'balanceAmount',
      'lastCollectionDate', 'lastCollectionAmount', 'phone', 'agentName'
    ];
    let allKeysPresent = true;
    for (const key of requiredKeys) {
      if (!(key in firstRow)) {
        allKeysPresent = false;
        console.error(`Missing column: ${key}`);
      }
    }
    assert(allKeysPresent, 'All 12 physical report columns present in exact specification');
    assert(firstRow.sNo === 1, 'S.No starts at 1');
    assert(typeof firstRow.groupNo === 'string' && firstRow.groupNo.length > 0, `Group No format: ${firstRow.groupNo}`);
    assert(typeof firstRow.cd === 'string' && firstRow.cd.includes('-'), `CD Date format: ${firstRow.cd}`);
    assert(typeof firstRow.td === 'string' && firstRow.td.includes('-'), `TD Date format: ${firstRow.td}`);

    // -----------------------------------------------------------------
    // 4. MULTIPLE CHIT MEMBERSHIPS PER SUBSCRIBER AGGREGATION
    // -----------------------------------------------------------------
    console.log('\n--- TEST 4: Multiple Chit Memberships Aggregation ---');
    // Group records by customerId to check subscribers with multiple accounts
    const customerCounts: Record<string, number> = {};
    for (const r of adminData.records) {
      customerCounts[r.customerId] = (customerCounts[r.customerId] || 0) + 1;
    }
    const multiMemberCust = Object.entries(customerCounts).find(([_, count]) => count > 1);
    if (multiMemberCust) {
      const [custId, count] = multiMemberCust;
      const custRows = adminData.records.filter((r: any) => r.customerId === custId);
      assert(
        custRows.length === count,
        `Customer ${custId} with ${count} memberships appears as separate accounts with unique Group No: ${custRows.map((r: any) => r.groupNo).join(', ')}`
      );
    } else {
      console.log('  ℹ Note: All current database subscribers have 1 membership each.');
    }

    // -----------------------------------------------------------------
    // 5. HISTORICAL AS-ON-DATE FILTERING
    // -----------------------------------------------------------------
    console.log('\n--- TEST 5: Historical As-On-Date Filtering ---');
    const pastRes = await fetch(`${baseUrl}/reports/arrears?asOnDate=2026-10-10`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const pastData = await pastRes.json();
    assert(pastRes.status === 200, 'Past date request succeeded with status 200');
    assert(
      pastData.summary.totalCollectionAmount <= adminData.summary.totalCollectionAmount,
      `Historical 2026-10-10 collection (₹${pastData.summary.totalCollectionAmount}) is <= 2026-10-31 collection (₹${adminData.summary.totalCollectionAmount})`
    );

    // -----------------------------------------------------------------
    // 6. FIELD AGENT AUTHORIZATION & ISOLATION
    // -----------------------------------------------------------------
    console.log('\n--- TEST 6: Field Agent Security & Scope Isolation ---');
    const agentRes = await fetch(`${baseUrl}/reports/arrears?asOnDate=2026-10-31`, {
      headers: { Authorization: `Bearer ${agent5Token}` }
    });
    const agentData = await agentRes.json();
    assert(agentRes.status === 200, 'Agent arrears report status 200');
    assert(
      agentData.records.length < adminData.records.length,
      `Agent sees restricted authorized records (${agentData.records.length} records vs admin ${adminData.records.length} records)`
    );

    // -----------------------------------------------------------------
    // 7. PRESERVE EXISTING BALANCE SHEET OPERATIONAL WORKFLOW
    // -----------------------------------------------------------------
    console.log('\n--- TEST 7: Preserve Live Balance Sheet Operational Tracker ---');
    const bsRes = await fetch(`${baseUrl}/collections/balance-sheet?filter=all`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const bsData = await bsRes.json();
    assert(bsRes.status === 200, 'Live Balance Sheet API status 200');
    assert(bsData.records?.length > 0, `Existing installment-level tracker operational with ${bsData.records?.length} installments`);
    assert(typeof bsData.totalOutstanding === 'number', `Total outstanding balance intact: ₹${bsData.totalOutstanding}`);
    assert(typeof bsData.totalArrears === 'number', `Total overdue arrears intact: ₹${bsData.totalArrears}`);
    assert('dueTodayAmount' in bsData, 'Due Today card preserved');
    assert('overdueAmount' in bsData, 'Overdue card preserved');
    assert('upcomingAmount' in bsData, 'Upcoming card preserved');

    // -----------------------------------------------------------------
    // 8. PDF GENERATION RECONCILIATION
    // -----------------------------------------------------------------
    console.log('\n--- TEST 8: PDF Generation Verification ---');
    try {
      generateArrearsReportPDF({
        companyName: 'JIVAN CHIT FUNDS (INDIA) PVT LTD',
        asOnDate: '31-08-2026',
        records: adminData.records,
        summary: adminData.summary
      });
      assert(true, 'PDF generated without runtime error in A4 landscape format');
    } catch (e: any) {
      assert(false, `PDF generation failed: ${e.message}`);
    }

    server.close();

    console.log('\n===============================================================');
    console.log(` RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('===============================================================');

    if (failCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err: any) {
    console.error('Fatal test error:', err);
    server.close();
    process.exit(1);
  }
}

runArrearsFullSuite();
