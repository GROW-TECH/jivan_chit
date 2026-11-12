import dotenv from 'dotenv';
dotenv.config();
import { db, initDb } from './server/db.ts';

async function main() {
  console.log('=== 1. Testing DB Routes Initialization & Fetching ===');
  await initDb();
  const routes = await db.getRoutes();
  console.log('Routes in DB count:', routes.length);
  routes.forEach(r => console.log(`  - [${r.routeId}] ${r.routeName} (${r.area}, ${r.city}) -> Agent: ${r.assignedAgentName || 'None'}`));

  console.log('\n=== 2. Testing Users & Route Assignment ===');
  const users = await db.getUsers();
  const agents = users.filter(u => u.role === 'agent');
  console.log('Field agents in DB:', agents.map(a => `${a.id}: ${a.username} - ${a.fullName} (assignedRoute: ${a.assignedRouteId || 'none'})`));

  const targetAgent = agents[0] || { id: 3, fullName: 'Agent', username: 'agent' };

  console.log('\n=== 3. Testing Route Assignment to Agent & Customer ===');
  // Assign RT-001 to target agent
  await db.updateRoute('RT-001', { assignedAgentId: targetAgent.id });
  const updatedRoute = await db.getRouteById('RT-001');
  console.log(`Assigned RT-001 to Agent: ${updatedRoute?.assignedAgentName} (ID: ${updatedRoute?.assignedAgentId})`);

  // Assign customer 1 to RT-001
  const allCustomers = await db.getCustomers();
  if (allCustomers.length > 0) {
    await db.updateCustomer(allCustomers[0].customerId, { routeId: 'RT-001' });
    const c = await db.getCustomerById(allCustomers[0].customerId);
    console.log(`Assigned customer ${c?.fullName} to route ${c?.routeId} (${c?.routeName}), Responsible Agent: ${c?.assignedAgentName}`);
  }

  console.log(`\n=== 4. Testing Route Scoping for Assigned Agent (${targetAgent.username}, ID ${targetAgent.id}) ===`);
  const agentProfile = await db.getAgentProfile(targetAgent.id);
  console.log(`Agent ${targetAgent.id} Profile:`, {
    name: agentProfile.name,
    routeId: agentProfile.routeId,
    routeName: agentProfile.routeName,
    area: agentProfile.area,
    assignedCustomers: agentProfile.assignedCustomers
  });

  const agentSheet = await db.getAgentCollectionSheet({ dateType: 'month' }, targetAgent.id, 'agent');
  console.log(`Collection sheet items for Agent ${targetAgent.id}: ${agentSheet.length}`);
  if (agentSheet.length > 0) {
    console.log('Sample sheet item:', {
      customerName: agentSheet[0].customerName,
      group: agentSheet[0].chitGroupCode,
      dueAmount: agentSheet[0].dueInstallmentAmount,
      address: agentSheet[0].address,
      phone: agentSheet[0].phone
    });
  }

  console.log('\n=== 5. Testing Daily Cash Handover Workflow ===');
  const testAgent = agents[0] || { id: 3 };
  const handover = await db.createDailyHandover({
    agentUserId: testAgent.id,
    handoverDate: '2026-10-12',
    totalCash: 5000,
    totalOnline: 1000,
    receiptsCount: 2,
    declaredCash: 5000,
    discrepancy: 0,
    commissionAmount: 250,
    notes: 'Test cash handover'
  });
  console.log('Created Handover:', handover.handoverId, 'Status:', handover.status);

  const handovers = await db.getDailyHandovers({ agentUserId: testAgent.id });
  console.log(`Daily handovers count for agent: ${handovers.length}`);

  const verified = await db.verifyDailyHandover(handover.handoverId, 'verified', 'Cash counted and locked');
  console.log('Verified Handover:', verified?.handoverId, 'Status:', verified?.status);

  console.log('\n>>> ALL BACKEND ROUTE & AGENT TESTS PASSED WITHOUT ERRORS! <<<');
  process.exit(0);
}

main().catch(err => {
  console.error('FAILED WITH ERROR:', err);
  process.exit(1);
});
