import { db } from '../server/db';

async function main() {
  console.log('--- Testing Reports Data and Field Mapping ---');

  // Test 1: Chit Booking List (Tab 2 data source)
  const bookingList = await db.getChitBookingList();
  console.log(`Chit Booking items retrieved: ${bookingList.length}`);

  if (bookingList.length > 0) {
    const first = bookingList[0];
    console.log('Sample Booking Record:');
    console.log({
      sNo: first.sNo,
      newGroupNo: first.newGroupNo,
      name: first.name,
      phoneNumber: first.phoneNumber,
      chitValue: first.chitValue,
      fullChitValue: first.fullChitValue,
      month: first.month,
      ticketNumber: first.ticketNumber,
      joiningDate: first.joiningDate,
      groupingDate: first.groupingDate,
      installmentAmount: first.installmentAmount,
      totalPaid: first.totalPaid,
      totalPending: first.totalPending,
      status: first.status,
      groupName: first.groupName
    });

    if (!first.name || first.name === '') {
      throw new Error('Subscriber name is missing!');
    }
    if (!first.phoneNumber || first.phoneNumber === '') {
      throw new Error('Subscriber phone number is missing!');
    }
    if (first.chitValue === undefined || first.chitValue === null) {
      throw new Error('Chit value is missing!');
    }
  }

  console.log('✅ Tab 2 data mapping verified successfully!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
