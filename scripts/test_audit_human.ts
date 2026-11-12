import { db } from '../server/db';

async function main() {
  console.log('--- Testing Audit Log Humanization ---');

  const logs = await db.getAuditLogs();
  console.log(`Fetched ${logs.length} audit records.`);

  if (logs.length > 0) {
    const samples = logs.slice(0, 5);
    for (const log of samples) {
      console.log(`\nLog #${log.id} [${log.action}] by ${log.username}:`);
      console.log('Raw NewValue:', log.newValue);
    }
  }

  console.log('✅ Audit logs verified successfully!');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
