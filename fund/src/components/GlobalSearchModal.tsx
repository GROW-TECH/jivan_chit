import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Users, Coins, Ticket, Receipt, Loader2, ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import type { Customer, ChitGroup, Membership, Payment } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (view: string, id?: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectResult
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    customers: Customer[];
    groups: ChitGroup[];
    memberships: Membership[];
    payments: Payment[];
  }>({
    customers: [],
    groups: [],
    memberships: [],
    payments: []
  });

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ customers: [], groups: [], memberships: [], payments: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ customers: [], groups: [], memberships: [], payments: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.search(query.trim());
        setResults(data);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const hasAnyResults =
    results.customers.length > 0 ||
    results.groups.length > 0 ||
    results.memberships.length > 0 ||
    results.payments.length > 0;

  return (
    <div id="search-modal-backdrop" className="fixed inset-0 z-50 flex items-start justify-center pt-3 sm:pt-24 bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 max-h-[88vh] flex flex-col">
        {/* Search Bar Input */}
        <div className="flex items-center px-3.5 sm:px-4 py-3 border-b border-slate-200 bg-slate-50/50 shrink-0">
          <Search className="w-5 h-5 text-slate-400 mr-2.5 sm:mr-3 shrink-0" />
          <input
            ref={inputRef}
            id="global-search-input"
            type="text"
            placeholder="Search customer, ID, mobile, group, ticket, or receipt..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none min-w-0"
          />
          {loading && <Loader2 className="w-4 h-4 text-amber-600 animate-spin mr-2 shrink-0" />}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/50 shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Container */}
        <div className="overflow-y-auto p-3 sm:p-4 space-y-4 text-xs flex-1">
          {!query.trim() && (
            <div className="text-center py-8 text-slate-400">
              <p>Type to search across customers, chit groups, tickets, and payments</p>
              <div className="flex justify-center gap-2 mt-2 text-[11px]">
                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500">e.g. "Karthik"</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500">"SILVER"</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500">"REC-2025"</span>
              </div>
            </div>
          )}

          {query.trim() && !loading && !hasAnyResults && (
            <div className="text-center py-8 text-slate-500">
              No records found matching "{query}"
            </div>
          )}

          {/* Customers Section */}
          {results.customers.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase text-[10px] tracking-wider mb-2">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>Customers ({results.customers.length})</span>
              </div>
              <div className="space-y-1">
                {results.customers.map((c) => (
                  <button
                    key={c.customerId}
                    onClick={() => {
                      onSelectResult('customers', c.customerId);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-amber-50/70 border border-transparent hover:border-amber-200 transition text-left"
                  >
                    <div>
                      <span className="font-semibold text-slate-900 block text-xs">{c.fullName}</span>
                      <span className="text-slate-500 font-mono text-[11px]">{c.customerId} • {c.mobileNumber} • {c.city}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chit Groups Section */}
          {results.groups.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase text-[10px] tracking-wider mb-2">
                <Coins className="w-3.5 h-3.5 text-amber-600" />
                <span>Chit Groups ({results.groups.length})</span>
              </div>
              <div className="space-y-1">
                {results.groups.map((g) => (
                  <button
                    key={g.groupId}
                    onClick={() => {
                      onSelectResult('chit-groups', g.groupId);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-amber-50/70 border border-transparent hover:border-amber-200 transition text-left"
                  >
                    <div>
                      <span className="font-semibold text-slate-900 block text-xs">{g.groupName}</span>
                      <span className="text-slate-500 font-mono text-[11px]">{g.groupId} • ₹{g.chitValue.toLocaleString()} • {g.numMembers} Members</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Memberships / Tickets */}
          {results.memberships.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase text-[10px] tracking-wider mb-2">
                <Ticket className="w-3.5 h-3.5 text-indigo-600" />
                <span>Memberships & Tickets ({results.memberships.length})</span>
              </div>
              <div className="space-y-1">
                {results.memberships.map((m) => (
                  <button
                    key={m.membershipId}
                    onClick={() => {
                      onSelectResult('members', m.membershipId);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-amber-50/70 border border-transparent hover:border-amber-200 transition text-left"
                  >
                    <div>
                      <span className="font-semibold text-slate-900 block text-xs">
                        {m.customerName} <span className="text-amber-700 font-mono font-bold">(Ticket #{m.ticketNumber})</span>
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">{m.membershipId} • {m.groupName}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Payments */}
          {results.payments.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase text-[10px] tracking-wider mb-2">
                <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                <span>Payments & Receipts ({results.payments.length})</span>
              </div>
              <div className="space-y-1">
                {results.payments.map((p) => (
                  <button
                    key={p.receiptNumber}
                    onClick={() => {
                      onSelectResult('payments', p.receiptNumber);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-amber-50/70 border border-transparent hover:border-amber-200 transition text-left"
                  >
                    <div>
                      <span className="font-semibold text-slate-900 block text-xs">
                        Receipt {p.receiptNumber} • ₹{p.amountPaid.toLocaleString()}
                      </span>
                      <span className="text-slate-500 text-[11px]">{p.customerName} • {p.groupName} • {p.paymentDate}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
