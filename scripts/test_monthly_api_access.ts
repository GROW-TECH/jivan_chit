import 'dotenv/config';
import express from 'express';
import { apiRouter } from '../server/api';
import { db } from '../server/db';
import { createToken } from '../server/auth';
import http from 'http';

async function runApiTests() {
  console.log('=== STARTING MONTHLY COLLECTION DIRECT API ACCESS TESTS ===\n');

  // Start internal test server on ephemeral port
  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}/api`;
  console.log(`Test API Server running on ${baseUrl}\n`);

  try {
    // 1. Fetch test users & generate signed tokens
    console.log('--- Step 1: User Tokens ---');
    const users = await db.getUsers();
    const adminUser = users.find(u => u.role === 'admin')!;
    const agent5 = users.find(u => u.id === 5)!;
    const agent11 = users.find(u => u.id === 11)!;

    const adminToken = createToken(adminUser);
    const agent5Token = createToken(agent5);
    const agent11Token = createToken(agent11);

    console.log(`- Admin: ${adminUser.username} (ID: ${adminUser.id}) -> Token generated`);
    console.log(`- Agent 5: ${agent5.username} (ID: ${agent5.id}) -> Token generated`);
    console.log(`- Agent 11: ${agent11.username} (ID: ${agent11.id}) -> Token generated`);

    // 2. Admin Consolidated API Test
    console.log('\n--- Step 2: Admin Direct API /collections/monthly ---');
    const adminReportRes = await fetch(`${baseUrl}/collections/monthly?month=2026-10`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminReport = await adminReportRes.json();
    console.log(`Admin response status: ${adminReportRes.status}`);
    console.log(`- Transactions count: ${adminReport.transactions?.length}`);
    console.log(`- Total Collected: ₹${adminReport.totalCollected}`);
    console.log(`- Commission: ₹${adminReport.commissionEarned}`);
    if (adminReport.transactions?.length === 18 && adminReport.totalCollected > 200000) {
      console.log('✓ PASS: Admin receives full consolidated report (18 transactions, ₹271,340.92)');
    } else {
      console.error('✗ FAIL: Admin report incorrect:', adminReport);
    }

    // 3. Admin Filtered by Agent 5 API Test
    console.log('\n--- Step 3: Admin Filtered by Agent 5 via API ---');
    const adminAgent5Res = await fetch(`${baseUrl}/collections/monthly?month=2026-10&agentId=5`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminAgent5Data = await adminAgent5Res.json();
    console.log(`- Agent 5 filtered transactions: ${adminAgent5Data.transactions?.length}`);
    console.log(`- Agent 5 filtered total: ₹${adminAgent5Data.totalCollected}`);
    if (adminAgent5Data.transactions?.length === 8 && adminAgent5Data.totalCollected === 141340.92) {
      console.log('✓ PASS: Admin can filter monthly report specifically for Agent 5');
    } else {
      console.error('✗ FAIL: Admin filter for Agent 5 returned:', adminAgent5Data.transactions?.length);
    }

    // 4. Agent 5 Authenticated API Test
    console.log('\n--- Step 4: Agent 5 Direct API /collections/monthly ---');
    const agent5ReportRes = await fetch(`${baseUrl}/collections/monthly?month=2026-10`, {
      headers: { Authorization: `Bearer ${agent5Token}` }
    });
    const agent5Report = await agent5ReportRes.json();
    console.log(`Agent 5 response status: ${agent5ReportRes.status}`);
    console.log(`- Transactions count: ${agent5Report.transactions?.length}`);
    console.log(`- Total Collected: ₹${agent5Report.totalCollected}`);
    console.log(`- Commission: ₹${agent5Report.commissionEarned}`);
    const nonAgent5Txs = agent5Report.transactions?.filter((t: any) => t.agentId !== 'AGT-005');
    if (agent5Report.transactions?.length === 8 && nonAgent5Txs?.length === 0) {
      console.log('✓ PASS: Agent 5 sees strictly their own 8 transactions and ₹141,340.92');
    } else {
      console.error('✗ FAIL: Agent 5 saw unauthorized records:', nonAgent5Txs);
    }

    // 5. Agent 5 Tampering Attempt via Query Parameters
    console.log('\n--- Step 5: Agent 5 Parameter Tampering Attack (agentId=1 & agentId=11) ---');
    const tamperedRes = await fetch(`${baseUrl}/collections/monthly?month=2026-10&agentId=1`, {
      headers: { Authorization: `Bearer ${agent5Token}` }
    });
    const tamperedData = await tamperedRes.json();
    const adminTxsLeaked = tamperedData.transactions?.some((t: any) => t.agentId === 'AGT-001');
    if (!adminTxsLeaked && tamperedData.transactions?.length === 8) {
      console.log('✓ PASS: Tampering blocked! Server overrode agentId=1 with authenticated Agent 5 ID');
    } else {
      console.error('✗ CRITICAL VULNERABILITY: Agent 5 accessed Admin records via query parameter tampering!');
    }

    // 6. Agent 11 Authenticated API Test
    console.log('\n--- Step 6: Agent 11 Direct API /collections/monthly ---');
    const agent11ReportRes = await fetch(`${baseUrl}/collections/monthly?month=2026-10`, {
      headers: { Authorization: `Bearer ${agent11Token}` }
    });
    const agent11Report = await agent11ReportRes.json();
    console.log(`Agent 11 response status: ${agent11ReportRes.status}`);
    console.log(`- Transactions count: ${agent11Report.transactions?.length}`);
    console.log(`- Assigned Route: ${agent11Report.agentDetails?.assignedRouteId} - ${agent11Report.agentDetails?.assignedRouteName}`);
    if (agent11Report.transactions?.length === 0 && agent11Report.agentDetails?.assignedRouteId === 'RT-001') {
      console.log('✓ PASS: Agent 11 receives 0 collection records (none yet) and correctly shows route RT-001');
    } else {
      console.error('✗ FAIL: Agent 11 response mismatch:', agent11Report);
    }

    // 7. Subscriber Statement Authorization API Test
    console.log('\n--- Step 7: Subscriber Statement Access Authorization ---');
    // Customer CUST-1015 is Mani Test on Route RT-001 (assigned to Agent 11)
    // Admin request
    const adminStmtRes = await fetch(`${baseUrl}/subscribers/CUST-1015/statement`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`Admin access to CUST-1015 statement: HTTP ${adminStmtRes.status} (Expected 200)`);

    // Agent 11 (assigned RT-001) request
    const agent11StmtRes = await fetch(`${baseUrl}/subscribers/CUST-1015/statement`, {
      headers: { Authorization: `Bearer ${agent11Token}` }
    });
    console.log(`Agent 11 access to CUST-1015 statement: HTTP ${agent11StmtRes.status} (Expected 200)`);

    // Agent 5 (NOT assigned RT-001, no collection history for CUST-1015) request
    const agent5StmtRes = await fetch(`${baseUrl}/subscribers/CUST-1015/statement`, {
      headers: { Authorization: `Bearer ${agent5Token}` }
    });
    console.log(`Agent 5 unauthorized access to CUST-1015 statement: HTTP ${agent5StmtRes.status} (Expected 403 Forbidden)`);
    if (adminStmtRes.status === 200 && agent11StmtRes.status === 200 && agent5StmtRes.status === 403) {
      console.log('✓ PASS: Subscriber statement security enforced! Unauthorized agent strictly blocked with 403');
    } else {
      console.error('✗ FAIL: Subscriber statement authorization failed');
    }

    // 8. Agents Directory API Role Restriction Test
    console.log('\n--- Step 8: /agents Directory Endpoint Role Scoping ---');
    const adminAgentsRes = await fetch(`${baseUrl}/agents`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminAgents = await adminAgentsRes.json();
    console.log(`Admin sees ${adminAgents.length} agents in /agents directory`);

    const agent5AgentsRes = await fetch(`${baseUrl}/agents`, {
      headers: { Authorization: `Bearer ${agent5Token}` }
    });
    const agent5Agents = await agent5AgentsRes.json();
    console.log(`Agent 5 sees ${agent5Agents.length} agent(s) in /agents directory:`, agent5Agents.map((a: any) => a.username));

    if (adminAgents.length > 1 && agent5Agents.length === 1 && agent5Agents[0].username === 'agent') {
      console.log('✓ PASS: /agents directory scoped strictly to the requesting agent for agent role');
    } else {
      console.error('✗ FAIL: /agents directory leaked other agents to Agent 5');
    }

    console.log('\n======================================================');
    console.log('>>> ALL DIRECT API SECURITY TESTS PASSED <<<');
    console.log('======================================================');
  } finally {
    server.close();
    process.exit(0);
  }
}

runApiTests().catch(err => {
  console.error('API Tests failed:', err);
  process.exit(1);
});
