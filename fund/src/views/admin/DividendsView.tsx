import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Calculator,
  Coins,
  Ticket,
  CheckCircle2,
  Info,
  Loader2,
  Building,
  Edit2,
  Trash2,
  X
} from 'lucide-react';
import { api } from '../../api/client';
import type { DividendDistribution, ChitGroup } from '../../types';

export const DividendsView: React.FC = () => {
  const [dividends, setDividends] = useState<DividendDistribution[]>([]);
  const [groups, setGroups] = useState<ChitGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Edit Dividend Modal
  const [showModal, setShowModal] = useState(false);
  const [editingDividend, setEditingDividend] = useState<DividendDistribution | null>(null);
  const [totalDiscount, setTotalDiscount] = useState<number | ''>('');
  const [foremanCommission, setForemanCommission] = useState<number | ''>('');
  const [distributableDividend, setDistributableDividend] = useState<number | ''>('');
  const [dividendPerMember, setDividendPerMember] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Live Simulator States
  const [simChitValue, setSimChitValue] = useState<number>(500000);
  const [simBidDiscount, setSimBidDiscount] = useState<number>(75000);
  const [simNumMembers, setSimNumMembers] = useState<number>(20);
  const [simCommissionPercent, setSimCommissionPercent] = useState<number>(5.0);

  const loadData = async () => {
    try {
      setLoading(true);
      const [divs, grps] = await Promise.all([
        api.getDividends(selectedGroupId !== 'all' ? selectedGroupId : undefined),
        api.getChitGroups()
      ]);
      setDividends(divs);
      setGroups(grps);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedGroupId]);

  const handleOpenEdit = (d: DividendDistribution) => {
    setEditingDividend(d);
    setTotalDiscount(d.totalDiscount);
    setForemanCommission(d.foremanCommission);
    setDistributableDividend(d.distributableDividend);
    setDividendPerMember(d.dividendPerMember);
    setModalError(null);
    setShowModal(true);
  };

  const handleSaveDividend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDividend) return;

    setSubmitting(true);
    setModalError(null);
    try {
      await api.updateDividend(editingDividend.dividendId, {
        totalDiscount: Number(totalDiscount),
        foremanCommission: Number(foremanCommission),
        distributableDividend: Number(distributableDividend),
        dividendPerMember: Number(dividendPerMember)
      });
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to update dividend record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDividend = async (dividendId: string) => {
    if (!confirm('Are you sure you want to permanently delete this dividend record?')) return;
    try {
      await api.deleteDividend(dividendId);
      setDividends((prev) => prev.filter((d) => d.dividendId !== dividendId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete dividend');
    }
  };

  // Simulator computations
  const simForemanCommission = Math.round((simChitValue * (simCommissionPercent / 100)) * 100) / 100;
  const simPrizeAmount = Math.max(0, simChitValue - simBidDiscount);
  const simDistributableDividend = Math.max(0, simBidDiscount - simForemanCommission);
  const simDividendPerMember = simNumMembers > 0 ? Math.round((simDistributableDividend / simNumMembers) * 100) / 100 : 0;
  const simMonthlyInstallment = simNumMembers > 0 ? Math.round((simChitValue / simNumMembers) * 100) / 100 : 0;
  const simNetInstallment = Math.max(0, simMonthlyInstallment - simDividendPerMember);

  const totalDividendsDistributed = dividends.reduce((s, d) => s + (d.distributableDividend || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Chit Dividends & Commission
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit auction bid discounts, statutory foreman commissions (5%), and distributed dividends per ticket
          </p>
        </div>
      </div>

      {/* Summary Stat & Explanation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-400 text-[10px] uppercase font-semibold block">Total Dividends Distributed</span>
          <span className="text-xl font-bold font-mono text-emerald-800 mt-1 block">
            ₹{totalDividendsDistributed.toLocaleString()}
          </span>
          <p className="text-[11px] text-slate-500 mt-1">Across all completed auction cycles</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-400 text-[10px] uppercase font-semibold block">Statutory Commission</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">5.0%</span>
          <p className="text-[11px] text-slate-500 mt-1">Under Section 21 of the Chit Funds Act</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-400 text-[10px] uppercase font-semibold block">Dividend Policy</span>
          <span className="text-sm font-bold text-slate-800 mt-1 block">Deducted from Next Month</span>
          <p className="text-[11px] text-slate-500 mt-1">Subscribers pay Net Due = Gross - Dividend</p>
        </div>
      </div>

      {/* Interactive Dividend Formula Simulator */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-600" />
            <h2 className="font-bold text-slate-900 text-sm">Interactive Chit Dividend Simulator</h2>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Real-time formula preview</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-600 font-medium mb-1">Chit Value (₹)</label>
            <input
              type="number"
              step="10000"
              value={simChitValue}
              onChange={(e) => setSimChitValue(Number(e.target.value))}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-medium mb-1">Bid Discount (₹)</label>
            <input
              type="number"
              step="5000"
              value={simBidDiscount}
              onChange={(e) => setSimBidDiscount(Number(e.target.value))}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-rose-700"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-medium mb-1">Subscribers / Seats</label>
            <input
              type="number"
              min="5"
              max="50"
              value={simNumMembers}
              onChange={(e) => setSimNumMembers(Number(e.target.value))}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-medium mb-1">Foreman Commission (%)</label>
            <input
              type="number"
              step="0.5"
              min="1"
              max="10"
              value={simCommissionPercent}
              onChange={(e) => setSimCommissionPercent(Number(e.target.value))}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
            />
          </div>
        </div>

        {/* Calculated Results Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-amber-50/60 p-4 rounded-xl border border-amber-200/80 text-xs font-mono">
          <div>
            <span className="text-slate-500 text-[10px] block font-sans">Prize Disbursed</span>
            <span className="font-bold text-slate-900 text-sm">₹{simPrizeAmount.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block font-sans">Foreman Comm (5%)</span>
            <span className="font-bold text-slate-900 text-sm">₹{simForemanCommission.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block font-sans">Total Dividend Pool</span>
            <span className="font-bold text-emerald-800 text-sm">₹{simDistributableDividend.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-emerald-700 text-[10px] block font-sans font-bold">Dividend / Member</span>
            <span className="font-bold text-emerald-900 text-base">₹{simDividendPerMember.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-slate-700 text-[10px] block font-sans font-bold">Next Month Net Due</span>
            <span className="font-bold text-amber-900 text-base">₹{simNetInstallment.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Historical Dividend Ledger */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Distributed Dividends Ledger</h2>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Group:</span>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700"
            >
              <option value="all">All Groups</option>
              {groups.map((g) => (
                <option key={g.groupId} value={g.groupId}>
                  {g.groupName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Chit Group</th>
                <th className="py-3 px-4">Auction #</th>
                <th className="py-3 px-4 text-right">Chit Value</th>
                <th className="py-3 px-4 text-right">Bid Discount</th>
                <th className="py-3 px-4 text-right">Foreman Comm.</th>
                <th className="py-3 px-4 text-right">Distributed Dividend</th>
                <th className="py-3 px-4 text-center">Subscribers</th>
                <th className="py-3 px-4 text-right">Dividend / Ticket</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400 font-sans">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
                    Loading dividend records...
                  </td>
                </tr>
              ) : dividends.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400 font-sans">
                    No dividends recorded yet. Conduct an auction to generate dividend distributions.
                  </td>
                </tr>
              ) : (
                dividends.map((d) => (
                  <tr key={d.dividendId} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-sans font-bold text-slate-900">
                      {d.groupName || d.groupId}
                    </td>
                    <td className="py-3 px-4 font-bold text-amber-900">
                      Month #{d.monthNumber}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      ₹{(d as any).chitValue ? (d as any).chitValue.toLocaleString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-700 font-medium">
                      ₹{(d.totalDiscount || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      ₹{(d.foremanCommission || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹{(d.distributableDividend || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-700 font-sans">
                      {d.numEligibleMembers} Members
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700 text-sm">
                      ₹{(d.dividendPerMember || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(d)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 rounded border border-slate-200"
                          title="Edit Dividend Record"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDividend(d.dividendId)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 rounded border border-slate-200"
                          title="Delete Dividend Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT DIVIDEND MODAL */}
      {showModal && editingDividend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                Edit Dividend Distribution ({editingDividend.groupName} Month #{editingDividend.monthNumber})
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDividend} className="p-5 space-y-4 text-xs">
              {modalError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-medium mb-1">Total Bid Discount (₹)</label>
                <input
                  type="number"
                  required
                  value={totalDiscount}
                  onChange={(e) => setTotalDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Foreman Commission (₹)</label>
                <input
                  type="number"
                  required
                  value={foremanCommission}
                  onChange={(e) => setForemanCommission(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Distributable Dividend Pool (₹)</label>
                <input
                  type="number"
                  required
                  value={distributableDividend}
                  onChange={(e) => setDistributableDividend(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-emerald-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Dividend Per Ticket / Member (₹)</label>
                <input
                  type="number"
                  required
                  value={dividendPerMember}
                  onChange={(e) => setDividendPerMember(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-emerald-700"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Dividend Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
