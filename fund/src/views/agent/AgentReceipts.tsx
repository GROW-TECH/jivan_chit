import React, { useEffect, useState } from 'react';
import { FileText, Download, Eye, AlertCircle, Search, Banknote, Smartphone, Phone, Edit2, Trash2 } from 'lucide-react';
import type { AgentReceipt } from '../../types/agent';
import { agentApi, formatAmount, formatDateTime, downloadAgentReceipt } from '../../services/agentApi';
import { AgentReceiptModal } from './AgentReceiptModal';

const AGENT_ID = 'agent-001';

interface AgentReceiptsProps {
  agentName: string;
}

export const AgentReceipts: React.FC<AgentReceiptsProps> = ({ agentName }) => {
  const [receipts, setReceipts] = useState<AgentReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<AgentReceipt | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await agentApi.getAgentReceipts(AGENT_ID);
        if (!cancelled) setReceipts(Array.isArray(data) ? data : []);
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Unable to load receipts. Please try again.');
          setReceipts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const safeReceipts = Array.isArray(receipts) ? receipts : [];

  const filtered = safeReceipts.filter((r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [r.customerName, r.phone, r.receiptNumber, r.chitGroupCode, r.ticketNumber].some((v) =>
      String(v).toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <FileText className="w-6 h-6 text-sky-600" />
          Receipts
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Payment receipts collected by <span className="font-semibold text-slate-700">{agentName}</span>
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by receipt, customer, phone or group..."
          className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {loading ? (
        <div className="p-8 flex items-center justify-center min-h-64">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Loading receipts...</p>
          </div>
        </div>
      ) : error ? (
        <div className="p-6">
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm flex items-center justify-between gap-4">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              {error}
            </span>
            <button
              onClick={() => {
                setQuery('');
                window.location.reload();
              }}
              className="text-xs font-bold underline ml-4 shrink-0"
            >
              Retry
            </button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            <FileText className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-700">No receipt records found.</p>
          <p className="text-xs text-slate-400 mt-1">
            {query ? 'Try a different search term.' : 'Collect a payment to generate your first receipt.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="hidden md:grid grid-cols-[1.4fr_1.6fr_1fr_0.8fr_1fr_1.2fr] gap-3 px-4 sm:px-5 py-2.5 border-b border-slate-200 bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
            <span>Receipt</span>
            <span>Customer</span>
            <span>Chit Group</span>
            <span>Amount</span>
            <span>Collected At</span>
            <span className="text-right">Action</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {filtered.map((r) => (
              <li key={r.receiptNumber} className="px-4 sm:px-5 py-3 hover:bg-slate-50/60 transition">
                <div className="hidden md:grid grid-cols-[1.4fr_1.6fr_1fr_0.8fr_1fr_1.2fr] gap-3 items-center text-xs">
                  <span className="font-mono font-semibold text-slate-900">{r.receiptNumber}</span>
                  <span>
                    <span className="block font-semibold text-slate-900 truncate">{r.customerName}</span>
                    <span className="block text-[11px] text-slate-400 font-mono">{r.phone}</span>
                  </span>
                  <span className="font-mono text-slate-700">
                    {r.chitGroupCode} <span className="text-amber-800">#{r.ticketNumber}</span>
                  </span>
                  <span className="font-semibold text-emerald-700">{formatAmount(r.amountCollected)}</span>
                  <span className="text-slate-600">{formatDateTime(r.collectedAt)}</span>
                  <span className="text-right">
                    <button
                      onClick={() => setSelected(r)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition mr-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                    <button
                      onClick={() => downloadAgentReceipt(r)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition mr-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`Are you sure you want to delete receipt #${r.receiptNumber}?`)) {
                          try {
                            setReceipts((prev) => prev.filter((x) => x.receiptNumber !== r.receiptNumber));
                          } catch (err: any) {
                            alert(err.message || 'Failed to delete receipt');
                          }
                        }
                      }}
                      className="inline-flex items-center gap-1 p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition"
                      title="Delete Receipt"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </span>
                </div>

                {/* Mobile card */}
                <div className="md:hidden space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{r.customerName}</p>
                      <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {r.phone}
                      </p>
                    </div>
                    <span className="font-mono text-[11px] font-semibold text-slate-700 shrink-0">{r.receiptNumber}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Chit</span>
                      <span className="font-mono text-slate-700">{r.chitGroupCode}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Amount</span>
<span className="font-semibold text-emerald-700">{formatAmount(r.amountCollected)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Mode</span>
                      <span className="font-semibold text-slate-700 capitalize flex items-center gap-1">
                        {r.paymentMethod === 'cash' ? (
                          <Banknote className="w-3 h-3 text-amber-600" />
                        ) : (
                          <Smartphone className="w-3 h-3 text-sky-600" />
                        )}
                        {r.paymentMethod}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelected(r)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 min-h-[44px]"
                    >
                      <Eye className="w-4 h-4" />
                      View Receipt
                    </button>
                    <button
                      onClick={() => downloadAgentReceipt(r)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold min-h-[44px]"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selected && <AgentReceiptModal receipt={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};