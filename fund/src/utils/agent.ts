import type { AgentReceipt } from '../types/agent';
import { generatePaymentReceiptPDF } from './pdfGenerator';

export function formatINR(value: number): string {
  return `₹${(value ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function formatMoney(value: number): string {
  return `₹${(value ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr.length <= 10 ? `${dateStr}T00:00:00` : dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr.length <= 10 ? `${dateStr}T00:00:00` : dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function downloadCSV(filename: string, rows: Record<string, unknown>[]): void {
  if (!rows || rows.length === 0) {
    alert('No data to export');
    return;
  }
  const headers = Object.keys(rows[0]);
  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [
      headers.join(','),
      ...rows.map((r) =>
        headers
          .map((h) => {
            const val = r[h] !== undefined && r[h] !== null ? String(r[h]) : '';
            return `"${val.replace(/"/g, '""')}"`;
          })
          .join(',')
      )
    ].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function buildReceiptText(receipt: AgentReceipt): string {
  const bankType = receipt.paymentMethod === 'cash' ? 'CASH' : 'ONLINE';
  const lines = [
    '==========================================',
    '       OFFICIAL COLLECTION RECEIPT',
    '==========================================',
    `Receipt No   : ${receipt.receiptNumber}`,
    `Collected On : ${formatDateTime(receipt.collectedAt)}`,
    `Collected By : ${receipt.agentName}`,
    '------------------------------------------',
    `Customer     : ${receipt.customerName}`,
    `Phone        : ${receipt.phone}`,
    `Chit Group   : ${receipt.chitGroupCode}`,
    `Ticket No    : ${receipt.ticketNumber}`,
    '------------------------------------------',
    `Amount Paid  : ${formatMoney(receipt.amountCollected)}`,
    `Mode         : ${bankType}`,
    `Remaining    : ${formatMoney(receipt.remainingBalance)}`,
    receipt.notes ? `Notes        : ${receipt.notes}` : '',
    '------------------------------------------',
    'This is a computer generated receipt and',
    'does not require a physical signature.',
    '==========================================',
  ];
  return lines.filter(Boolean).join('\n');
}

export function downloadReceiptTextFile(receipt: AgentReceipt): void {
  generatePaymentReceiptPDF({
    receiptNumber: receipt.receiptNumber,
    collectedAt: receipt.collectedAt,
    customerName: receipt.customerName,
    customerId: receipt.customerId,
    phone: receipt.phone,
    chitGroupCode: receipt.chitGroupCode,
    ticketNumber: receipt.ticketNumber,
    amountCollected: receipt.amountCollected,
    paymentMethod: receipt.paymentMethod,
    remainingBalance: receipt.remainingBalance,
    agentName: receipt.agentName,
    notes: receipt.notes,
    companyName: 'JIVAN CHIT FUNDS (INDIA) PVT LTD.',
    companyAddress: 'Regd. Office: 123 Main Street, City Branch • Govt Registered Chit Funds',
    companyPhone: '+91-9876543210',
    companyEmail: 'info@chitfund.com'
  });
}

export const downloadReceiptPDF = downloadReceiptTextFile;