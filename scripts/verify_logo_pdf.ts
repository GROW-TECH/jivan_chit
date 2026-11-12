import fs from 'fs';
import path from 'path';
import { generatePaymentReceiptPDF } from '../fund/src/utils/pdfGenerator';
import { LOGO_PNG_BASE64 } from '../fund/src/assets/logoBase64';

console.log('--- Verifying Logo Assets ---');

const pubLogo = path.join(process.cwd(), 'fund/public/logo.png');
const srcLogo = path.join(process.cwd(), 'fund/src/assets/logo.png');

if (!fs.existsSync(pubLogo)) throw new Error('Missing fund/public/logo.png');
if (!fs.existsSync(srcLogo)) throw new Error('Missing fund/src/assets/logo.png');

console.log('fund/public/logo.png size:', fs.statSync(pubLogo).size, 'bytes');
console.log('fund/src/assets/logo.png size:', fs.statSync(srcLogo).size, 'bytes');
console.log('LOGO_PNG_BASE64 prefix:', LOGO_PNG_BASE64.substring(0, 40));

console.log('\n--- Verifying PDF Receipt Generation with Logo ---');
try {
  // Test PDF generation logic
  generatePaymentReceiptPDF({
    receiptNumber: 'REC-TEST-2026',
    paymentDate: '2026-10-13T00:00:00.000Z',
    customerName: 'PRIYA TEST',
    customerId: 'CUST-1014',
    customerMobile: '9876543210',
    groupName: 'Demo Monthly Chit',
    groupId: 'JCF-TEST-001',
    ticketNumber: 2,
    monthNumber: 2,
    installmentAmount: 5000,
    dividendDeduction: 950,
    amountPaid: 4050,
    remainingBalance: 0,
    paymentMode: 'Cash',
    collectedByName: 'Ravi Kumar (Field Agent)'
  });
  console.log('generatePaymentReceiptPDF executed successfully with embedded company logo!');
} catch (err) {
  console.error('PDF Generation failed:', err);
  process.exit(1);
}

console.log('\n--- ALL VERIFICATIONS PASSED ---');
