import React from 'react';
import { X, CheckCircle2, Download, Printer, Phone, IndianRupee } from 'lucide-react';
import { downloadAgentReceipt, formatAmount, formatDateTime } from '../../services/agentApi';
import type { AgentReceipt } from '../../types/agent';
import { Logo } from '../../components/Logo';

interface AgentReceiptModalProps {
  receipt: AgentReceipt;
  onClose: () => void;
}

export const AgentReceiptModal: React.FC<AgentReceiptModalProps> = ({ receipt, onClose }) => {
  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=560,height=760');
    if (!win) {
      downloadAgentReceipt(receipt);
      return;
    }
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${receipt.receiptNumber}</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; padding: 28px; }
            .center { text-align: center; }
            h2 { margin: 0 0 2px 0; font-size: 18px; font-weight: 800; color: #0f172a; }
            .meta { font-size: 11px; color: #475569; }
            .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 14px; margin-top: 14px; font-size: 12px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
            .value { font-weight: 700; margin-top: 2px; }
            .amount { font-size: 20px; font-weight: 800; color: #047857; margin-top: 4px; }
            .rule { border-top: 1px solid #e2e8f0; margin: 12px 0 10px 0; }
            .footer { margin-top: 24px; font-size: 9.5px; color: #94a3b8; text-align: center; }
          </style>
        </head>
        <body>
          <div class="center">
            <img src="/logo.png" style="width: 54px; height: 54px; object-fit: contain; margin: 0 auto 8px auto; display: block;" alt="Jivan Chit Funds Logo" />
            <h2>JIVAN CHIT FUNDS (INDIA) PVT LTD.</h2>
            <p class="meta">Regd. Office: 123 Main Street, City Branch • Govt Registered Chit Funds</p>
            <p class="meta" style="margin-top:6px;">Receipt No: <b>${receipt.receiptNumber}</b> &bull; ${formatDateTime(receipt.collectedAt)}</p>
          </div>
          <div class="box">
            <div class="grid">
              <div><div class="label">Customer</div><div class="value">${receipt.customerName}</div></div>
              <div><div class="label">Phone</div><div class="value">${receipt.phone}</div></div>
              <div><div class="label">Chit Group</div><div class="value">${receipt.chitGroupCode}</div></div>
              <div><div class="label">Ticket Number</div><div class="value">#${receipt.ticketNumber}</div></div>
            </div>
          </div>
          <div class="box">
            <div class="label">Amount Collected</div>
            <div class="amount">${formatAmount(receipt.amountCollected)}</div>
            <div class="rule"></div>
            <div class="grid">
              <div><div class="label">Payment Method</div><div class="value">${receipt.paymentMethod === 'cash' ? 'Cash' : 'Online'}</div></div>
              <div><div class="label">Collected By</div><div class="value">${receipt.agentName}</div></div>
              <div><div class="label">Remaining Balance</div><div class="value">${formatAmount(receipt.remainingBalance)}</div></div>
              ${receipt.notes ? `<div><div class="label">Notes</div><div class="value">${receipt.notes}</div></div>` : ''}
            </div>
          </div>
          <div class="footer">Computer generated receipt &bull; Thank you for your payment.</div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-emerald-50 border-b border-emerald-100 shrink-0">
          <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm min-w-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="truncate">Payment collected successfully</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt body */}
        <div className="p-4 sm:p-6 space-y-3 overflow-y-auto flex-1">
          <div className="text-center border-b border-slate-100 pb-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Logo size={24} className="w-6 h-6" />
              <h2 className="text-sm font-bold text-slate-900 tracking-wide uppercase">JIVAN CHIT FUNDS (INDIA) PVT LTD.</h2>
            </div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
              Official Chit Collection Receipt
            </p>
            <div className="mt-2 inline-block bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold">
              {receipt.receiptNumber}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              {formatDateTime(receipt.collectedAt)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
              <span className="text-[10px] uppercase tracking-wide text-slate-500 block">Customer</span>
              <span className="font-bold text-slate-900 block mt-0.5 truncate">{receipt.customerName}</span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
              <span className="text-[10px] uppercase tracking-wide text-slate-500 block">Phone</span>
              <span className="font-medium text-slate-700 block mt-0.5 font-mono flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" /> {receipt.phone}
              </span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
              <span className="text-[10px] uppercase tracking-wide text-slate-500 block">Chit Group</span>
              <span className="font-bold text-slate-900 block mt-0.5">{receipt.chitGroupCode}</span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
              <span className="text-[10px] uppercase tracking-wide text-slate-500 block">Ticket Number</span>
              <span className="font-bold text-amber-800 block mt-0.5 font-mono">#{receipt.ticketNumber}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-lg bg-slate-900 text-white px-3 py-3">
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-400">
                <IndianRupee className="w-3 h-3" /> Amount Collected
              </span>
              <span className="text-xl font-bold block mt-1 font-mono text-emerald-400">
                {formatAmount(receipt.amountCollected)}
              </span>
              <span className="text-[11px] text-slate-300 mt-1 block uppercase tracking-wide">
                {receipt.paymentMethod === 'cash' ? 'Cash' : 'Online'}
              </span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 flex flex-col justify-center">
              <span className="text-[10px] uppercase tracking-wide text-slate-500">Remaining Balance</span>
              <span
                className={`text-lg font-bold block mt-1 font-mono ${
                  receipt.remainingBalance > 0 ? 'text-amber-700' : 'text-emerald-700'
                }`}
              >
                {formatAmount(receipt.remainingBalance)}
              </span>
              <span className="text-[11px] text-slate-400 mt-1">Collected by {receipt.agentName}</span>
            </div>
          </div>

          {receipt.notes && (
            <div className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              Note: {receipt.notes}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-4 text-center text-[10px] text-slate-400">
            <div>
              <div className="h-8 border-b border-dashed border-slate-300" />
              <span className="mt-1 block">Subscriber Signature</span>
            </div>
            <div>
              <div className="h-8 border-b border-dashed border-slate-300 flex items-end justify-center pb-0.5">
                <span className="text-slate-700 font-semibold text-[11px]">{receipt.agentName}</span>
              </div>
              <span className="mt-1 block">Authorized Agent</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-200 bg-slate-50 grid grid-cols-3 gap-2 shrink-0">
          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-1.5 px-2 py-2.5 min-h-[44px] rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-white transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
          <button
            onClick={() => downloadAgentReceipt(receipt)}
            className="inline-flex items-center justify-center gap-1.5 px-2 py-2.5 min-h-[44px] rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-white transition"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center px-2 py-2.5 min-h-[44px] rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};