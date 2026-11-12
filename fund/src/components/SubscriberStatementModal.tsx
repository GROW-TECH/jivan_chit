import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import { generateSubscriberStatementPDF, SubscriberStatementPDFData } from '../utils/pdfGenerator';

interface SubscriberStatementModalProps {
  customerId: string | null;
  groupId?: string;
  onClose: () => void;
}

export const SubscriberStatementModal: React.FC<SubscriberStatementModalProps> = ({
  customerId,
  groupId,
  onClose
}) => {
  const [data, setData] = useState<SubscriberStatementPDFData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) return;
    let isMounted = true;
    setLoading(true);
    setError(null);

    api.getSubscriberStatement(customerId, groupId)
      .then((res: any) => {
        if (isMounted) {
          setData(res);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err.message || 'Failed to load subscriber statement');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [customerId, groupId]);

  useEffect(() => {
    document.body.classList.add('printing-modal');
    return () => {
      document.body.classList.remove('printing-modal');
    };
  }, []);

  if (!customerId) return null;

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `Monthly Collection - ${data?.subscriber.name || 'Subscriber'}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const handleDownloadPDF = () => {
    if (!data) return;
    generateSubscriberStatementPDF(data);
  };

  const formatAmt = (val: number) => {
    return (Number.isFinite(val) ? Math.round(val) : 0).toLocaleString('en-IN');
  };

  const modalJSX = (
    <div
      id="subscriber-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto max-h-[96vh] flex flex-col">
        {/* Top Action Bar (Hidden during Print) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white print:hidden shrink-0">
          <div className="flex items-center gap-2 font-bold text-sm">
            <span>Subscriber Monthly Collection Statement</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={loading || !data}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={loading || !data}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-12 bg-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-2" />
              <p className="text-sm">Loading subscriber collection statement...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <div>
                <p className="font-bold">Error loading statement</p>
                <p className="text-xs">{error}</p>
              </div>
            </div>
          ) : data ? (
            <div id="printable-subscriber-statement" className="w-full mx-auto font-sans text-black">
              {/* Center Title matching client's official letterhead and statement format */}
              <div className="text-center mb-6">
                <h1 className="text-2xl font-black tracking-wide uppercase text-black font-sans">
                  JIVAN CHITS SALEM (P) LTD.,
                </h1>
                <p className="text-xs text-black font-sans mt-0.5 font-medium">
                  No.463/8, Harish Tower, Ramasamy Nagar, East Thiruvagoundanur, Salem 636005.
                </p>
                <div className="mt-3 inline-block py-1 px-5 border border-black text-xs font-bold uppercase tracking-wider">
                  MONTHLY COLLECTION STATEMENT
                </div>
              </div>

              {/* Header Details (Exact 2-column layout from client's photo with ample space) */}
              <div className="grid grid-cols-2 gap-x-12 gap-y-3 mb-8 text-sm leading-relaxed text-black">
                {/* Left Column */}
                <div className="space-y-2">
                  <div className="grid grid-cols-[90px_1fr]">
                    <span className="font-bold">Name</span>
                    <span className="font-medium">: {data.subscriber.name}</span>
                  </div>
                  <div className="grid grid-cols-[90px_1fr]">
                    <span className="font-bold">Address</span>
                    <span className="font-medium whitespace-pre-line">: {[data.subscriber.address, data.subscriber.city].filter(Boolean).join(',\n  ')}</span>
                  </div>
                  <div className="grid grid-cols-[90px_1fr]">
                    <span className="font-bold">Pin Code</span>
                    <span className="font-medium">: {data.subscriber.pincode}</span>
                  </div>
                  <div className="grid grid-cols-[90px_1fr]">
                    <span className="font-bold">Ph No</span>
                    <span className="font-medium">: {data.subscriber.phone}</span>
                  </div>
                  <div className="grid grid-cols-[90px_1fr]">
                    <span className="font-bold">Group No</span>
                    <span className="font-bold">: {data.subscriber.groupNo}</span>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-2">
                  <div className="grid grid-cols-[105px_1fr]">
                    <span className="font-bold">Agent Name</span>
                    <span className="font-medium">: {data.chitDetails.agentName}</span>
                  </div>
                  <div className="grid grid-cols-[105px_1fr]">
                    <span className="font-bold">C.D</span>
                    <span className="font-medium">: {data.chitDetails.commencementDate}</span>
                  </div>
                  <div className="grid grid-cols-[105px_1fr]">
                    <span className="font-bold">T.D</span>
                    <span className="font-medium">: {data.chitDetails.terminationDate}</span>
                  </div>
                  <div className="grid grid-cols-[105px_1fr]">
                    <span className="font-bold">Paid On</span>
                    <span className="font-medium">: {data.transactions.length > 0 ? data.transactions[data.transactions.length - 1].date : '-'}</span>
                  </div>
                  <div className="grid grid-cols-[105px_1fr]">
                    <span className="font-bold">Amount</span>
                    <span className="font-medium">: ₹{formatAmt(data.chitDetails.monthlyInstallment || data.chitDetails.chitValue)}</span>
                  </div>
                </div>
              </div>

              {/* Transactions Table (Matching client's paper grid: spacious, no fighting for space) */}
              <div className="w-full my-6 overflow-hidden">
                <table className="w-full border-collapse border border-black text-xs sm:text-sm table-fixed">
                  <colgroup>
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '13%' }} />
                    <col style={{ width: '15%' }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-slate-100/90 text-black border-b border-black">
                      <th className="py-2.5 px-3 border border-black text-center font-bold">Date</th>
                      <th className="py-2.5 px-3 border border-black text-center font-bold">Mode Of Payment</th>
                      <th className="py-2.5 px-3 border border-black text-center font-bold">Bill No</th>
                      <th className="py-2.5 px-3 border border-black text-center font-bold">Collection Amount</th>
                      <th className="py-2.5 px-3 border border-black text-center font-bold">Total Collection</th>
                      <th className="py-2.5 px-3 border border-black text-center font-bold">Dividend</th>
                      <th className="py-2.5 px-3 border border-black text-center font-bold">Net Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 px-4 text-center text-slate-500 border border-black font-sans">
                          No collection transactions recorded for this chit group membership yet.
                        </td>
                      </tr>
                    ) : (
                      data.transactions.map((t, idx) => (
                        <tr key={idx} className="text-black">
                          <td className="py-2.5 px-3 border border-black text-center font-mono whitespace-nowrap">{t.date}</td>
                          <td className="py-2.5 px-3 border border-black text-left font-sans">{t.modeOfPayment}</td>
                          <td className="py-2.5 px-3 border border-black text-center font-mono">{t.billNo}</td>
                          <td className="py-2.5 px-3 border border-black text-right font-mono font-medium">{formatAmt(t.collectionAmount)}</td>
                          <td className="py-2.5 px-3 border border-black text-right font-mono font-medium">{formatAmt(t.totalCollection)}</td>
                          <td className="py-2.5 px-3 border border-black text-right font-mono font-medium">{formatAmt(t.dividend)}</td>
                          <td className="py-2.5 px-3 border border-black text-right font-mono font-bold">{formatAmt(t.netTotal)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {data.transactions.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-black bg-slate-50 font-bold text-black">
                        <td colSpan={3} className="py-2.5 px-3 border border-black text-center font-sans tracking-wide">
                          TOTALS
                        </td>
                        <td className="py-2.5 px-3 border border-black text-right font-mono">
                          {formatAmt(data.totals.totalCollection)}
                        </td>
                        <td className="py-2.5 px-3 border border-black text-right font-mono">
                          {formatAmt(data.totals.totalCollection)}
                        </td>
                        <td className="py-2.5 px-3 border border-black text-right font-mono">
                          {formatAmt(data.totals.totalDividend)}
                        </td>
                        <td className="py-2.5 px-3 border border-black text-right font-mono">
                          {formatAmt(data.totals.netTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Footer Signatures */}
              <div className="grid grid-cols-2 gap-12 mt-16 pt-8 text-xs text-black">
                <div className="text-left">
                  <div className="w-48 border-b border-black mb-2" />
                  <p className="font-bold">Subscriber Signature</p>
                </div>
                <div className="text-right flex flex-col items-end">
                  <div className="w-48 border-b border-black mb-2" />
                  <p className="font-bold">Authorized Signatory</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(modalJSX, document.body);
};
