import React from 'react';
import { X, Printer, Download, CheckCircle2 } from 'lucide-react';
import type { PaymentReceipt } from '../types';
import { Logo } from './Logo';
import { generatePaymentReceiptPDF } from '../utils/pdfGenerator';

interface PaymentReceiptModalProps {
  receipt: PaymentReceipt | null;
  onClose: () => void;
}

// Format raw ISO/date strings to clean DD/MM/YYYY for printing
function formatSlipDate(dateStr?: string): string {
  if (!dateStr) return new Date().toLocaleDateString('en-IN');
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

// Convert amount number to words for real Indian chit fund receipt
function numberToWordsINR(amount: number): string {
  const num = Math.floor(amount);
  if (num === 0) return 'ZERO RUPEES ONLY';
  
  const a = ['', 'ONE ', 'TWO ', 'THREE ', 'FOUR ', 'FIVE ', 'SIX ', 'SEVEN ', 'EIGHT ', 'NINE ', 'TEN ', 'ELEVEN ', 'TWELVE ', 'THIRTEEN ', 'FOURTEEN ', 'FIFTEEN ', 'SIXTEEN ', 'SEVENTEEN ', 'EIGHTEEN ', 'NINETEEN '];
  const b = ['', '', 'TWENTY ', 'THIRTY ', 'FORTY ', 'FIFTY ', 'SIXTY ', 'SEVENTY ', 'EIGHTY ', 'NINETY '];

  function inWords(n: number): string {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + a[n % 10];
    if (n < 1000) return a[Math.floor(n / 100)] + 'HUNDRED ' + (n % 100 !== 0 ? inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + 'THOUSAND ' + (n % 1000 !== 0 ? inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'LAKH ' + (n % 100000 !== 0 ? inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + 'CRORE ' + (n % 10000000 !== 0 ? inWords(n % 10000000) : '');
  }

  return `${inWords(num).trim()} ONLY`;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({ receipt, onClose }) => {
  if (!receipt) return null;

  React.useEffect(() => {
    document.body.classList.add('printing-modal');
    return () => {
      document.body.classList.remove('printing-modal');
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    generatePaymentReceiptPDF(receipt);
  };

  const amountInWords = numberToWordsINR(receipt.amountPaid);
  const formattedDate = formatSlipDate(receipt.paymentDate);

  return (
    <div id="receipt-modal-backdrop" className="printable-modal fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto print:p-0 print:overflow-visible print:bg-white print:static">
      <div className="printable-modal-content relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto max-h-[95vh] flex flex-col print:max-h-none print:overflow-visible print:shadow-none print:border-none print:w-full print:max-w-full">
        {/* Modal Header Actions (Hidden when printing) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white print:hidden shrink-0">
          <div className="flex items-center gap-2 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Payment Receipt Created — {receipt.receiptNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="download-receipt-pdf-btn"
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition shadow-xs cursor-pointer"
              title="Download official formatted PDF receipt"
            >
              <Download className="w-4 h-4 text-white" />
              <span>Download PDF</span>
            </button>
            <button
              id="print-receipt-btn"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-900" />
              <span>Print Official Receipt</span>
            </button>
            <button
              id="close-receipt-btn"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PHYSICAL REAL CHIT FUND RECEIPT BOOK LOOK */}
        <div id="printable-receipt" className="p-6 sm:p-8 bg-white text-slate-900 overflow-y-auto flex-1 font-sans print:p-0 print:overflow-visible">
          <div className="border-2 border-slate-900 rounded-xl p-5 sm:p-6 relative bg-gradient-to-b from-blue-50/20 to-amber-50/20 shadow-xs">
            
            {/* Header with Golden Emblem Vector Logo */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center">
                  <Logo className="w-full h-full" size={64} />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-wide uppercase leading-tight font-serif">
                    JIVAN CHIT FUNDS (INDIA) PVT LTD.
                  </h1>
                  <p className="text-[11px] text-slate-700 font-medium">
                    Regd. Office: 123 Main Street, City Branch • Govt Registered Chit Funds
                  </p>
                  <p className="text-[10px] text-slate-600 font-mono">
                    Ph: {receipt.companyPhone} • Email: {receipt.companyEmail}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-black text-slate-900 font-mono">
                  No. <span className="text-base text-rose-700 font-bold">{receipt.receiptNumber}</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-700 mt-1 font-mono">
                  Date: <span className="font-bold underline">{formattedDate}</span>
                </div>
              </div>
            </div>

            {/* Receipt Details Grid (Matching Physical Slip) */}
            <div className="space-y-3.5 text-xs font-medium text-slate-800">
              {/* Row 1: Chit Group & Ticket No */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-slate-300">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Gr. No. / Scheme Name:</span>
                  <span className="font-bold text-slate-900 text-sm font-mono">{receipt.groupName} ({receipt.groupId})</span>
                </div>
                <div className="sm:text-right">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Ticket No.:</span>
                  <span className="font-black text-amber-900 text-base font-mono bg-amber-100 px-2 py-0.5 rounded border border-amber-300 inline-block">
                    #{receipt.ticketNumber}
                  </span>
                </div>
              </div>

              {/* Row 2: Subscriber Name & Route/Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Subscriber Name:</span>
                  <span className="font-bold text-slate-900 text-sm tracking-wide uppercase border-b border-dotted border-slate-500 block pt-0.5">
                    {receipt.customerName} ({receipt.customerId})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Installment Month:</span>
                  <span className="font-bold text-slate-900 text-xs border-b border-dotted border-slate-500 block pt-0.5">
                    Month #{receipt.monthNumber} Installment
                  </span>
                </div>
              </div>

              {/* Row 3: Amount in Words */}
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Rupees in Words:</span>
                <div className="bg-slate-50 p-2.5 rounded border border-slate-300 font-bold text-slate-900 uppercase font-mono tracking-wide text-xs">
                  {amountInWords}
                </div>
              </div>

              {/* Row 4: Financial Calculation Table */}
              <div className="border border-slate-900 rounded-lg overflow-hidden my-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900 text-white font-bold text-[11px] uppercase">
                    <tr>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 font-mono font-medium">
                    <tr>
                      <td className="py-2 px-3">Monthly Gross Installment Amount</td>
                      <td className="py-2 px-3 text-right font-bold">₹{receipt.installmentAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    {receipt.dividendDeduction > 0 && (
                      <tr className="bg-emerald-50/60">
                        <td className="py-2 px-3 text-emerald-800">Less: Auction Dividend Credit</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-800">-₹{receipt.dividendDeduction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    )}
                    <tr className="bg-amber-100/70 font-black text-slate-900">
                      <td className="py-2.5 px-3 uppercase text-[11px] font-sans">RECEIVED AMOUNT (₹)</td>
                      <td className="py-2.5 px-3 text-right text-base text-emerald-800">₹{receipt.amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Payment Mode & Outstanding Info */}
              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <span className="text-slate-500 font-bold block">Payment Mode:</span>
                  <span className="font-bold text-slate-900">{receipt.paymentMode} {receipt.transactionReference ? `(Ref: ${receipt.transactionReference})` : ''}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 font-bold block">Remaining Pending Balance:</span>
                  <span className="font-bold font-mono text-rose-700 text-sm">
                    ₹{receipt.remainingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Bottom Stamp & Signature Line */}
              <div className="pt-8 mt-4 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
                <div className="flex flex-col items-center justify-end">
                  <div className="w-36 border-b-2 border-slate-800"></div>
                  <span className="text-slate-700 font-bold mt-1">Subscriber Signature</span>
                </div>
                <div className="flex flex-col items-center justify-end">
                  <span className="text-xs text-slate-800 font-bold font-serif italic mb-0.5">{receipt.collectedByName || 'Authorized Receiver'}</span>
                  <div className="w-36 border-b-2 border-slate-800"></div>
                  <span className="text-slate-700 font-bold mt-1">Authorized Receiver / Cashier</span>
                </div>
              </div>
            </div>

            {/* Bottom Footer Notice */}
            <div className="mt-4 pt-2 border-t border-dotted border-slate-400 text-[10px] text-slate-500 text-center font-mono">
              Official Computer Generated Receipt • Jivan Chit Funds (India) Pvt Ltd • Subject to Salem Jurisdiction
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
